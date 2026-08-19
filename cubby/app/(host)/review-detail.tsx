/**
 * Host views a review they received from a traveller.
 * Fetches from reviews table where booking_id matches
 * and verifies the booking belongs to the current host.
 */
import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { Radius, CardShadow, Spacing } from '../../src/constants/theme';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';
import { Stars } from '../../src/components/Stars';
import { useSelectedHost } from '../../src/lib/host-context';
import ReportReasonModal from '../../src/components/ReportReasonModal';
import { reportContent, blockUser } from '../../src/lib/moderation-service';

const RATING_LABELS = ['', 'Poor', 'Not great', 'Okay', 'Really good', 'Outstanding'];

interface HostReview {
  id: string;
  reviewer_id: string;
  reviewer_name: string;
  rating: number;
  comment: string | null;
  tags: string[];
  rating_friendliness: number | null;
  rating_location: number | null;
  rating_drop_off: number | null;
  rating_security: number | null;
  created_at: string;
}

interface BookingContext {
  drop_off_date: string;
  pick_up_date?: string;
  bag_count: number;
}

const CATEGORY_LABELS: { key: keyof HostReview; emoji: string; label: string }[] = [
  { key: 'rating_friendliness', emoji: '😊', label: 'Friendliness' },
  { key: 'rating_location',     emoji: '📍', label: 'Location accuracy' },
  { key: 'rating_drop_off',     emoji: '🧳', label: 'Ease of drop-off' },
  { key: 'rating_security',     emoji: '🔒', label: 'Security' },
];

