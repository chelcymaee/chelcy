import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { Radius, CardShadow, Spacing } from '../../src/constants/theme';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';
import { Stars } from '../../src/components/Stars';
import Avatar from '../../src/components/Avatar';
import { useSelectedHost } from '../../src/lib/host-context';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReceivedReview {
  id: string;
  booking_id: string;
  reviewer_id: string;
  reviewer_name: string;
  avatar_url: string | null;
  rating: number;
  comment: string | null;
  tags: string[];
  rating_friendliness: number | null;
  rating_location: number | null;
  rating_drop_off: number | null;
  rating_security: number | null;
  created_at: string;
}

interface WrittenReview {
  id: string;
  booking_id: string;
  traveller_display_name: string;
  avatar_url: string | null;
  rating_respectful: number;
  rating_on_time: number;
  rating_communication: number;
  comment: string | null;
  created_at: string;
}

interface PendingBooking {
  id: string;
  traveller_id: string;
  traveller_display_name: string;
  avatar_url: string | null;
  drop_off_date: string;
}

interface Summary {
  total: number;
  overall: number;
  avgFriendliness: number;
  avgLocation: number;
  avgDropOff: number;
  avgSecurity: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

function avg1(vals: number[]) {
  const filtered = vals.filter(v => v > 0);
  if (!filtered.length) return 0;
  return Math.round((filtered.reduce((s, v) => s + v, 0) / filtered.length) * 10) / 10;
}

// ── Summary card ──────────────────────────────────────────────────────────────

function SummaryCard({ s }: { s: Summary }) {
  if (s.total === 0) return null;
  const cats = [
    { label: 'Friendliness', val: s.avgFriendliness },
    { label: 'Location', val: s.avgLocation },
    { label: 'Drop-off', val: s.avgDropOff },
    { label: 'Security', val: s.avgSecurity },
  ].filter(c => c.val > 0);

  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryHero}>
        <Text style={styles.summaryScore}>{s.overall.toFixed(1)}</Text>
        <View>
          <Stars value={Math.round(s.overall)} size={20} />
          <Text style={styles.summaryCount}>Based on {s.total} review{s.total !== 1 ? 's' : ''}</Text>
        </View>
      </View>
      {cats.length > 0 && (
        <>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCategories}>
            {cats.map(c => (
              <View key={c.label} style={styles.summaryCat}>
                <Text style={styles.summaryCatLabel}>{c.label}</Text>
                <Text style={styles.summaryCatVal}>{c.val.toFixed(1)}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

// ── Review cards ──────────────────────────────────────────────────────────────

function ReceivedCard({ item }: { item: ReceivedReview }) {
  function go() {
    router.push({ pathname: '/(host)/review-detail', params: { bookingId: item.booking_id } } as any);
  }
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.75} onPress={go}
      // @ts-ignore
      onClick={go}>
      <View style={styles.cardHeader}>
        <Avatar
          uri={item.avatar_url}
          size={40}
          fallbackEmoji={item.reviewer_name?.[0]?.toUpperCase() ?? '?'}
          fallbackFontSize={17}
          backgroundColor={Colors.primary + '20'}
          fallbackTextStyle={{ fontWeight: '700', color: Colors.primary }}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName}>{item.reviewer_name}</Text>
          <Text style={styles.cardDate}>{fmt(item.created_at)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 3 }}>
          <Stars value={item.rating} size={14} />
          <Text style={styles.cardAvgLabel}>{item.rating}/5</Text>
        </View>
      </View>

      {item.tags?.length > 0 && (
        <View style={styles.tagsRow}>
          {item.tags.slice(0, 3).map(tag => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {!!item.comment && (
        <Text style={styles.cardComment} numberOfLines={2}>"{item.comment}"</Text>
      )}
      <Text style={styles.cardCta}>View full review →</Text>
    </TouchableOpacity>
  );
}

function WrittenCard({ item }: { item: WrittenReview }) {
  const avg = avg1([item.rating_respectful, item.rating_on_time, item.rating_communication]);
  function go() {
    router.push({ pathname: '/(traveller)/review-detail', params: { bookingId: item.booking_id } } as any);
  }
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.75} onPress={go}
      // @ts-ignore
      onClick={go}>
      <View style={styles.cardHeader}>
        <Avatar
          uri={item.avatar_url}
          size={40}
          fallbackEmoji={item.traveller_display_name?.[0]?.toUpperCase() ?? '?'}
          fallbackFontSize={17}
          backgroundColor={Colors.primary + '20'}
          fallbackTextStyle={{ fontWeight: '700', color: Colors.primary }}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName}>{item.traveller_display_name}</Text>
          <Text style={styles.cardDate}>{fmt(item.created_at)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 3 }}>
          <Stars value={Math.round(avg)} size={14} />
          <Text style={styles.cardAvgLabel}>{avg.toFixed(1)} avg</Text>
        </View>
      </View>
      {!!item.comment && (
        <Text style={styles.cardComment} numberOfLines={2}>"{item.comment}"</Text>
      )}
      <Text style={styles.cardCta}>View →</Text>
    </TouchableOpacity>
  );
}

function PendingCard({ item, onReview }: { item: PendingBooking; onReview: (item: PendingBooking) => void }) {
  return (
    <View style={styles.pendingCard}>
      <View style={styles.cardHeader}>
        <Avatar
          uri={item.avatar_url}
          size={40}
          fallbackEmoji={item.traveller_display_name?.[0]?.toUpperCase() ?? '?'}
          fallbackFontSize={17}
          backgroundColor={Colors.warningBg}
          fallbackTextStyle={{ fontWeight: '700', color: Colors.warningText }}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName}>{item.traveller_display_name}</Text>
          <Text style={styles.cardDate}>Completed {fmt(item.drop_off_date)}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.pendingCta} onPress={() => onReview(item)}
        // @ts-ignore
        onClick={() => onReview(item)}>
        <Text style={styles.pendingCtaText}>✏️ Review traveller</Text>
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

export default function HostReviews() {
  const { selectedHostId, loading: hostContextLoading } = useSelectedHost();
  const [activeTab, setActiveTab] = useState<Tab>('received');
  const [loading, setLoading] = useState(true);
  // True only when a query itself failed — kept separate from the
  // genuine "no reviews yet" / "all caught up" empty states so a failed
  // fetch never renders as if there's simply nothing there yet.
  const [loadError, setLoadError] = useState(false);
  const [received, setReceived] = useState<ReceivedReview[]>([]);
  const [written, setWritten] = useState<WrittenReview[]>([]);
  const [pending, setPending] = useState<PendingBooking[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, overall: 0, avgFriendliness: 0, avgLocation: 0, avgDropOff: 0, avgSecurity: 0 });

