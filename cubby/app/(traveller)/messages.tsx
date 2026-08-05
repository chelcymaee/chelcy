import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity } from 'react-native';
import { MessageRowSkeleton } from '../../src/components/Skeleton';
import { router, useFocusEffect } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';
import Avatar from '../../src/components/Avatar';

interface Convo {
  id: string;
  bookingId: string;
  hostName: string;
  hostAvatarUrl: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unread: number;
}

export default function Messages() {
  const [convos, setConvos] = useState<Convo[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => { loadConvos(); }, []));

  async function loadConvos() {
    setLoading(true);
    if (!isSupabaseConfigured) { setLoading(false); return; }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from('conversations')
        .select(`
          id, booking_id, last_message_at,
          hosts:host_id ( display_name, user_id ),
          messages ( id, sender_id, read_at )
        `)
        .eq('traveller_id', user.id)
        .order('last_message_at', { ascending: false });

      if (!data) { setLoading(false); return; }

      // Fetch last message text for each conversation
      const convIds = data.map((c: any) => c.id);
      let lastMsgMap: Record<string, string> = {};
      if (convIds.length > 0) {
        const { data: lastMsgs } = await supabase
          .from('messages')
          .select('conversation_id, body, created_at')
          .in('conversation_id', convIds)
          .order('created_at', { ascending: false });

        for (const m of lastMsgs ?? []) {
          if (!lastMsgMap[m.conversation_id]) lastMsgMap[m.conversation_id] = m.body;
        }
      }

      // Fetch the host's personal avatar (profiles.avatar_url, via the
      // host's user_id — this is the person you're chatting with, not the
      // hosts.photos[] business-listing imagery used on host-detail.tsx).
      const hostUserIds = [...new Set(data.map((c: any) => c.hosts?.user_id).filter(Boolean))];
      let hostAvatarMap: Record<string, string | null> = {};
      if (hostUserIds.length > 0) {
        const { data: hostProfiles } = await supabase
          .from('profiles')
          .select('id, avatar_url')
          .in('id', hostUserIds);
        for (const p of hostProfiles ?? []) {
          hostAvatarMap[p.id] = p.avatar_url ?? null;
        }
      }

      setConvos(data.map((c: any) => ({
        id: c.id,
        bookingId: c.booking_id,
        hostName: c.hosts?.display_name ?? 'Host',
        hostAvatarUrl: c.hosts?.user_id ? (hostAvatarMap[c.hosts.user_id] ?? null) : null,
        lastMessage: lastMsgMap[c.id] ?? 'No messages yet',
        lastMessageAt: c.last_message_at
          ? new Date(c.last_message_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
          : '',
        unread: (c.messages ?? []).filter((m: any) => !m.read_at && m.sender_id !== user.id).length,
      })));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Messages</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1 }}>
          {[1, 2, 3, 4, 5].map(i => <MessageRowSkeleton key={i} />)}
        </View>
      ) : (
        <FlatList
          data={convos}
          keyExtractor={item => item.id}
          contentContainerStyle={{ flexGrow: 1 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.convo}
              onPress={() => router.push({ pathname: '/(traveller)/chat', params: { conversationId: item.id, hostName: item.hostName } })}
              // @ts-ignore
              onClick={() => router.push({ pathname: '/(traveller)/chat', params: { conversationId: item.id, hostName: item.hostName } })}
            >
              <Avatar uri={item.hostAvatarUrl} size={50} fallbackEmoji="🏠" />
              <View style={{ flex: 1 }}>
                <Text style={styles.hostName}>{item.hostName}</Text>
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
              <Text style={styles.emptyText}>When you book with a host, tap "Message host" to start a conversation.</Text>
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
  hostName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  lastMsg: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  timestamp: { fontSize: 12, color: Colors.textLight },
  unreadBadge: { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  unreadText: { fontSize: 11, fontWeight: '700', color: Colors.white },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, paddingTop: 100 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  emptyText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});
