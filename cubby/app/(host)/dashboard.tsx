import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { DashboardSkeleton } from '../../src/components/Skeleton';
import { router, useFocusEffect } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';
import NotificationBell from '../../src/components/NotificationBell';
import HostOnboardingChecklist from '../../src/components/HostOnboardingChecklist';
import { recalculateHostResponseRate, formatResponseRate, formatResponseTime } from '../../src/lib/response-rate';

// ─── Types ────────────────────────────────────────────────────────────────────

type Booking = {
  id: string;
  travellerId?: string;
  traveller: string;
  bags: number;
  dropOff: string;
  pickUp: string;
  total: number;
  status: string;
  created_at?: string;
};

type WeekDay = { day: string; earnings: number };

type Stats = {
  hostName: string;
  hostId: string;
  isActive: boolean;
  monthlyEarnings: number;
  monthlyBookings: number;
  avgRating: number;
  reviewCount: number;
  responseRate: number | null;
  avgResponseTimeMinutes: number | null;
  totalRequests: number;
  pendingCount: number;
  completedCount: number;
  weeklyData: WeekDay[];
};

// ─── Demo fallback ────────────────────────────────────────────────────────────

const DEMO_BOOKINGS: Booking[] = [
  { id: 'demo-1', traveller: 'Sarah T.', bags: 2, dropOff: '09:00', pickUp: '15:00', total: 160, status: 'confirmed' },
  { id: 'demo-2', traveller: 'James M.', bags: 1, dropOff: '10:30', pickUp: '18:00', total: 80, status: 'pending' },
];

