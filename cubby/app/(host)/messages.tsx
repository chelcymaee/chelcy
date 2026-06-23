import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';

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

      // Find the host record for this user
      const { data: hostRow } = await supabase
        .from('hosts')
        .select('id')
        .eq('assigned_user_id', user.id)
        .single();

      if (!hostRow) { setLoading(false); return; }

      const { data } = await supabase
        .from('conversations')
        .select(`
          id, last_message_at,
          travellers:traveller_id ( display_name ),
          messages ( id, sender_id, read_at )
        `)
        .eq('host_id', hostRow.id)
        .order('last_message_at', { ascending: false });

      if (!data) { setLoading(false); return; }

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

      setConvos(data.map((c: any) => ({
        id: c.id,
        travellerName: c.travellers?.display_name ?? 'Traveller',
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
