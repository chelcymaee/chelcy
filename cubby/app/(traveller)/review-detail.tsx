/**
 * Traveller views a review they received from a host.
 * Fetches from traveller_reviews where booking_id matches
 * and verifies traveller_id === auth.uid() for security.
 */
import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { Radius, CardShadow, Spacing } from '../../src/constants/theme';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';
import { Stars } from '../../src/components/Stars';

const RATING_LABELS = ['', 'Poor', 'Not great', 'Okay', 'Good', 'Excellent'];

interface TravellerReview {
  id: string;
  host_name: string;
  rating_respectful: number;
  rating_on_time: number;
  rating_communication: number;
  comment: string | null;
  created_at: string;
}

interface BookingContext {
  drop_off_date: string;
  pick_up_date?: string;
  bag_count: number;
}

export default function TravellerReviewDetail() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [review, setReview] = useState<TravellerReview | null>(null);
  const [booking, setBooking] = useState<BookingContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const goBack = () => router.replace('/(traveller)/bookings');

  useEffect(() => {
    if (!bookingId || !isSupabaseConfigured) {
      setError('No booking reference provided.');
      setLoading(false);
      return;
    }
    load();
  }, [bookingId]);

  async function load() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Please sign in to view this review.'); return; }

      const { data: rev, error: revErr } = await supabase
        .from('traveller_reviews')
        .select('id, host_name, rating_respectful, rating_on_time, rating_communication, comment, created_at, traveller_id')
        .eq('booking_id', bookingId)
        .single();

      if (revErr || !rev) {
        setError('Review not found. It may have been removed.');
        return;
      }

      // Security: verify this review belongs to the current user
      if (rev.traveller_id !== user.id) {
        setError('You do not have permission to view this review.');
        return;
      }

      setReview(rev);

      // Fetch booking context (non-fatal)
      const { data: bk } = await supabase
        .from('bookings')
        .select('drop_off_date, pick_up_date, bag_count')
        .eq('id', bookingId)
        .single();
      if (bk) setBooking(bk);

    } catch (e) {
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
            <Text style={styles.backBtnText}>← Back to Bookings</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const avg = Math.round(
    (review.rating_respectful + review.rating_on_time + review.rating_communication) / 3
  );
  const dateStr = new Date(review.created_at).toLocaleDateString('en-ZA', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={goBack}
          // @ts-ignore
          onClick={goBack}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.heading}>Your review</Text>
        <Text style={styles.sub}>From {review.host_name}</Text>

        {/* Overall rating hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroStars}>
            <Stars value={avg} size={32} />
          </View>
          <Text style={styles.heroRating}>{avg}/5</Text>
          <Text style={styles.heroLabel}>{RATING_LABELS[avg] ?? 'Good'}</Text>
          <Text style={styles.heroDate}>Submitted {dateStr}</Text>
        </View>

        {/* Category breakdown */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Category ratings</Text>
          {[
            { emoji: '🤝', label: 'Respectful', value: review.rating_respectful },
            { emoji: '⏰', label: 'On time', value: review.rating_on_time },
            { emoji: '💬', label: 'Easy communication', value: review.rating_communication },
          ].map((cat, idx, arr) => (
            <View key={cat.label} style={[styles.catRow, idx < arr.length - 1 && styles.catBorder]}>
              <Text style={styles.catLabel}>{cat.emoji} {cat.label}</Text>
              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                <Stars value={cat.value} size={16} />
                <Text style={styles.catValue}>{RATING_LABELS[cat.value]}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Written comment */}
        {!!review.comment && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Comment</Text>
            <Text style={styles.comment}>"{review.comment}"</Text>
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
            🔒 This review is private and only visible to Cubby. It helps hosts choose trustworthy travellers.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  inner: { padding: Spacing.xl, paddingTop: 28, paddingBottom: 48 },
  back: { fontSize: 15, color: Colors.primary, fontWeight: '600', marginBottom: 24 },
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
  cardTitle: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 },

  catRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  catBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  catLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  catValue: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },

  comment: { fontSize: 15, color: Colors.textPrimary, lineHeight: 22, fontStyle: 'italic' },

  contextItem: { fontSize: 14, color: Colors.textSecondary, marginBottom: 6 },

  noteCard: {
    backgroundColor: Colors.infoBg,
    borderRadius: Radius.sm,
    padding: 14,
    marginBottom: 8,
  },
  noteText: { fontSize: 13, color: Colors.infoText, lineHeight: 19 },

  errorTitle: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', marginBottom: 24 },
  backBtn: { paddingVertical: 12, paddingHorizontal: 24 },
  backBtnText: { fontSize: 15, color: Colors.primary, fontWeight: '600' },
});