const DEMO_STATS: Stats = {
  hostName: 'Host',
  hostId: '',
  isActive: true,
  monthlyEarnings: 1240,
  monthlyBookings: 14,
  avgRating: 4.9,
  reviewCount: 23,
  responseRate: 98,
  avgResponseTimeMinutes: 45,
  totalRequests: 15,
  pendingCount: 2,
  completedCount: 12,
  weeklyData: [
    { day: 'M', earnings: 200 },
    { day: 'T', earnings: 320 },
    { day: 'W', earnings: 160 },
    { day: 'T', earnings: 440 },
    { day: 'F', earnings: 480 },
    { day: 'S', earnings: 280 },
    { day: 'S', earnings: 120 },
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Host's real earnings for a booking — the persisted 70%-of-base payout
 * once completed (set by complete-booking), otherwise a 70%-of-base
 * projection from the price snapshot for bookings not yet completed.
 * Falls back to total_price for legacy bookings with no snapshot, same
 * fallback complete-booking itself uses — a display-only approximation,
 * never used for the actual payout calculation. */
function hostShare(b: { total_price?: number | null; base_storage_amount?: number | null; host_payout_amount?: number | null }): number {
  if (b.host_payout_amount != null) return Number(b.host_payout_amount);
  const base = b.base_storage_amount ?? b.total_price ?? 0;
  return Math.round(Number(base) * 0.70);
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Returns an array of ISO date strings for Mon–Sun of the current week */
function currentWeekDates(): string[] {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sun
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return isoDate(d);
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>(DEMO_STATS);
  const [bookings, setBookings] = useState<Booking[]>(DEMO_BOOKINGS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [pendingHost, setPendingHost] = useState(false);
  const [isHostApproved, setIsHostApproved] = useState(false);

  useFocusEffect(useCallback(() => {
    loadDashboard();
  }, []));

  async function loadDashboard() {
    if (!isSupabaseConfigured) return; // keep demo data
    setLoading(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // ── 1. Host row ──────────────────────────────────────────────────────
      const { data: host, error: hostErr } = await supabase
        .from('hosts')
        .select('id, display_name, rating, review_count, is_active, response_rate, avg_response_time_minutes, total_requests, responded_requests')
        .eq('assigned_user_id', user.id)
        .single();

      if (hostErr || !host) {
        // No hosts row assigned yet — admin hasn't approved/set up this account
        // as a host. Show onboarding status instead of stats for a listing
        // that doesn't exist.
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_host_approved')
          .eq('id', user.id)
          .maybeSingle();
        setIsHostApproved(profile?.is_host_approved ?? false);
        setPendingHost(true);
        return;
      }

      setPendingHost(false);
      const hostId = host.id;
      const today = isoDate(new Date());
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const weekDates = currentWeekDates();
      const weekStart = weekDates[0];
      const weekEnd = weekDates[6];

      // ── 2. Fetch in parallel ─────────────────────────────────────────────
      const [todayRes, monthRes, weekRes, pendingRes, completedRes] = await Promise.all([
        // Today's active bookings (for the card list)
        supabase
          .from('bookings')
          .select('id, traveller_id, bag_count, drop_off_time, pick_up_time, total_price, status, created_at, profiles:traveller_id(full_name, email)')
          .eq('host_id', hostId)
          .eq('drop_off_date', today)
          .in('status', ['pending', 'confirmed', 'active'])
          .order('drop_off_time'),

        // This month's completed bookings (for earnings card)
        supabase
          .from('bookings')
          .select('id, total_price, base_storage_amount, host_payout_amount, status')
          .eq('host_id', hostId)
          .gte('drop_off_date', monthStart)
          .lte('drop_off_date', today)
          .in('status', ['confirmed', 'active', 'completed']),

        // This week's completed bookings (for bar chart)
        supabase
          .from('bookings')
          .select('drop_off_date, total_price, base_storage_amount, host_payout_amount')
          .eq('host_id', hostId)
          .gte('drop_off_date', weekStart)
          .lte('drop_off_date', weekEnd)
          .in('status', ['confirmed', 'active', 'completed']),

        // Pending bookings count (all time, not just today)
        supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('host_id', hostId)
          .eq('status', 'pending'),

        // Completed bookings count (all time)
        supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('host_id', hostId)
          .eq('status', 'completed'),
      ]);

      // ── 3. Process today's bookings ──────────────────────────────────────
      const todayBookings: Booking[] = (todayRes.data ?? []).map((b: any) => ({
        id: b.id,
        travellerId: b.traveller_id,
        traveller: b.profiles?.full_name?.trim() || b.profiles?.email?.split('@')[0] || 'Traveller',
        bags: b.bag_count,
        dropOff: b.drop_off_time,
        pickUp: b.pick_up_time,
        total: b.total_price,
        status: b.status,
        created_at: b.created_at,
      }));
      setBookings(todayBookings);

      // ── 4. Monthly stats ─────────────────────────────────────────────────
      const monthBookings = monthRes.data ?? [];
      // Host's real earnings (70% of base storage), not the gross traveller
      // payment — see hostShare() above.
      const monthlyEarnings = monthBookings.reduce((sum: number, b: any) => sum + hostShare(b), 0);
      const monthlyBookings = monthBookings.length;

      // ── 5. Weekly bar chart ──────────────────────────────────────────────
      const earningsByDate: Record<string, number> = {};
      for (const b of weekRes.data ?? []) {
        earningsByDate[b.drop_off_date] = (earningsByDate[b.drop_off_date] ?? 0) + hostShare(b);
      }
      const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
      const weeklyData: WeekDay[] = weekDates.map((date, i) => ({
        day: DAY_LABELS[i],
        earnings: earningsByDate[date] ?? 0,
      }));

      // ── 6. Assemble stats ────────────────────────────────────────────────
      setStats({
        hostName: host.display_name ?? 'Host',
        hostId: host.id,
        isActive: host.is_active ?? true,
        monthlyEarnings,
        monthlyBookings,
        avgRating: host.rating ?? 0,
        reviewCount: host.review_count ?? 0,
        responseRate: host.response_rate ?? null,
        avgResponseTimeMinutes: host.avg_response_time_minutes ?? null,
        totalRequests: host.total_requests ?? 0,
        pendingCount: pendingRes.count ?? 0,
        completedCount: completedRes.count ?? 0,
        weeklyData,
      });
    } catch (err) {
      console.error('Dashboard load error:', err);
      setError('Could not load dashboard data.');
    } finally {
      setLoading(false);
    }
  }

  async function toggleAvailability() {
    if (!isSupabaseConfigured || togglingStatus) return;
    setTogglingStatus(true);
    try {
      const next = !stats.isActive;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('hosts').update({ is_active: next }).eq('assigned_user_id', user.id);
      setStats(s => ({ ...s, isActive: next }));
    } finally {
      setTogglingStatus(false);
    }
  }

  // Legacy direct-write path for the 'pending' host accept/decline flow,
  // converted to the respond_to_pending_booking RPC — a raw `.update()`
  // here could previously write any status value regardless of the row's
  // actual current status, and financial-integrity hardening removed the
  // client's direct UPDATE grant on bookings entirely. The RPC computes
  // host_responded_at/response_time_minutes server-side from the row's own
  // created_at, so it no longer needs to be passed from here.
  async function updateBookingStatus(bookingId: string, newStatus: string) {
    setActionId(bookingId);
    try {
      const isResponse = newStatus === 'confirmed' || newStatus === 'cancelled';
      if (isSupabaseConfigured) {
        const { data: result, error } = await supabase.rpc('respond_to_pending_booking', {
          p_booking_id: bookingId,
          p_decision: newStatus,
        });
        if (error || !result?.ok) { Alert.alert('Error', 'Could not update booking. Please try again.'); return; }

        // Fire-and-forget recalculate
        if (isResponse && stats.hostId) {
          recalculateHostResponseRate(supabase, stats.hostId)
            .then(r => setStats(s => ({ ...s, responseRate: r.response_rate, avgResponseTimeMinutes: r.avg_response_time_minutes, totalRequests: r.total_requests })))
            .catch(() => {});
        }
      }
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
      if (newStatus !== 'pending') {
        setStats(s => ({ ...s, pendingCount: Math.max(0, s.pendingCount - 1) }));
      }
    } finally {
      setActionId(null);
    }
  }

  async function handleComplete(booking: Booking) {
    setCompletingId(booking.id);
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.functions.invoke('complete-booking', {
          body: { bookingId: booking.id },
        });

        if (error || !data?.success) {
          Alert.alert('Error', 'Could not process payout. Please try again.');
          return;
        }

        setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'completed' } : b));
        // Update stats optimistically — data.hostAmount is the real 70%-of-
        // base payout complete-booking just computed, not the gross total.
        setStats(s => ({
          ...s,
          monthlyEarnings: s.monthlyEarnings + Number(data.hostAmount ?? 0),
          monthlyBookings: s.monthlyBookings + 1,
          completedCount: s.completedCount + 1,
        }));

        Alert.alert(
          'Payout Initiated',
          `Payout of R${data.hostAmount.toFixed(2)} will be sent to ${data.bankName} within 1-2 business days.`,
        );
      } else {
        setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'completed' } : b));
        Alert.alert('Booking Complete', `Payout of R${(booking.total * 0.70).toFixed(2)} will be sent once Cubby is live.`);
      }
    } finally {
      setCompletingId(null);
    }
  }

  // ── Bar chart helpers ──────────────────────────────────────────────────────
  const maxWeekEarnings = Math.max(...stats.weeklyData.map(d => d.earnings), 1);
  const BAR_MAX_HEIGHT = 80;

  const todayDayIndex = (() => {
    const d = new Date().getDay(); // 0 = Sun
    return d === 0 ? 6 : d - 1; // Mon = 0 … Sun = 6
  })();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Welcome back 👋</Text>
            <Text style={styles.heading}>Host Dashboard</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <NotificationBell variant="host" />
            <TouchableOpacity
              style={styles.switchBtn}
              onPress={() => router.replace('/(traveller)/explore')}
              // @ts-ignore
              onClick={() => router.replace('/(traveller)/explore')}
            >
              <Text style={styles.switchBtnText}>🧳 Traveller</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Error banner ─────────────────────────────────────────────────── */}
        {!!error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        {!loading && pendingHost ? (
          <HostOnboardingChecklist isApproved={isHostApproved} />
        ) : (
        <>
        {/* ── Earnings card ─────────────────────────────────────────────────── */}
        <View style={styles.earningsCard}>
          {loading ? (
            <View style={{ gap: 10, paddingVertical: 8 }}>
              <View style={{ width: 120, height: 14, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.25)' }} />
              <View style={{ width: 180, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.25)' }} />
              <View style={{ flexDirection: 'row', gap: 24, marginTop: 4 }}>
                {[1,2,3].map(i => <View key={i} style={{ width: 60, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.2)' }} />)}
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.earningsLabel}>This month's earnings</Text>
              <Text style={styles.earningsAmount}>
                R{stats.monthlyEarnings.toLocaleString('en-ZA')}
              </Text>
              <View style={styles.earningsRow}>
                <View style={styles.earningsStat}>
                  <Text style={styles.earningsStatNum}>{stats.monthlyBookings}</Text>
                  <Text style={styles.earningsStatLabel}>Bookings</Text>
                </View>
                <View style={styles.earningsDivider} />
                <View style={styles.earningsStat}>
                  <Text style={styles.earningsStatNum}>
                    {stats.reviewCount > 0 ? stats.avgRating.toFixed(1) : '—'}
                  </Text>
                  <Text style={styles.earningsStatLabel}>Avg rating</Text>
                </View>
                <View style={styles.earningsDivider} />
                <View style={styles.earningsStat}>
                  <Text style={styles.earningsStatNum}>
                    {formatResponseRate(stats.responseRate, stats.totalRequests)}
                  </Text>
                  <Text style={styles.earningsStatLabel}>
                    {(() => {
                      const rt = formatResponseTime(stats.avgResponseTimeMinutes, stats.totalRequests);
                      return rt ? rt.replace('Responds ', '') : 'Response rate';
                    })()}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* ── Quick stat pills ──────────────────────────────────────────────── */}
        {!loading && (
          <View style={styles.pillsRow}>
            <View style={[styles.pill, { backgroundColor: '#FEF3C7' }]}>
              <Text style={[styles.pillNum, { color: '#D97706' }]}>{stats.pendingCount}</Text>
              <Text style={styles.pillLabel}>Pending</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: '#EDE9FE' }]}>
              <Text style={[styles.pillNum, { color: '#7C3AED' }]}>{stats.completedCount}</Text>
              <Text style={styles.pillLabel}>Completed</Text>
            </View>
            <TouchableOpacity
              style={[styles.pill, { backgroundColor: '#DCFCE7' }]}
              onPress={() => router.push('/(host)/reviews')}
              // @ts-ignore
              onClick={() => router.push('/(host)/reviews')}
              activeOpacity={0.75}
            >
              <Text style={[styles.pillNum, { color: Colors.success }]}>{stats.reviewCount}</Text>
              <Text style={styles.pillLabel}>Reviews ›</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Weekly bar chart ──────────────────────────────────────────────── */}
        <View style={styles.weekCard}>
          <Text style={styles.weekTitle}>This week's earnings</Text>
          {loading ? (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 80, marginTop: 8 }}>
              {[55, 80, 40, 100, 65, 45, 75].map((pct, i) => (
                <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                  <View style={{ width: '100%', height: Math.round(pct * 0.7), borderRadius: 4, backgroundColor: '#EDEDEB' }} />
                  <View style={{ width: 24, height: 10, borderRadius: 4, backgroundColor: '#EDEDEB', marginTop: 5 }} />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.weekBars}>
              {stats.weeklyData.map((d, i) => {
                const barH = maxWeekEarnings > 0
                  ? Math.max(4, Math.round((d.earnings / maxWeekEarnings) * BAR_MAX_HEIGHT))
                  : 4;
                const isToday = i === todayDayIndex;
                return (
                  <View key={i} style={styles.weekBarCol}>
                    {d.earnings > 0 && (
                      <Text style={styles.weekBarAmount}>
                        R{d.earnings >= 1000 ? `${(d.earnings / 1000).toFixed(1)}k` : d.earnings}
                      </Text>
                    )}
                    <View style={[
                      styles.weekBar,
                      { height: barH },
                      isToday && styles.weekBarToday,
                    ]} />
                    <Text style={[styles.weekBarLabel, isToday && styles.weekBarLabelToday]}>
                      {d.day}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ── Availability toggle ───────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.statusCard}
          onPress={toggleAvailability}
          // @ts-ignore
          onClick={toggleAvailability}
          activeOpacity={isSupabaseConfigured ? 0.85 : 1}
          disabled={togglingStatus}
        >
          <View>
            <Text style={styles.statusTitle}>Availability</Text>
            <Text style={styles.statusSub}>
              {stats.isActive ? 'You are currently accepting bags' : 'You are not accepting bags'}
            </Text>
          </View>
          <View style={[
            styles.statusToggle,
            !stats.isActive && styles.statusToggleOff,
          ]}>
            {togglingStatus
              ? <ActivityIndicator size="small" color={stats.isActive ? Colors.success : Colors.textSecondary} />
              : <View style={[styles.statusDot, !stats.isActive && styles.statusDotOff]} />
            }
            <Text style={[styles.statusOnText, !stats.isActive && styles.statusOffText]}>
              {stats.isActive ? 'Open' : 'Closed'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* ── Today's bookings ─────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Today's bookings</Text>

        {loading ? (
          <View style={{ gap: 10 }}>
            {[1, 2].map(i => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#F0EAEA' }}>
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#EDEDEB' }} />
                <View style={{ flex: 1, gap: 8 }}>
                  <View style={{ width: '50%', height: 13, borderRadius: 6, backgroundColor: '#EDEDEB' }} />
                  <View style={{ width: '70%', height: 11, borderRadius: 5, backgroundColor: '#EDEDEB' }} />
                </View>
                <View style={{ width: 60, height: 28, borderRadius: 8, backgroundColor: '#EDEDEB' }} />
              </View>
            ))}
          </View>
        ) : bookings.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyTitle}>No bookings today</Text>
            <Text style={styles.emptySub}>New bookings will appear here as they come in.</Text>
          </View>
        ) : (
          <View style={styles.bookingsList}>
            {bookings.map(b => (
              <View key={b.id} style={styles.bookingCard}>
                <View style={styles.bookingTop}>
                  <View style={styles.travIcon}>
                    <Text style={{ fontSize: 20 }}>👤</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.travName}>{b.traveller}</Text>
                    <Text style={styles.travDetails}>
                      {b.bags} bag{b.bags > 1 ? 's' : ''} · {b.dropOff} – {b.pickUp}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.bookingAmount}>R{b.total}</Text>
                    <View style={[
                      styles.bookingStatus,
                      {
                        backgroundColor:
                          b.status === 'confirmed' ? '#D1FAE5' :
                          b.status === 'completed' ? '#EDE9FE' :
                          '#FEF3C7',
                      },
                    ]}>
                      <Text style={[
                        styles.bookingStatusText,
                        {
                          color:
                            b.status === 'confirmed' ? Colors.success :
                            b.status === 'completed' ? '#7C3AED' :
                            Colors.warning,
                        },
                      ]}>
                        {b.status === 'confirmed' ? 'Confirmed' :
                         b.status === 'completed' ? 'Completed' : 'Pending'}
                      </Text>
                    </View>
                  </View>
                </View>

                {b.status === 'pending' && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.acceptBtn, actionId === b.id && { opacity: 0.6 }]}
                      onPress={() => updateBookingStatus(b.id, 'confirmed')}
                      // @ts-ignore
                      onClick={() => updateBookingStatus(b.id, 'confirmed')}
                      disabled={actionId === b.id}
                    >
                      <Text style={styles.acceptBtnText}>{actionId === b.id ? '…' : '✓ Accept'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.declineBtn, actionId === b.id && { opacity: 0.6 }]}
                      onPress={() => updateBookingStatus(b.id, 'cancelled')}
                      // @ts-ignore
                      onClick={() => updateBookingStatus(b.id, 'cancelled')}
                      disabled={actionId === b.id}
                    >
                      <Text style={styles.declineBtnText}>✕ Decline</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {b.status === 'confirmed' && (
                  <View style={{ gap: 8, marginTop: 12 }}>
                    <TouchableOpacity
                      style={[styles.completeBtn, completingId === b.id && styles.completeBtnDisabled]}
                      onPress={() => handleComplete(b)}
                      // @ts-ignore
                      onClick={() => handleComplete(b)}
                      disabled={completingId === b.id}
                    >
                      <Text style={styles.completeBtnText}>
                        {completingId === b.id ? 'Processing…' : '✓ Mark complete & pay out'}
                      </Text>
                    </TouchableOpacity>
                    {b.travellerId && (
                      <TouchableOpacity
                        style={styles.profileBtn}
                        onPress={() => router.push({ pathname: '/(host)/traveller-profile', params: { travellerId: b.travellerId, bookingId: b.id } })}
                        // @ts-ignore
                        onClick={() => router.push({ pathname: '/(host)/traveller-profile', params: { travellerId: b.travellerId, bookingId: b.id } })}
                      >
                        <Text style={styles.profileBtnText}>👤 View Traveller Profile</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* ── Response rate nudge ──────────────────────────────────────────── */}
        {!loading && stats.totalRequests < 3 && (
          <View style={styles.nudgeCard}>
            <Text style={styles.nudgeTitle}>⚡ Build your response stats</Text>
            <Text style={styles.nudgeText}>
              Respond to your first {Math.max(1, 3 - stats.totalRequests)} booking request{3 - stats.totalRequests !== 1 ? 's' : ''} to start showing your response rate and time. Hosts who respond quickly earn more bookings.
            </Text>
          </View>
        )}
        {!loading && stats.totalRequests >= 3 && stats.responseRate !== null && stats.responseRate < 80 && (
          <View style={[styles.nudgeCard, styles.nudgeCardWarn]}>
            <Text style={styles.nudgeTitle}>⚠️ Your response rate is low</Text>
            <Text style={styles.nudgeText}>
              Respond to all requests within 24 hours to keep your rate healthy. A low rate reduces your visibility in search results.
            </Text>
          </View>
        )}
        {!loading && stats.totalRequests >= 3 && stats.avgResponseTimeMinutes !== null && stats.avgResponseTimeMinutes > 60 && (stats.responseRate ?? 0) >= 80 && (
          <View style={styles.nudgeCard}>
            <Text style={styles.nudgeTitle}>⚡ Respond faster to rank higher</Text>
            <Text style={styles.nudgeText}>
              Your average response time is {stats.avgResponseTimeMinutes >= 60 ? `${Math.round(stats.avgResponseTimeMinutes / 60)}h` : `${stats.avgResponseTimeMinutes}min`}. Hosts who respond within 1 hour earn the Fast Responder badge and rank higher in search.
            </Text>
          </View>
        )}

        {/* ── Tip ─────────────────────────────────────────────────────────── */}
        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>💡 Hosting tip</Text>
          <Text style={styles.tipText}>
            Hosts who respond within 1 hour earn 40% more bookings. Keep your availability up to date!
          </Text>
        </View>
        </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', padding: 20, paddingTop: 8,
  },
  greeting: { fontSize: 14, color: Colors.textSecondary },
  heading: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  switchBtn: {
    backgroundColor: Colors.white, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  switchBtnText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },

  errorBanner: {
    backgroundColor: Colors.errorBg, borderRadius: 12, marginHorizontal: 20,
    padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#FECACA',
  },
  errorText: { fontSize: 14, color: Colors.error, fontWeight: '600' },

  earningsCard: {
    backgroundColor: Colors.primary, marginHorizontal: 20,
    borderRadius: 20, padding: 20, marginBottom: 12,
  },
  earningsLabel: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  earningsAmount: { fontSize: 36, fontWeight: '900', color: Colors.white, marginBottom: 20 },
  earningsRow: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12, padding: 12,
  },
  earningsStat: { flex: 1, alignItems: 'center' },
  earningsStatNum: { fontSize: 20, fontWeight: '800', color: Colors.white },
  earningsStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  earningsDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 4 },

  pillsRow: {
    flexDirection: 'row', gap: 10, marginHorizontal: 20, marginBottom: 16,
  },
  pill: {
    flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: 'center',
  },
  pillNum: { fontSize: 22, fontWeight: '900' },
  pillLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2, fontWeight: '600' },

  weekCard: {
    backgroundColor: Colors.white, marginHorizontal: 20, borderRadius: 18,
    padding: 16, borderWidth: 1, borderColor: Colors.border, marginBottom: 16,
  },
  weekTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12 },
  weekBars: { flexDirection: 'row', alignItems: 'flex-end', height: 110, gap: 6 },
  weekBarCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
  weekBarAmount: { fontSize: 8, color: Colors.textSecondary, fontWeight: '600' },
  weekBar: { width: '100%', backgroundColor: Colors.primary, borderRadius: 6, opacity: 0.7 },
  weekBarToday: { opacity: 1 },
  weekBarLabel: { fontSize: 10, color: Colors.textSecondary },
  weekBarLabelToday: { color: Colors.primary, fontWeight: '700' },

  statusCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.white, marginHorizontal: 20, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: Colors.border, marginBottom: 24,
  },
  statusTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  statusSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  statusToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#D1FAE5', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
  },
  statusToggleOff: { backgroundColor: '#F3F4F6' },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success },
  statusDotOff: { backgroundColor: '#9CA3AF' },
  statusOnText: { fontSize: 14, fontWeight: '700', color: Colors.success },
  statusOffText: { color: '#6B7280' },

  sectionTitle: {
    fontSize: 17, fontWeight: '700', color: Colors.textPrimary,
    paddingHorizontal: 20, marginBottom: 12,
  },
  loadingBox: { alignItems: 'center', paddingVertical: 32 },
  emptyBox: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  emptySub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 18 },

  bookingsList: { paddingHorizontal: 20, gap: 12, marginBottom: 20 },
  bookingCard: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  bookingTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  travIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center',
  },
  travName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  travDetails: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  bookingAmount: { fontSize: 16, fontWeight: '800', color: Colors.primary, textAlign: 'right' },
  bookingStatus: {
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2,
    marginTop: 4, alignSelf: 'flex-end',
  },
  bookingStatusText: { fontSize: 11, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  acceptBtn: {
    flex: 1, backgroundColor: Colors.success, borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  acceptBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  declineBtn: {
    flex: 1, borderWidth: 1.5, borderColor: Colors.error, borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  declineBtnText: { color: Colors.error, fontWeight: '700', fontSize: 14 },
  completeBtn: {
    flex: 1, backgroundColor: Colors.primary, borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  completeBtnDisabled: { opacity: 0.6 },
  completeBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  profileBtn: {
    borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 10,
    paddingVertical: 9, alignItems: 'center',
  },
  profileBtnText: { color: Colors.primary, fontWeight: '600', fontSize: 14 },

  nudgeCard: {
    backgroundColor: Colors.infoBg, borderRadius: 14, marginHorizontal: 20,
    padding: 16, borderWidth: 1, borderColor: '#BFDBFE', marginBottom: 12,
  },
  nudgeCardWarn: { backgroundColor: Colors.warningBg, borderColor: '#FDE68A' },
  nudgeTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  nudgeText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  tipCard: {
    backgroundColor: '#FFF9EC', borderRadius: 14, marginHorizontal: 20,
    padding: 16, borderWidth: 1, borderColor: '#F59E0B40',
  },
  tipTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  tipText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
});
