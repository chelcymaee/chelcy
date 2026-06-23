import { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  TextInput, ScrollView,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../src/constants/colors';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';

const TAGS = ['Great location', 'Friendly host', 'Secure storage', 'Easy to find', 'Quick response', 'Would return'];

const RATING_LABELS = ['', 'Poor experience', 'Not great', 'It was okay', 'Really good!', 'Outstanding! 🎉'];

export default function Review() {
  const { hostName, hostId, bookingId } = useLocalSearchParams<{
    hostName: string; hostId: string; bookingId: string;
  }>();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  function toggleTag(tag: string) {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }

  async function submit() {
    setError('');
    if (rating === 0) { setError('Please select a star rating.'); return; }

    setSubmitting(true);
    try {
      if (isSupabaseConfigured) {
        // Get the authenticated user for reviewer_id and name
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setError('You need to be signed in to leave a review.'); return; }

        // Fetch reviewer display name from profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        const reviewerName = profile?.full_name?.trim() || user.email?.split('@')[0] || 'Anonymous';

        // If we have a bookingId, check for duplicate (UNIQUE constraint on booking_id catches this
        // at DB level too, but show a friendly message here)
        if (bookingId) {
          const { data: existing } = await supabase
            .from('reviews')
            .select('id')
            .eq('booking_id', bookingId)
            .maybeSingle();
          if (existing) {
            setError('You have already reviewed this booking.');
            return;
          }
        }

        const reviewRow: Record<string, any> = {
          reviewer_id: user.id,
          host_id: hostId,
          reviewer_name: reviewerName,
          rating,
          comment: comment.trim() || null,
          tags: selectedTags,
        };
        if (bookingId) reviewRow.booking_id = bookingId;

        const { error: insertError } = await supabase.from('reviews').insert(reviewRow);

        if (insertError) {
          // Unique violation = already reviewed
          if (insertError.code === '23505') {
            setError('You have already reviewed this booking.');
          } else {
            setError('Could not submit review. Please try again.');
          }
          return;
        }

        // rating + review_count are updated automatically by DB trigger
        setSuccess(true);
        setTimeout(() => router.replace('/(traveller)/bookings'), 2000);
        return;
      }

      // Demo/offline mode — AsyncStorage only
      const key = `cubby_reviews_${hostId ?? hostName}`;
      const existing = await AsyncStorage.getItem(key);
      const reviews = existing ? JSON.parse(existing) : [];
      reviews.unshift({
        id: Date.now().toString(),
        reviewer_name: 'You',
        rating,
        comment: comment.trim() || null,
        tags: selectedTags,
        created_at: new Date().toISOString(),
      });
      await AsyncStorage.setItem(key, JSON.stringify(reviews));
      setSuccess(true);
      setTimeout(() => router.replace('/(traveller)/bookings'), 2000);
    } finally {
      setSubmitting(false);
    }
  }

  const goBack = () => router.replace('/(traveller)/bookings');

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successScreen}>
          <Text style={styles.successEmoji}>🙏</Text>
          <Text style={styles.successTitle}>Thank you!</Text>
          <Text style={styles.successSub}>Your review helps other travellers find great storage.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={goBack}
          // @ts-ignore
          onClick={goBack}>
          <Text style={styles.back}>← Skip for now</Text>
        </TouchableOpacity>

        <Text style={styles.heading}>How was your experience?</Text>
        <Text style={styles.sub}>Reviewing {hostName ?? 'your host'}</Text>

        {/* Stars */}
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map(s => (
            <TouchableOpacity key={s} onPress={() => setRating(s)}
              // @ts-ignore
              onClick={() => setRating(s)}>
              <Text style={[styles.star, s <= rating && styles.starActive]}>★</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.ratingLabel}>{rating === 0 ? 'Tap to rate' : RATING_LABELS[rating]}</Text>

        {/* Quick tags */}
        <Text style={styles.sectionLabel}>What stood out? (optional)</Text>
        <View style={styles.tagsRow}>
          {TAGS.map(tag => (
            <TouchableOpacity
              key={tag}
              style={[styles.tag, selectedTags.includes(tag) && styles.tagActive]}
              onPress={() => toggleTag(tag)}
              // @ts-ignore
              onClick={() => toggleTag(tag)}
            >
              <Text style={[styles.tagText, selectedTags.includes(tag) && styles.tagTextActive]}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Written review */}
        <Text style={styles.sectionLabel}>Tell us more (optional)</Text>
        <TextInput
          style={styles.textArea}
          value={comment}
          onChangeText={setComment}
          placeholder="What was the experience like? Would you recommend this host?"
          placeholderTextColor={Colors.textLight}
          multiline
          numberOfLines={4}
        />

        {!!error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.btn, (rating === 0 || submitting) && styles.btnDisabled]}
          onPress={submit}
          // @ts-ignore
          onClick={submit}
          disabled={rating === 0 || submitting}
        >
          <Text style={styles.btnText}>{submitting ? 'Submitting…' : 'Submit review'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { padding: 24, paddingTop: 28 },
  back: { fontSize: 15, color: Colors.textSecondary, marginBottom: 24 },
  heading: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  sub: { fontSize: 15, color: Colors.textSecondary, marginBottom: 28 },
  starsRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 8 },
  star: { fontSize: 44, color: Colors.border },
  starActive: { color: Colors.star },
  ratingLabel: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center', marginBottom: 28 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 10 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  tag: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border,
  },
  tagActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tagText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  tagTextActive: { color: Colors.white },
  textArea: {
    backgroundColor: Colors.white, borderRadius: 14, borderWidth: 1.5,
    borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: Colors.textPrimary, height: 110, textAlignVertical: 'top', marginBottom: 24,
  },
  errorBanner: {
    backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#FECACA', marginBottom: 16,
  },
  errorText: { fontSize: 14, color: '#B91C1C', fontWeight: '600', textAlign: 'center' },
  btn: { backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontSize: 17, fontWeight: '700', color: Colors.white },
  successScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  successEmoji: { fontSize: 64, marginBottom: 20 },
  successTitle: { fontSize: 28, fontWeight: '900', color: Colors.textPrimary, marginBottom: 10 },
  successSub: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24 },
});
