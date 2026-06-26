import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';
import NotificationBell from '../../src/components/NotificationBell';

interface Convo {
  id: string;
  travellerName: string;
  lastMessage: string;
  lastMessageAt: string;
  unread: number;
}

export default function HostMessages() {
  const [convos, setConvos] = useState<Convo[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => { loadConvos(); }, []));

  async function loadConvos() {
    setLoading(true);
    if (!isSupabaseConfigured) { setLoading(false); return; }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: hostRow } = await supabase
        .from('hosts')
        .select('id')
        .eq('assigned_user_id', user.id)
        .single();

      if (!hostRow) { setLoading(false); return; }

      // Fetch conversations for this host
      const { data: convData, error: convErr } = await supabase
        .from('conversations')
        .select('id, traveller_id, last_message_at')
        .eq('host_id', hostRow.id)
        .order('last_message_at', { ascending: false });

      if (convErr || !convData || convData.length === 0) { setLoading(false); return; }

      const convIds = convData.map((c: any) => c.id);
      const travellerIds = [...new Set(convData.map((c: any) => c.traveller_id))];

      // Fetch traveller names separately
      let profileMap: Record<string, string> = {};
      if (travellerIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', travellerIds);
        for (const p of profs ?? []) {
          profileMap[p.id] = p.full_name?.trim() || p.email?.split('@')[0] || 'Traveller';
        }
      }

      // Fetch last message per conversation
      let lastMsgMap: Record<string, string> = {};
      let unreadMap: Record<string, number> = {};
      if (convIds.length > 0) {
        const { data: msgs } = await supabase
          .from('messages')
          .select('conversation_id, body, sender_id, read_at, created_at')
          .in('conversation_id', convIds)
          .order('created_at', { ascending: false });

        for (const m of msgs ?? []) {
          if (!lastMsgMap[m.conversation_id]) lastMsgMap[m.conversation_id] = m.body;
          if (!m.read_at && m.sender_id !== user.id) {
            unreadMap[m.conversation_id] = (unreadMap[m.conversation_id] ?? 0) + 1;
          }
        }
      }

      setConvos(convData.map((c: any) => ({
        id: c.id,
        travellerName: profileMap[c.traveller_id] ?? 'Traveller',
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
      ) : (
        <FlatList
          data={convos}
          keyExtractor={item => item.id}
          contentContainerStyle={{ flexGrow: 1 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.convo}
              onPress={() => router.push({ pathname: '/(host)/chat', params: { conversationId: item.id, travellerName: item.travellerName } })}
              // @ts-ignore
              onClick={() => router.push({ pathname: '/(host)/chat', params: { conversationId: item.id, travellerName: item.travellerName } })}
            >
              <View style={styles.avatar}>
                <Text style={{ fontSize: 22 }}>🎒</Text>
              </View>
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
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
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