  useFocusEffect(useCallback(() => {
    load();
    // Re-runs on focus AND whenever selectedHostId/hostContextLoading
    // change while this screen stays focused, same reasoning as Requests.
  }, [selectedHostId, hostContextLoading]));

  async function load() {
    // HostProvider itself still resolving — wait rather than briefly
    // treating "not loaded yet" as "no listing".
    if (hostContextLoading) return;

    // Clear all previous listing's state up front, before any fetch
    // starts, so switching listings can never show Listing A's reviews
    // under Listing B's context while the new data loads.
    setLoading(true);
    setLoadError(false);
    setReceived([]);
    setPending([]);
    setSummary({ total: 0, overall: 0, avgFriendliness: 0, avgLocation: 0, avgDropOff: 0, avgSecurity: 0 });
    if (!isSupabaseConfigured) { setLoading(false); return; }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (!selectedHostId) {
        // No hosts row owned by this account at all — legitimate empty
        // state, not a query failure.
        return;
      }

      // selectedHostId already comes from HostProvider's verified
      // owned-listings resolution — no separate ambiguous
      // .eq('assigned_user_id', user.id).single() lookup needed here
      // anymore (that could legitimately match more than one row for a
      // multi-listing account, throw PGRST116, and silently look like
      // "no reviews yet").
      const [receivedRes, writtenRes, bookingsRes, reviewedRes, travellerProfilesRes] = await Promise.all([
        supabase
          .from('reviews')
          .select('id, booking_id, reviewer_id, reviewer_name, rating, comment, tags, rating_friendliness, rating_location, rating_drop_off, rating_security, created_at')
          .eq('host_id', selectedHostId)
          .order('created_at', { ascending: false }),

        // Reviews the host wrote about travellers — scoped to this
        // account (reviewer_id), not to a specific listing, since a
        // multi-listing host reviewing a traveller writes as themselves.
        supabase
          .from('traveller_reviews')
          .select('id, booking_id, traveller_id, rating_respectful, rating_on_time, rating_communication, comment, created_at')
          .eq('reviewer_id', user.id)
          .order('created_at', { ascending: false }),

        supabase
          .from('bookings')
          .select('id, traveller_id, drop_off_date')
          .eq('host_id', selectedHostId)
          .eq('status', 'completed'),

        supabase
          .from('traveller_reviews')
          .select('booking_id')
          .eq('reviewer_id', user.id),

        supabase
          .from('profiles')
          .select('id, full_name, avatar_url'),
      ]);

      if (receivedRes.error || writtenRes.error || bookingsRes.error || reviewedRes.error) {
        console.error('[reviews] query failed:', receivedRes.error || writtenRes.error || bookingsRes.error || reviewedRes.error);
        setLoadError(true);
        return;
      }

      // Build traveller name + avatar map (same booking-scoped access already
      // used to build names here — anyone in this map has a real booking or
      // review relationship with this host).
      const profileMap: Record<string, { name: string; avatarUrl: string | null }> = {};
      for (const p of (travellerProfilesRes.data ?? [])) {
        profileMap[p.id] = { name: p.full_name?.trim() || 'Traveller', avatarUrl: p.avatar_url ?? null };
      }

      const recvData: ReceivedReview[] = (receivedRes.data ?? []).map((r: any) => ({
        ...r,
        avatar_url: profileMap[r.reviewer_id]?.avatarUrl ?? null,
      }));
      setReceived(recvData);

      const writtenData: WrittenReview[] = (writtenRes.data ?? []).map((r: any) => ({
        id: r.id,
        booking_id: r.booking_id,
        traveller_display_name: profileMap[r.traveller_id]?.name ?? 'Traveller',
        avatar_url: profileMap[r.traveller_id]?.avatarUrl ?? null,
        rating_respectful: r.rating_respectful,
        rating_on_time: r.rating_on_time,
        rating_communication: r.rating_communication,
        comment: r.comment,
        created_at: r.created_at,
      }));
      setWritten(writtenData);

      const reviewedIds = new Set((reviewedRes.data ?? []).map((r: any) => r.booking_id));
      const pendingData: PendingBooking[] = (bookingsRes.data ?? [])
        .filter((b: any) => !reviewedIds.has(b.id))
        .map((b: any) => ({
          id: b.id,
          traveller_id: b.traveller_id,
          traveller_display_name: profileMap[b.traveller_id]?.name ?? 'Traveller',
          avatar_url: profileMap[b.traveller_id]?.avatarUrl ?? null,
          drop_off_date: b.drop_off_date,
        }));
      setPending(pendingData);

      // Summary
      if (recvData.length > 0) {
        const overall = avg1(recvData.map(r => r.rating));
        const avgFriendliness = avg1(recvData.map(r => r.rating_friendliness ?? 0));
        const avgLocation = avg1(recvData.map(r => r.rating_location ?? 0));
        const avgDropOff = avg1(recvData.map(r => r.rating_drop_off ?? 0));
        const avgSecurity = avg1(recvData.map(r => r.rating_security ?? 0));
        setSummary({ total: recvData.length, overall, avgFriendliness, avgLocation, avgDropOff, avgSecurity });
      }
    } finally {
      setLoading(false);
    }
  }

  function goReviewTraveller(item: PendingBooking) {
    router.push({
      pathname: '/(host)/review-traveller',
      params: { bookingId: item.id, travellerId: item.traveller_id, travellerName: item.traveller_display_name },
    } as any);
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
      ) : loadError ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>⚠️</Text>
          <Text style={styles.emptyTitle}>Couldn't load reviews</Text>
          <Text style={styles.emptySub}>Something went wrong loading your reviews. Please try again.</Text>
          <TouchableOpacity
            onPress={load}
            // @ts-ignore
            onClick={load}
            style={{ marginTop: 14, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, backgroundColor: Colors.primary }}
          >
            <Text style={{ color: Colors.white, fontWeight: '700' }}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
          <View style={{ paddingHorizontal: Spacing.xl, paddingTop: 8 }}>
            <SummaryCard s={summary} />
          </View>

          <View style={{ paddingHorizontal: Spacing.xl, paddingTop: summary.total > 0 ? 0 : 8 }}>
            <TabBar active={activeTab} onSelect={setActiveTab} pendingCount={pending.length} />
          </View>

          <View style={{ paddingHorizontal: Spacing.xl, paddingTop: 12 }}>
            {activeTab === 'received' && (
              received.length === 0
                ? <Empty emoji="⭐" title="No reviews yet" sub="Your first review will appear here once a traveller completes a booking and leaves feedback." />
                : received.map(item => <ReceivedCard key={item.id} item={item} />)
            )}
            {activeTab === 'written' && (
              written.length === 0
                ? <Empty emoji="✍️" title="No reviews written yet" sub="After completing a booking, take a moment to review your traveller." />
                : written.map(item => <WrittenCard key={item.id} item={item} />)
            )}
            {activeTab === 'pending' && (
              pending.length === 0
                ? <Empty emoji="✅" title="All caught up" sub="You've reviewed all your completed bookings." />
                : pending.map(item => <PendingCard key={item.id} item={item} onReview={goReviewTraveller} />)
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

  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.offWhite,
    borderRadius: Radius.sm,
    padding: 3,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: Radius.xs },
  tabActive: { backgroundColor: Colors.white, ...CardShadow },
  tabText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: Colors.textPrimary, fontWeight: '700' },

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
  cardName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  cardDate: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  cardAvgLabel: { fontSize: 11, color: Colors.textSecondary },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  tag: {
    backgroundColor: Colors.successBg,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: { fontSize: 12, fontWeight: '600', color: Colors.successText },
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

  empty: { alignItems: 'center', paddingVertical: 56, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 48, marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8, textAlign: 'center' },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 21 },
});
