import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';
import { computeTravellerBadges, TrustBadge } from '../../src/lib/trust-badges';
import Avatar from '../../src/components/Avatar';
import { useSelectedHost } from '../../src/lib/host-context';

interface TravellerData {
  fullName: string;
  email: string;
  avatarUrl: string | null;
  isVerified: boolean;
  memberSince: string;
  completedBookings: number;
}

interface BookingContext {
  id: string;
  dropOffDate: string;
  dropOffTime: string;
  pickUpTime: string;
  bagCount: number;
  status: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_COLOR: Record<string, string> = {
  pending: '#D97706',
  confirmed: '#059669',
  active: '#2563EB',
  completed: '#6B7280',
  cancelled: '#DC2626',
};

export default function TravellerProfileForHost() {
  const { travellerId, bookingId, returnTo } = useLocalSearchParams<{
    travellerId: string;
    bookingId: string;
    returnTo?: string;
  }>();

  // Booking-specific, not selected-listing-specific: this screen is
  // addressed by a specific bookingId, and a host should be able to open
  // it from either listing regardless of what's currently selected on
  // Dashboard — see load() below for the ownership check that uses this.
  const { hosts, loading: hostContextLoading } = useSelectedHost();

  const [traveller, setTraveller] = useState<TravellerData | null>(null);
  const [travellerBadges, setTravellerBadges] = useState<TrustBadge[]>([]);
  const [booking, setBooking] = useState<BookingContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // FAT-018: was `[]` — only ever fetched once, on first mount. If this
  // screen instance is reused across repeated navigations here (same
  // pattern as FAT-013's chat screens), tapping "View profile" for a
  // second, different traveller never re-fetched — it kept showing
  // whoever was loaded the very first time. Depending on travellerId/
  // bookingId re-runs load() whenever the route actually points at a
  // different traveller/booking; resetting traveller/booking/error first
  // means no previous person's details can linger while the new ones load.
  useEffect(() => {
    setTraveller(null);
    setBooking(null);
    setError('');
    setLoading(true);
    load();
    // hostContextLoading added so a mount that races ahead of HostProvider
    // resolving retries once the owned-listings array is ready — the
    // travellerId/bookingId re-fetch behavior (FAT-018) is unchanged.
  }, [travellerId, bookingId, hostContextLoading]);

  async function load() {
    if (!isSupabaseConfigured || !travellerId || !bookingId) {
      setError('Missing required information.');
      setLoading(false);
      return;
    }

    // HostProvider itself still resolving — wait rather than briefly
    // treating "not loaded yet" as "no permission".
    if (hostContextLoading) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/(host)/requests'); return; }

      // Resolve the booking directly by id+traveller — not scoped to
      // whichever listing happens to be selected on Dashboard, since this
      // screen is addressed by a specific booking and a host should be
      // able to open it from either of their listings.
      const { data: bookingRow, error: bookingErr } = await supabase
        .from('bookings')
        .select('id, host_id, traveller_id, drop_off_date, drop_off_time, pick_up_time, bag_count, status')
        .eq('id', bookingId)
        .eq('traveller_id', travellerId)
        .single();

      if (bookingErr || !bookingRow) {
        setError('You do not have permission to view this profile.');
        setLoading(false);
        return;
      }

      // Security check: verify the booking's host_id is one of THIS
      // user's owned listings (any of them, not just the currently
      // selected one) — HostProvider's hosts array, already verified
      // against auth.uid(), is the source of truth for ownership here,
      // same as every other migrated screen.
      if (!hosts.some(h => h.id === bookingRow.host_id)) {
        setError('You do not have permission to view this profile.');
        setLoading(false);
        return;
      }

      setBooking({
        id: bookingRow.id,
        dropOffDate: bookingRow.drop_off_date ?? '',
        dropOffTime: bookingRow.drop_off_time ?? '',
        pickUpTime: bookingRow.pick_up_time ?? '',
        bagCount: bookingRow.bag_count ?? 1,
        status: bookingRow.status ?? 'pending',
      });

      // Load traveller profile (RLS policy allows host to read if booking exists)
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('full_name, email, avatar_url, is_verified, created_at')
        .eq('id', travellerId)
        .single();

      if (profErr || !prof) {
        setError('Could not load traveller profile.');
        setLoading(false);
        return;
      }

      // Count completed bookings for this traveller (across all hosts)
      const { count: completedCount } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('traveller_id', travellerId)
        .eq('status', 'completed');

      const tData: TravellerData = {
        fullName: prof.full_name?.trim() || prof.email?.split('@')[0] || 'Traveller',
        email: prof.email ?? '',
        avatarUrl: prof.avatar_url ?? null,
        isVerified: prof.is_verified ?? false,
        memberSince: prof.created_at
          ? new Date(prof.created_at).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })
          : 'Unknown',
        completedBookings: completedCount ?? 0,
      };
      setTraveller(tData);
      setTravellerBadges(computeTravellerBadges({
        is_verified: tData.isVerified,
        created_at: prof.created_at ?? new Date().toISOString(),
        completed_bookings: completedCount ?? 0,
      }));
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function goBack() {
    if (returnTo === 'messages') {
      router.replace('/(host)/messages');
    } else {
      router.replace('/(host)/requests');
    }
  }