export default function HostReviewDetail() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();

  // Booking-specific, not selected-listing-specific: this screen is
  // addressed by a specific bookingId, and a host should be able to open
  // it from either listing regardless of what's currently selected on
  // Dashboard — same pattern as traveller-profile.tsx.
  const { hosts, loading: hostContextLoading } = useSelectedHost();

  const [review, setReview] = useState<HostReview | null>(null);
  const [booking, setBooking] = useState<BookingContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const goBack = () => router.replace('/(host)/requests');

  function showReviewActions() {
    if (!review) return;
    Alert.alert(
      review.reviewer_name ?? 'Review options',
      undefined,
      [
        { text: 'Report review', onPress: () => setReportModalVisible(true) },
        { text: `Block ${review.reviewer_name ?? 'this user'}`, style: 'destructive', onPress: handleBlockReviewer },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }

  async function handleReportReview(reason: string) {
    if (!review) return;
    setReportSubmitting(true);
    const result = await reportContent('host_review', review.id, reason);
    setReportSubmitting(false);
    setReportModalVisible(false);
    if (result.ok) {
      Alert.alert('Report submitted', "Thanks — we'll take a look at this.");
    } else {
      Alert.alert('Could not submit report', 'Please try again in a moment.');
    }
  }

  async function handleBlockReviewer() {
    if (!review || !currentUserId) return;
    const result = await blockUser(currentUserId, review.reviewer_id);
    if (result.ok) {
      // Don't leave the blocked person's review sitting on screen — the
      // underlying row isn't deleted, this is just navigating away from
      // it immediately rather than requiring a reload to notice the block.
      Alert.alert(
        'User blocked',
        `You won't receive further messages from ${review.reviewer_name ?? 'this user'}.`,
        [{ text: 'OK', onPress: goBack }]
      );
    } else {
      Alert.alert('Could not block this user', result.error ?? 'Please try again.');
    }
  }

  useEffect(() => {
    if (!bookingId || !isSupabaseConfigured) {
      setError('No booking reference provided.');
      setLoading(false);
      return;
    }
    setReview(null);
    setBooking(null);
    setError('');
    setLoading(true);
    load();
    // hostContextLoading added so a mount that races ahead of HostProvider
    // resolving retries once the owned-listings array is ready, same as
    // traveller-profile.tsx.
  }, [bookingId, hostContextLoading]);

  async function load() {
    // HostProvider itself still resolving — wait rather than briefly
    // treating "not loaded yet" as "no permission".
    if (hostContextLoading) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Please sign in to view this review.'); return; }
      setCurrentUserId(user.id);

      const { data: rev, error: revErr } = await supabase
        .from('reviews')
        .select(`
          id, reviewer_id, reviewer_name, rating, comment, tags,
          rating_friendliness, rating_location, rating_drop_off, rating_security,
          created_at, host_id
        `)
        .eq('booking_id', bookingId)
        .single();

      if (revErr || !rev) {
        setError('Review not found. It may have been removed.');
        return;
      }

      // Security: verify this review belongs to one of THIS user's owned
      // listings (any of them, not just the currently selected one) —
      // HostProvider's hosts array, already verified against auth.uid(),
      // is the source of truth for ownership here, same as every other
      // migrated screen. (Previously compared against a single ambiguous
      // `.eq('assigned_user_id', user.id).single()` lookup, which threw
      // PGRST116 the instant an account owned more than one listing.)
      if (!hosts.some(h => h.id === rev.host_id)) {
        setError('You do not have permission to view this review.');
        return;
      }

      setReview(rev);

      const { data: bk } = await supabase
        .from('bookings')
        .select('drop_off_date, pick_up_date, bag_count')
        .eq('id', bookingId)
        .single();
      if (bk) setBooking(bk);

    } catch {
      setError('Something went wrong loading this review.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><ActivityIndicator color={Colors.primary} size="large" /></View>
      </SafeAreaView>
    );
  }

  if (error || !review) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={{ fontSize: 40, marginBottom: 16 }}>🔍</Text>
          <Text style={styles.errorTitle}>{error || 'Review not found'}</Text>
          <TouchableOpacity style={styles.backBtn} onPress={goBack}
            // @ts-ignore
            onClick={goBack}>
            <Text style={styles.backBtnText}>← Back to Requests</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const dateStr = new Date(review.created_at).toLocaleDateString('en-ZA', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const activeCats = CATEGORY_LABELS.filter(c => (review[c.key] as number | null) != null && (review[c.key] as number) > 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={goBack}
            // @ts-ignore
            onClick={goBack}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
          {review.reviewer_id && review.reviewer_id !== currentUserId && (
            <TouchableOpacity onPress={showReviewActions}
              // @ts-ignore
              onClick={showReviewActions}>
              <Text style={styles.menuBtn}>•••</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.heading}>New review</Text>
        <Text style={styles.sub}>From {review.reviewer_name}</Text>

        {/* Overall rating hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroStars}>
            <Stars value={review.rating} size={36} />
          </View>
          <Text style={styles.heroRating}>{review.rating}/5</Text>
          <Text style={styles.heroLabel}>{RATING_LABELS[review.rating] ?? 'Good'}</Text>
          <Text style={styles.heroDate}>Submitted {dateStr}</Text>
        </View>

        {/* Written comment */}
        {!!review.comment && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>What they said</Text>
            <Text style={styles.comment}>"{review.comment}"</Text>
          </View>
        )}

        {/* Quick tags */}
        {review.tags?.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Tags</Text>
            <View style={styles.tagsRow}>
              {review.tags.map(tag => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Category ratings */}
        {activeCats.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Category ratings</Text>
            {activeCats.map((cat, idx) => (
              <View key={cat.key as string} style={[styles.catRow, idx < activeCats.length - 1 && styles.catBorder]}>
                <Text style={styles.catLabel}>{cat.emoji} {cat.label}</Text>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <Stars value={review[cat.key] as number} size={15} />
                  <Text style={styles.catValue}>{RATING_LABELS[review[cat.key] as number]}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Booking context */}
        {booking && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Booking details</Text>
            <Text style={styles.contextItem}>📅 Drop-off: {booking.drop_off_date}</Text>
            {booking.pick_up_date && (
              <Text style={styles.contextItem}>📅 Pick-up: {booking.pick_up_date}</Text>
            )}
            <Text style={styles.contextItem}>🧳 {booking.bag_count} bag{booking.bag_count !== 1 ? 's' : ''}</Text>
          </View>
        )}

        <View style={styles.noteCard}>
          <Text style={styles.noteText}>
            ✨ Great reviews help you attract more travellers. Keep up the good work!
          </Text>
        </View>
      </ScrollView>

      <ReportReasonModal
        visible={reportModalVisible}
        submitting={reportSubmitting}
        onSelect={handleReportReview}
        onClose={() => setReportModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  inner: { padding: Spacing.xl, paddingTop: 28, paddingBottom: 48 },
  back: { fontSize: 15, color: Colors.primary, fontWeight: '600' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  menuBtn: { fontSize: 18, color: Colors.textLight, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 4 },
  heading: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  sub: { fontSize: 16, color: Colors.textSecondary, marginBottom: 24 },

  heroCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    ...CardShadow,
  },
  heroStars: { marginBottom: 8 },
  heroRating: { fontSize: 36, fontWeight: '900', color: Colors.textPrimary, marginBottom: 2 },
  heroLabel: { fontSize: 16, fontWeight: '700', color: Colors.textSecondary, marginBottom: 8 },
  heroDate: { fontSize: 12, color: Colors.textLight },

  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 16,
    marginBottom: 16,
    ...CardShadow,
  },
  cardTitle: {
    fontSize: 13, fontWeight: '700', color: Colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14,
  },

  comment: { fontSize: 15, color: Colors.textPrimary, lineHeight: 22, fontStyle: 'italic' },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: Colors.successBg, borderWidth: 1, borderColor: '#BBF7D0',
  },
  tagText: { fontSize: 13, fontWeight: '600', color: Colors.successText },

  catRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  catBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  catLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  catValue: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },

  contextItem: { fontSize: 14, color: Colors.textSecondary, marginBottom: 6 },

  noteCard: {
    backgroundColor: Colors.successBg,
    borderRadius: Radius.sm,
    padding: 14,
    marginBottom: 8,
  },
  noteText: { fontSize: 13, color: Colors.successText, lineHeight: 19 },

  errorTitle: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', marginBottom: 24 },
  backBtn: { paddingVertical: 12, paddingHorizontal: 24 },
  backBtnText: { fontSize: 15, color: Colors.primary, fontWeight: '600' },
});
