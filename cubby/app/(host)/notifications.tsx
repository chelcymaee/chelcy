import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, SectionList,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
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
  related_booking_id: string | null;
  related_message_id: string | null;
}

interface Section { title: string; data: Notif[] }

const TYPE_CONFIG: Record<string, { icon: string; accent: string }> = {
  new_message:           { icon: '💬', accent: '#3B82F6' },
  booking_submitted:     { icon: '🔴', accent: Colors.primary },
  booking_confirmed:     { icon: '✅', accent: '#10B981' },
  booking_declined:      { icon: '❌', accent: '#EF4444' },
  booking_cancelled:     { icon: '🚫', accent: '#6B7280' },
  booking_completed:     { icon: '🎉', accent: '#8B5CF6' },
  payment_successful:    { icon: '💰', accent: '#10B981' },
  payment_failed:        { icon: '💸', accent: '#EF4444' },
  drop_off_reminder:     { icon: '⏰', accent: '#F59E0B' },
  pick_up_reminder:      { icon: '🎒', accent: '#F59E0B' },
  booking_starting_soon: { icon: '⏰', accent: '#F59E0B' },
  booking_ending_soon:   { icon: '⏳', accent: '#F59E0B' },
  verification_submitted:{ icon: '🛡️', accent: '#F59E0B' },
  verification_approved: { icon: '🛡️', accent: '#10B981' },
  verification_rejected: { icon: '🛡️', accent: '#EF4444' },
  partner_received:      { icon: '🤝', accent: '#F59E0B' },
  partner_approved:      { icon: '🤝', accent: '#10B981' },
  partner_rejected:      { icon: '🤝', accent: '#EF4444' },
  review_request:        { icon: '⭐', accent: '#FFD93D' },
  review_received:       { icon: '🌟', accent: '#FFD93D' },
  review_reminder:       { icon: '⭐', accent: '#FFD93D' },
  milestone_reached:     { icon: '🏆', accent: '#F59E0B' },
};

function getConfig(type: string) {
  return TYPE_CONFIG[type] ?? { icon: '🔔', accent: Colors.textSecondary };
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
}

function groupByTime(notifs: Notif[]): Section[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;
  const today: Notif[] = [], yesterday: Notif[] = [], earlier: Notif[] = [];
  for (const n of notifs) {
    const t = new Date(n.created_at).getTime();
    if (t >= todayStart) today.push(n);
    else if (t >= yesterdayStart) yesterday.push(n);
    else earlier.push(n);
  }
  const sections: Section[] = [];
  if (today.length) sections.push({ title: 'Today', data: today });
  if (yesterday.length) sections.push({ title: 'Yesterday', data: yesterday });
  if (earlier.length) sections.push({ title: 'Earlier', data: earlier });
  return sections;
}

function navigate(n: Notif) {
  if (n.type === 'new_message' && n.data?.conversation_id) {
    router.push({ pathname: '/(host)/chat', params: { conversationId: n.data.conversation_id } } as any);
  } else if (n.type?.startsWith('booking') || n.type?.startsWith('payment') || n.type?.includes('reminder')) {
    router.push('/(host)/requests');
  } else if (n.type?.startsWith('verification')) {
    router.push('/(traveller)/verification');
  } else if (n.type?.startsWith('partner')) {
    router.push('/(host)/dashboard');
  } else if (n.type === 'review_received') {
    // Deep-link to review detail; fall back to requests if no bookingId
    const bookingId = n.data?.bookingId ?? n.related_booking_id;
    if (bookingId) {
      router.push({ pathname: '/(host)/review-detail', params: { bookingId } } as any);
    } else {
      router.push('/(host)/requests');
    }
  } else if (n.type === 'review_request') {
    // Prompt host to review the traveller — deep-link to review form
    const bookingId = n.data?.bookingId ?? n.related_booking_id;
    const travellerId = n.data?.travellerId;
    const travellerName = n.data?.travellerName;
    if (bookingId && travellerId) {
      router.push({ pathname: '/(host)/review-traveller', params: { bookingId, travellerId, travellerName: travellerName ?? 'Traveller' } } as any);
    } else {
      router.push('/(host)/requests');
    }
  } else if (n.type === 'milestone_reached') {
    router.push('/(host)/dashboard');
  }
}

function NotifRow({ item, onRead }: { item: Notif; onRead: (id: string) => void }) {
  const { icon, accent } = getConfig(item.type);
  const unread = !item.read_at;

  async function handlePress() {
    if (unread) {
      onRead(item.id);
      await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', item.id);
    }
    navigate(item);
  }

  return (
    <TouchableOpacity
      style={[styles.row, unread && styles.rowUnread]}
      onPress={handlePress}
      // @ts-ignore
      onClick={handlePress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconPill, { backgroundColor: accent + '18' }]}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={[styles.rowTitle, unread && styles.rowTitleUnread]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.rowTime}>{timeAgo(item.created_at)}</Text>
        </View>
        <Text style={styles.rowBody} numberOfLines={2}>{item.body}</Text>
      </View>
      {unread && <View style={[styles.dot, { backgroundColor: accent }]} />}
    </TouchableOpacity>
  );
}

export default function HostNotifications() {
  const [sections, setSections] = useState<Section[]>([]);
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
        .select('id, type, title, body, data, read_at, created_at, related_booking_id, related_message_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);
      setSections(groupByTime(data ?? []));
    } finally {
      setLoading(false);
    }
  }

  function markRead(id: string) {
    setSections(prev => prev.map(s => ({
      ...s,
      data: s.data.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n),
    })).filter(s => s.data.length > 0));
  }

  async function markAllRead() {
    if (!isSupabaseConfigured) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('notifications').update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id).is('read_at', null);
    setSections(prev => prev.map(s => ({
      ...s,
      data: s.data.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })),
    })));
  }

  const hasUnread = sections.some(s => s.data.some(n => !n.read_at));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.replace('/(host)/dashboard')}
          // @ts-ignore
          onClick={() => router.replace('/(host)/dashboard')}
        >
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <Text style={styles.heading}>Notifications</Text>
          {hasUnread && (
            <TouchableOpacity onPress={markAllRead}
              // @ts-ignore
              onClick={markAllRead}>
              <Text style={styles.markAll}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🔔</Text>
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptyText}>Booking requests, messages and updates will appear here.</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          stickySectionHeadersEnabled
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => <NotifRow item={item} onRead={markRead} />}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  back: { fontSize: 15, color: Colors.primary, fontWeight: '600', marginBottom: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary },
  markAll: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  sectionHeader: {
    backgroundColor: Colors.background,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 6,
  },
  sectionHeaderText: {
    fontSize: 13, fontWeight: '700', color: Colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  rowUnread: { backgroundColor: '#FFF8F8' },
  iconPill: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  iconText: { fontSize: 22 },
  rowContent: { flex: 1, gap: 3 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  rowTitleUnread: { fontWeight: '700' },
  rowBody: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  rowTime: { fontSize: 11, color: Colors.textLight, flexShrink: 0 },
  dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  emptyText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});
