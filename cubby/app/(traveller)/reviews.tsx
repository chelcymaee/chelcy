import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, FlatList,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { Radius, CardShadow, Spacing } from '../../src/constants/theme';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';
import { Stars } from '../../src/components/Stars';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReceivedReview {
  id: string;
  booking_id: string;
  host_name: string;
  rating_respectful: number;
  rating_on_time: number;
  rating_communication: number;
  comment: string | null;
  created_at: string;
}

interface WrittenReview {
  id: string;
  booking_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
  host_display_name: string;
}

interface PendingBooking {
  id: string;
  host_id: string;
  host_display_name: string;
  drop_off_date: string;
}

interface Summary {
  total: number;
  overall: number;
  avgResp: number;
  avgOnTime: number;
  avgComm: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const RATING_LABELS = ['', 'Poor', 'Not great', 'Okay', 'Good', 'Excellent'];

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

function avg1(vals: number[]) {
  if (!vals.length) return 0;
  return Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10;
}

// ── Summary card ──────────────────────────────────────────────────────────────

function SummaryCard({ s }: { s: Summary }) {
  if (s.total === 0) return null;
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryHero}>
        <Text style={styles.summaryScore}>{s.overall.toFixed(1)}</Text>
        <View>
          <Stars value={Math.round(s.overall)} size={20} />
          <Text style={styles.summaryCount}>Based on {s.total} review{s.total !== 1 ? 's' : ''}</Text>
        </View>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryCategories}>
        {[
          { label: 'Respectful', val: s.avgResp },
          { label: 'On time', val: s.avgOnTime },
          { label: 'Communication', val: s.avgComm },
        ].map(c => (
          <View key={c.label} style={styles.summaryCat}>
            <Text style={styles.summaryCatLabel}>{c.label}</Text>
            <Text style={styles.summaryCatVal}>{c.val.toFixed(1)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Review cards ──────────────────────────────────────────────────────────────

function ReceivedCard({ item }: { item: ReceivedReview }) {
  const avg = avg1([item.rating_respectful, item.rating_on_time, item.rating_communication]);
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.75}
      onPress={() => router.push({ pathname: '/(traveller)/review-detail', params: { bookingId: item.booking_id } } as any)}
      // @ts-ignore
      onClick={() => router.push({ pathname: '/(traveller)/review-detail', params: { bookingId: item.booking_id } } as any)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardAvatar}>
          <Text style={styles.cardAvatarText}>{item.host_name?.[0]?.toUpperCase() ?? '?'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName}>{item.host_name}</Text>
          <Text style={styles.cardDate}>{fmt(item.created_at)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 3 }}>
          <Stars value={Math.round(avg)} size={14} />
          <Text style={styles.cardAvgLabel}>{avg.toFixed(1)} avg</Text>
        </View>
      </View>

      <View style={styles.catRow}>
        {[
          { label: 'Respectful', val: item.rating_respectful },
          { label: 'On time', val: item.rating_on_time },
          { label: 'Communication', val: item.rating_communication },
        ].map(c => (
          <View key={c.label} style={styles.catChip}>
            <Text style={styles.catChipLabel}>{c.label}</Text>
            <Text style={styles.catChipVal}>{'★'.repeat(c.val)}</Text>
          </View>
        ))}
      </View>

      {!!item.comment && (
        <Text style={styles.cardComment} numberOfLines={2}>"{item.comment}"</Text>
      )}

      <Text style={styles.cardCta}>View full review →</Text>
    </TouchableOpacity>
  );
}

function WrittenCard({ item }: { item: WrittenReview }) {
  function go() {
    if (item.booking_id) {
      router.push({ pathname: '/(host)/review-detail', params: { bookingId: item.booking_id } } as any);
    }
  }
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.75} onPress={go}
      // @ts-ignore
      onClick={go}>
      <View style={styles.cardHeader}>
        <View style={styles.cardAvatar}>
          <Text style={styles.cardAvatarText}>{item.host_display_name?.[0]?.toUpperCase() ?? '?'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName}>{item.host_display_name}</Text>
          <Text style={styles.cardDate}>{fmt(item.created_at)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 3 }}>
          <Stars value={item.rating} size={14} />
          <Text style={styles.cardAvgLabel}>{item.rating}/5</Text>
        </View>
      </View>
      {!!item.comment && (
        <Text style={styles.cardComment} numberOfLines={2}>"{item.comment}"</Text>
      )}
      {item.booking_id && <Text style={styles.cardCta}>View →</Text>}
    </TouchableOpacity>
  );
}

