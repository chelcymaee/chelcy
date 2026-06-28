import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';
import NotificationBell from '../../src/components/NotificationBell';

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
};

type WeekDay = { day: string; earnings: number };

type Stats = {
  hostName: string;
  isActive: boolean;
  monthlyEarnings: number;
  monthlyBookings: number;
  avgRating: number;
  reviewCount: number;
  responseRate: number;
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
  isActive: true,
  monthlyEarnings: 1240,
  monthlyBookings: 14,
  avgRating: 4.9,
  reviewCount: 23,
  responseRate: 98,
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
        .select('id, display_name, rating, review_count, is_active, response_rate')
        .eq('assigned_user_id', user.id)
        .single();

      if (hostErr || !host) {
        setError('Host profile not found. Set up your host profile first.');
        return;
      }

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
          .select('id, bag_count, drop_off_time, pick_up_time, total_price, status, profiles:traveller_id(full_name, email)')
          .eq('host_id', hostId)
          .eq('drop_off_date', today)
          .in('status', ['pending', 'confirmed', 'active'])
          .order('drop_off_time'),

        // This month's completed bookings (for earnings card)
        supabase
          .from('bookings')
          .select('id, total_price, status')
          .eq('host_id', hostId)
          .gte('drop_off_date', monthStart)
          .lte('drop_off_date', today)
          .in('status', ['confirmed', 'active', 'completed']),

        // This week's completed bookings (for bar chart)
        supabase
          .from('bookings')
          .select('drop_off_date, total_price')
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
      }));
      setBookings(todayBookings);

      // ── 4. Monthly stats ─────────────────────────────────────────────────
      const monthBookings = monthRes.data ?? [];
      const monthlyEarnings = monthBookings.reduce((sum: number, b: any) => sum + (b.total_price ?? 0), 0);
      const monthlyBookings = monthBookings.length;

      // ── 5. Weekly bar chart ──────────────────────────────────────────────
      const earningsByDate: Record<string, number> = {};
      for (const b of weekRes.data ?? []) {
        earningsByDate[b.drop_off_date] = (earningsByDate[b.drop_off_date] ?? 0) + (b.total_price ?? 0);
      }
      const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
      const weeklyData: WeekDay[] = weekDates.map((date, i) => ({
        day: DAY_LABELS[i],
        earnings: earningsByDate[date] ?? 0,
      }));

      // ── 6. Assemble stats ────────────────────────────────────────────────
      setStats({
        hostName: host.display_name ?? 'Host',
        isActive: host.is_active ?? true,
        monthlyEarnings,
        monthlyBookings,
        avgRating: host.rating ?? 0,
        reviewCount: host.review_count ?? 0,
        responseRate: host.response_rate ?? 100,
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

  async function updateBookingStatus(bookingId: string, newStatus: string) {
    setActionId(bookingId);
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('bookings').update({ status: newStatus }).eq('id', bookingId);
        if (error) {
          Alert.alert('Error', 'Could not update booking. Please try again.');
          return;
        }
      }
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
      // Refresh pending count
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
        // Update stats optimistically
        setStats(s => ({
          ...s,
          monthlyEarnings: s.monthlyEarnings + booking.total,
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

        {/* ── Earnings card ─────────────────────────────────────────────────── */}
        <View style={styles.earningsCard}>
          {loading ? (
            <ActivityIndicator color="rgba(255,255,255,0.8)" style={{ marginVertical: 12 }} />
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
                  <Text style={styles.earningsStatNum}>{stats.responseRate}%</Text>
                  <Text style={styles.earningsStatLabel}>Response</Text>
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
            <View style={[styles.pill, { backgroundColor: '#DCFCE7' }]}>
              <Text style={[styles.pillNum, { color: Colors.success }]}>{stats.reviewCount}</Text>
              <Text style={styles.pillLabel}>Reviews</Text>
            </View>
          </View>
        )}

        {/* ── Weekly bar chart ──────────────────────────────────────────────── */}
        <View style={styles.weekCard}>
          <Text style={styles.weekTitle}>This week's earnings</Text>
          {loading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: 24 }} />
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
          <View style={styles.loadingBox}>
            <ActivityIndicator color={Colors.primary} />
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

        {/* ── Tip ─────────────────────────────────────────────────────────── */}
        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>💡 Hosting tip</Text>
          <Text style={styles.tipText}>
            Hosts who respond within 1 hour earn 40% more bookings. Keep your availability up to date!
          </Text>
        </View>

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
    backgroundColor: '#FEE2E2', borderRadius: 12, marginHorizontal: 20,
    padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#FECACA',
  },
  errorText: { fontSize: 14, color: '#B91C1C', fontWeight: '600' },

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

  tipCard: {
    backgroundColor: '#FFF9EC', borderRadius: 14, marginHorizontal: 20,
    padding: 16, borderWidth: 1, borderColor: '#F59E0B40',
  },
  tipTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  tipText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
});