  function renderVerificationBadge(isVerified: boolean) {
    if (isVerified) {
      return (
        <View style={[styles.badge, styles.badgeVerified]}>
          <Text style={[styles.badgeText, styles.badgeTextVerified]}>✅ Verified Traveller</Text>
        </View>
      );
    }
    return (
      <View style={[styles.badge, styles.badgeUnverified]}>
        <Text style={[styles.badgeText, styles.badgeTextUnverified]}>Not yet verified</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={goBack}
          // @ts-ignore
          onClick={goBack}
        >
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>Traveller Profile</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorEmoji}>🔒</Text>
          <Text style={styles.errorTitle}>Access Restricted</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.backBtn} onPress={goBack}
            // @ts-ignore
            onClick={goBack}>
            <Text style={styles.backBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      ) : traveller ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Avatar + name + verification */}
          <View style={styles.heroCard}>
            <Avatar
              uri={traveller.avatarUrl}
              size={80}
              fallbackEmoji="🎒"
              fallbackFontSize={38}
              backgroundColor="#F3F4F6"
              style={styles.avatarCircle}
            />
            <Text style={styles.name}>{traveller.fullName}</Text>
            {renderVerificationBadge(traveller.isVerified)}
            <Text style={styles.memberSince}>Member since {traveller.memberSince}</Text>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{traveller.completedBookings}</Text>
              <Text style={styles.statLabel}>Completed{'\n'}bookings</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>—</Text>
              <Text style={styles.statLabel}>Reviews{'\n'}coming soon</Text>
            </View>
          </View>

          {/* Booking context */}
          {booking && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>This booking</Text>
              <View style={styles.bookingCard}>
                <View style={styles.bookingRow}>
                  <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[booking.status] ?? '#6B7280' }]} />
                  <Text style={[styles.bookingStatus, { color: STATUS_COLOR[booking.status] ?? '#6B7280' }]}>
                    {STATUS_LABEL[booking.status] ?? booking.status}
                  </Text>
                </View>

                {!!booking.dropOffDate && (
                  <View style={styles.bookingDetail}>
                    <Text style={styles.bookingIcon}>📅</Text>
                    <Text style={styles.bookingDetailText}>{booking.dropOffDate}</Text>
                  </View>
                )}
                {(!!booking.dropOffTime || !!booking.pickUpTime) && (
                  <View style={styles.bookingDetail}>
                    <Text style={styles.bookingIcon}>🕐</Text>
                    <Text style={styles.bookingDetailText}>
                      {booking.dropOffTime}{booking.dropOffTime && booking.pickUpTime ? ' → ' : ''}{booking.pickUpTime}
                    </Text>
                  </View>
                )}
                <View style={styles.bookingDetail}>
                  <Text style={styles.bookingIcon}>🎒</Text>
                  <Text style={styles.bookingDetailText}>
                    {booking.bagCount} bag{booking.bagCount !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Trust & Safety */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trust & Safety</Text>

            {/* Trust badges */}
            {travellerBadges.length > 0 ? (
              <View style={styles.badgesGrid}>
                {travellerBadges.map(b => (
                  <View key={b.id} style={[styles.badgeCell, { backgroundColor: b.bg }]}>
                    <Text style={styles.badgeCellEmoji}>{b.emoji}</Text>
                    <Text style={[styles.badgeCellLabel, { color: b.color }]}>{b.label}</Text>
                    <Text style={styles.badgeCellDesc}>{b.description}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Always-visible info rows */}
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>📅</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Member since</Text>
                  <Text style={styles.infoValue}>{traveller.memberSince}</Text>
                </View>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>📦</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Completed bookings</Text>
                  <Text style={styles.infoValue}>{traveller.completedBookings} booking{traveller.completedBookings !== 1 ? 's' : ''} completed</Text>
                </View>
              </View>
              {!traveller.isVerified && (
                <>
                  <View style={styles.infoDivider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoIcon}>⏳</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.infoLabel}>Identity verification</Text>
                      <Text style={[styles.infoValue, { color: Colors.textSecondary }]}>Not yet verified</Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: 20, paddingTop: 8 },
  back: { fontSize: 16, color: Colors.primary, fontWeight: '600', marginBottom: 12 },
  heading: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  errorEmoji: { fontSize: 56, marginBottom: 12 },
  errorTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  errorText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  backBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28 },
  backBtnText: { fontSize: 15, fontWeight: '700', color: Colors.white },
  content: { padding: 20, gap: 16 },
  heroCard: { backgroundColor: Colors.white, borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: Colors.border, gap: 10 },
  avatarCircle: { marginBottom: 4 },
  name: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  badge: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 },
  badgeVerified: { backgroundColor: '#D1FAE5' },
  badgeUnverified: { backgroundColor: '#F3F4F6' },
  badgeText: { fontSize: 13, fontWeight: '700' },
  badgeTextVerified: { color: '#059669' },
  badgeTextUnverified: { color: '#6B7280' },
  memberSince: { fontSize: 13, color: Colors.textSecondary },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, backgroundColor: Colors.white, borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: Colors.border, gap: 6 },
  statNumber: { fontSize: 28, fontWeight: '900', color: Colors.primary },
  statLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600', textAlign: 'center', lineHeight: 16 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, paddingHorizontal: 2 },
  bookingCard: { backgroundColor: Colors.white, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, padding: 16, gap: 10 },
  bookingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  bookingStatus: { fontSize: 13, fontWeight: '700' },
  bookingDetail: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bookingIcon: { fontSize: 16, width: 24, textAlign: 'center' },
  bookingDetailText: { fontSize: 14, color: Colors.textSecondary },
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badgeCell: { width: '47%', borderRadius: 14, padding: 14, gap: 4 },
  badgeCellEmoji: { fontSize: 22 },
  badgeCellLabel: { fontSize: 13, fontWeight: '700' },
  badgeCellDesc: { fontSize: 11, color: '#6B7280', lineHeight: 15, marginTop: 2 },
  infoCard: { backgroundColor: Colors.white, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  infoIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  infoLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600', marginBottom: 2 },
  infoValue: { fontSize: 15, color: Colors.textPrimary, fontWeight: '500' },
  infoDivider: { height: 1, backgroundColor: Colors.border, marginLeft: 54 },
});
