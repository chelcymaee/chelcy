import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';

interface Notif {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, any>;
  read_at: string | null;
  created_at: string;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const TYPE_ICON: Record<string, string> = {
  new_message: '💬',
  booking_confirmed: '✅',
  booking_declined: '❌',
  booking_cancelled: '🚫',
  booking_completed: '🎉',
  review_request: '⭐',
  default: '🔔',
};

export default function Notifications() {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    setLoading(true);
    if (!isSupabaseConfigured) { setLoading(false); return; }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from('notifications')
        .select('id, type, title, body, data, read_at, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      setNotifs(data ?? []);

      // Mark all unread as read
      const unreadIds = (data ?? []).filter(n => !n.read_at).map(n => n.id);
      if (unreadIds.length > 0) {
        await supabase
          .from('notifications')
          .update({ read_at: new Date().toISOString() })
          .in('id', unreadIds);
      }
    } finally {
      setLoading(false);
    }
  }

  function handlePress(n: Notif) {
    if (n.type === 'new_message' && n.data?.conversation_id) {
      router.push({ pathname: '/(traveller)/chat', params: { conversationId: n.data.conversation_id } });
    } else if (n.type?.startsWith('booking')) {
      router.push('/(traveller)/bookings');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.replace('/(traveller)/profile')}
          // @ts-ignore
          onClick={() => router.replace('/(traveller)/profile')}
        >
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>Notifications</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notifs}
          keyExtractor={item => item.id}
          contentContainerStyle={{ flexGrow: 1 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.item, !item.read_at && styles.itemUnread]}
              onPress={() => handlePress(item)}
              // @ts-ignore
              onClick={() => handlePress(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.icon}>{TYPE_ICON[item.type] ?? TYPE_ICON.default}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
                <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
              </View>
              {!item.read_at && <View style={styles.dot} />}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🔔</Text>
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptyText}>When you receive messages or booking updates, they'll appear here.</Text>
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
  back: { fontSize: 16, color: Colors.primary, fontWeight: '600', marginBottom: 12 },
  heading: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary },
  item: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    padding: 16, backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  itemUnread: { backgroundColor: '#FFF5F5' },
  icon: { fontSize: 24, marginTop: 2 },
  title: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  body: { fontSize: 14, color: Colors.textSecondary, marginTop: 2, lineHeight: 20 },
  time: { fontSize: 12, color: Colors.textLight, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginTop: 6 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, paddingTop: 100 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  emptyText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});