function PendingCard({ item }: { item: PendingBooking }) {
  function go() {
    router.push({
      pathname: '/(traveller)/review',
      params: { bookingId: item.id, hostId: item.host_id, hostName: item.host_display_name },
    } as any);
  }
  return (
    <View style={styles.pendingCard}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardAvatar, { backgroundColor: Colors.warningBg }]}>
          <Text style={[styles.cardAvatarText, { color: Colors.warningText }]}>
            {item.host_display_name?.[0]?.toUpperCase() ?? '?'}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName}>{item.host_display_name}</Text>
          <Text style={styles.cardDate}>Completed {fmt(item.drop_off_date)}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.pendingCta} onPress={go}
        // @ts-ignore
        onClick={go}>
        <Text style={styles.pendingCtaText}>✏️ Leave a review</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Empty states ──────────────────────────────────────────────────────────────

function Empty({ emoji, title, sub }: { emoji: string; title: string; sub: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>{emoji}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySub}>{sub}</Text>
    </View>
  );
}

// ── Tab bar ───────────────────────────────────────────────────────────────────

type Tab = 'received' | 'written' | 'pending';

function TabBar({ active, onSelect, pendingCount }: { active: Tab; onSelect: (t: Tab) => void; pendingCount: number }) {
  const tabs: { key: Tab; label: string }[] = [
    { key: 'received', label: 'About me' },
    { key: 'written', label: 'I wrote' },
    { key: 'pending', label: `Pending${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
  ];
  return (
    <View style={styles.tabBar}>
      {tabs.map(t => (
        <TouchableOpacity
          key={t.key}
          style={[styles.tab, active === t.key && styles.tabActive]}
          onPress={() => onSelect(t.key)}
          // @ts-ignore
          onClick={() => onSelect(t.key)}
        >
          <Text style={[styles.tabText, active === t.key && styles.tabTextActive]}>{t.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function TravellerReviews() {
  const [activeTab, setActiveTab] = useState<Tab>('received');
  const [loading, setLoading] = useState(true);
  const [received, setReceived] = useState<ReceivedReview[]>([]);
  const [written, setWritten] = useState<WrittenReview[]>([]);
  const [pending, setPending] = useState<PendingBooking[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, overall: 0, avgResp: 0, avgOnTime: 0, avgComm: 0 });

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    setLoading(true);
    if (!isSupabaseConfigured) { setLoading(false); return; }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [receivedRes, writtenRes, bookingsRes, reviewedRes] = await Promise.all([
        supabase
          .from('traveller_reviews')
          .select('id, booking_id, host_name, rating_respectful, rating_on_time, rating_communication, comment, created_at')
          .eq('traveller_id', user.id)
          .order('created_at', { ascending: false }),

        supabase
          .from('reviews')
          .select('id, booking_id, rating, comment, created_at, hosts(display_name)')
          .eq('reviewer_id', user.id)
          .order('created_at', { ascending: false }),

        supabase
          .from('bookings')
          .select('id, host_id, drop_off_date, hosts(display_name)')
          .eq('traveller_id', user.id)
          .eq('status', 'completed'),

        supabase
          .from('reviews')
          .select('booking_id')
          .eq('reviewer_id', user.id),
      ]);

      const recvData = (receivedRes.data ?? []) as ReceivedReview[];
      setReceived(recvData);

      const writtenData: WrittenReview[] = (writtenRes.data ?? []).map((r: any) => ({
        id: r.id,
        booking_id: r.booking_id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
        host_display_name: r.hosts?.display_name ?? 'Host',
      }));
      setWritten(writtenData);

      const reviewedIds = new Set((reviewedRes.data ?? []).map((r: any) => r.booking_id));
      const pendingData: PendingBooking[] = (bookingsRes.data ?? [])
        .filter((b: any) => !reviewedIds.has(b.id))
        .map((b: any) => ({
          id: b.id,
          host_id: b.host_id,
          host_display_name: b.hosts?.display_name ?? 'Host',
          drop_off_date: b.drop_off_date,
        }));
      setPending(pendingData);

      // Compute summary
      if (recvData.length > 0) {
        const avgResp = avg1(recvData.map(r => r.rating_respectful));
        const avgOnTime = avg1(recvData.map(r => r.rating_on_time));
        const avgComm = avg1(recvData.map(r => r.rating_communication));
        const overall = avg1([avgResp, avgOnTime, avgComm]);
        setSummary({ total: recvData.length, overall, avgResp, avgOnTime, avgComm });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}
          // @ts-ignore
          onClick={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>My Reviews</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.primary} size="large" /></View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
          {/* Summary */}
          <View style={{ paddingHorizontal: Spacing.xl, paddingTop: 8 }}>
            <SummaryCard s={summary} />
          </View>

          {/* Tabs */}
          <View style={{ paddingHorizontal: Spacing.xl, paddingTop: summary.total > 0 ? 0 : 8 }}>
            <TabBar active={activeTab} onSelect={setActiveTab} pendingCount={pending.length} />
          </View>

          {/* Content */}
          <View style={{ paddingHorizontal: Spacing.xl, paddingTop: 12 }}>
            {activeTab === 'received' && (
              received.length === 0
                ? <Empty emoji="⭐" title="No reviews yet" sub="Complete your first booking to start building your traveller reputation." />
                : received.map(item => <ReceivedCard key={item.id} item={item} />)
            )}
            {activeTab === 'written' && (
              written.length === 0
                ? <Empty emoji="✍️" title="No reviews written yet" sub="When you leave reviews for hosts, they'll appear here." />
                : written.map(item => <WrittenCard key={item.id} item={item} />)
            )}
            {activeTab === 'pending' && (
              pending.length === 0
                ? <Empty emoji="✅" title="All caught up" sub="You've reviewed all your completed bookings. Nice!" />
                : pending.map(item => <PendingCard key={item.id} item={item} />)
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: Spacing.xl, paddingTop: 8, paddingBottom: 12 },
  back: { fontSize: 15, color: Colors.primary, fontWeight: '600', marginBottom: 10 },
  heading: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary },

  // Summary
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 20,
    marginBottom: 16,
    ...CardShadow,
  },
  summaryHero: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  summaryScore: { fontSize: 48, fontWeight: '900', color: Colors.textPrimary, lineHeight: 52 },
  summaryCount: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  summaryDivider: { height: 1, backgroundColor: Colors.border, marginBottom: 14 },
  summaryCategories: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryCat: { alignItems: 'center', flex: 1 },
  summaryCatLabel: { fontSize: 11, color: Colors.textSecondary, marginBottom: 3, textAlign: 'center' },
  summaryCatVal: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.offWhite,
    borderRadius: Radius.sm,
    padding: 3,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: Radius.xs,
  },
  tabActive: { backgroundColor: Colors.white, ...CardShadow },
  tabText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: Colors.textPrimary, fontWeight: '700' },

  // Cards
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 16,
    marginBottom: 12,
    ...CardShadow,
  },
  pendingCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: Colors.warningBg,
    ...CardShadow,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  cardAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center', justifyContent: 'center',
  },
  cardAvatarText: { fontSize: 17, fontWeight: '700', color: Colors.primary },
  cardName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  cardDate: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  cardAvgLabel: { fontSize: 11, color: Colors.textSecondary },
  catRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 10 },
  catChip: {
    backgroundColor: Colors.offWhite,
    borderRadius: Radius.xs,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catChipLabel: { fontSize: 10, color: Colors.textSecondary, marginBottom: 1 },
  catChipVal: { fontSize: 10, color: Colors.star },
  cardComment: { fontSize: 14, color: Colors.textSecondary, fontStyle: 'italic', lineHeight: 20, marginBottom: 8 },
  cardCta: { fontSize: 13, fontWeight: '600', color: Colors.primary },

  pendingCta: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  pendingCtaText: { fontSize: 14, fontWeight: '700', color: Colors.white },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 56, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 48, marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8, textAlign: 'center' },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 21 },
});
