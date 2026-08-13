import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';
import NotificationBell from '../../src/components/NotificationBell';
import Avatar from '../../src/components/Avatar';
import { useSelectedHost } from '../../src/lib/host-context';

interface Convo {
  id: string;
  travellerId: string;
  bookingId?: string;
  travellerName: string;
  travellerAvatarUrl: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unread: number;
}

export default function HostMessages() {
  const { selectedHostId, loading: hostContextLoading } = useSelectedHost();
  const [convos, setConvos] = useState<Convo[]>([]);
  const [loading, setLoading] = useState(true);
  // True only when a conversations/messages query itself failed — kept
  // separate from convos.length === 0 so a genuine failure shows a retry
  // state instead of looking identical to an empty inbox.
  const [loadError, setLoadError] = useState(false);

  useFocusEffect(useCallback(() => {
    loadConvos();
    // Re-runs on focus AND whenever selectedHostId/hostContextLoading
    // change while this screen stays focused, same reasoning as Dashboard.
  }, [selectedHostId, hostContextLoading]));

  async function loadConvos() {
    // HostProvider itself still resolving — wait rather than briefly
    // treating "not loaded yet" as "no listing".
    if (hostContextLoading) return;

    // Clear all previous listing's state up front, before any fetch
    // starts, so switching listings can never show Listing A's
    // conversations under Listing B's context while the new data loads.
    setLoading(true);
    setLoadError(false);
    setConvos([]);
    if (!isSupabaseConfigured) { setLoading(false); return; }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      if (!selectedHostId) {
        // No hosts row owned by this account at all — legitimate empty
        // state, not a query failure.
        setLoading(false);
        return;
      }

      // Fetch conversations for the selected listing. selectedHostId
      // already comes from HostProvider's verified owned-listings
      // resolution — no separate ambiguous
      // .eq('assigned_user_id', user.id).single() lookup needed here
      // anymore (that could legitimately match more than one row for a
      // multi-listing account).
      const { data: convData, error: convErr } = await supabase
        .from('conversations')
        .select('id, traveller_id, last_message_at')
        .eq('host_id', selectedHostId)
        .order('last_message_at', { ascending: false });

      if (convErr) {
        // A genuine query failure — never render as an empty inbox.
        console.error('[messages] conversations query failed:', convErr);
        setLoadError(true);
        setLoading(false);
        return;
      }
      if (!convData || convData.length === 0) {
        // Legitimate empty state — no error, just no conversations yet.
        setLoading(false);
        return;
      }

      const convIds = convData.map((c: any) => c.id);
      const travellerIds = [...new Set(convData.map((c: any) => c.traveller_id))];

      // Fetch traveller names + avatars separately
      let profileMap: Record<string, string> = {};
      let avatarMap: Record<string, string | null> = {};
      if (travellerIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', travellerIds);
        for (const p of profs ?? []) {
          profileMap[p.id] = p.full_name?.trim() || p.email?.split('@')[0] || 'Traveller';
          avatarMap[p.id] = p.avatar_url ?? null;
        }
      }

      // Fetch last message per conversation + bookings for profile links
      let lastMsgMap: Record<string, string> = {};
      let unreadMap: Record<string, number> = {};
      let bookingMap: Record<string, string> = {}; // traveller_id -> booking_id

      const [msgsResult, bookingsResult] = await Promise.all([
        convIds.length > 0
          ? supabase
              .from('messages')
              .select('conversation_id, body, sender_id, read_at, created_at')
              .in('conversation_id', convIds)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [] }),
        supabase
          .from('bookings')
          .select('id, traveller_id')
          .eq('host_id', selectedHostId)
          .order('created_at', { ascending: false }),
      ]);

      for (const m of msgsResult.data ?? []) {
        if (!lastMsgMap[m.conversation_id]) lastMsgMap[m.conversation_id] = m.body;
        if (!m.read_at && m.sender_id !== user.id) {
          unreadMap[m.conversation_id] = (unreadMap[m.conversation_id] ?? 0) + 1;
        }
      }

      // Map traveller_id -> most recent booking_id
      for (const b of bookingsResult.data ?? []) {
        if (!bookingMap[b.traveller_id]) bookingMap[b.traveller_id] = b.id;
      }

      setConvos(convData.map((c: any) => ({
        id: c.id,
        travellerId: c.traveller_id,
        bookingId: bookingMap[c.traveller_id],
        travellerName: profileMap[c.traveller_id] ?? 'Traveller',
        travellerAvatarUrl: avatarMap[c.traveller_id] ?? null,
        lastMessage: lastMsgMap[c.id] ?? 'No messages yet',
        lastMessageAt: c.last_message_at
          ? new Date(c.last_message_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
          : '',
        unread: unreadMap[c.id] ?? 0,
      })));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
        <Text style={styles.heading}>Messages</Text>
        <NotificationBell variant="host" />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : loadError ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>⚠️</Text>
          <Text style={styles.emptyTitle}>Couldn't load messages</Text>
          <Text style={styles.emptyText}>Something went wrong loading your conversations. Please try again.</Text>
          <TouchableOpacity
            onPress={loadConvos}
            // @ts-ignore
            onClick={loadConvos}
            style={{ marginTop: 14, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, backgroundColor: Colors.primary }}
          >
            <Text style={{ color: Colors.white, fontWeight: '700' }}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={convos}
          keyExtractor={item => item.id}
          contentContainerStyle={{ flexGrow: 1 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.convo}
              onPress={() => router.push({ pathname: '/(host)/chat', params: { conversationId: item.id, travellerName: item.travellerName, travellerId: item.travellerId, bookingId: item.bookingId ?? '' } })}
              // @ts-ignore
              onClick={() => router.push({ pathname: '/(host)/chat', params: { conversationId: item.id, travellerName: item.travellerName, travellerId: item.travellerId, bookingId: item.bookingId ?? '' } })}
            >
              <TouchableOpacity
                onPress={() => item.travellerId && item.bookingId && router.push({ pathname: '/(host)/traveller-profile', params: { travellerId: item.travellerId, bookingId: item.bookingId, returnTo: 'messages' } })}
                // @ts-ignore
                onClick={(e: any) => { e.stopPropagation(); item.travellerId && item.bookingId && router.push({ pathname: '/(host)/traveller-profile', params: { travellerId: item.travellerId, bookingId: item.bookingId, returnTo: 'messages' } }); }}
              >
                <Avatar uri={item.travellerAvatarUrl} size={50} fallbackEmoji="🎒" />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.travellerName}>{item.travellerName}</Text>
                <Text style={styles.lastMsg} numberOfLines={1}>{item.lastMessage}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Text style={styles.timestamp}>{item.lastMessageAt}</Text>
                {item.unread > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{item.unread}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptyText}>When a traveller messages you about a booking, it will appear here.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: 20, paddingTop: 8 },
  heading: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary },
  convo: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  travellerName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  lastMsg: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  timestamp: { fontSize: 12, color: Colors.textLight },
  unreadBadge: { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  unreadText: { fontSize: 11, fontWeight: '700', color: Colors.white },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, paddingTop: 100 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  emptyText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});
