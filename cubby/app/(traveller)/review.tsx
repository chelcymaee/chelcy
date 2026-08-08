import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  TextInput, ScrollView, ActivityIndicator, Animated,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../src/constants/colors';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';
import { submitHostReview } from '../../src/lib/review-service';

const TAGS = ['Great location', 'Friendly host', 'Secure storage', 'Easy to find', 'Quick response', 'Would return'];
const RATING_LABELS = ['', 'Poor experience', 'Not great', 'It was okay', 'Really good!', 'Outstanding! 🎉'];

const CATEGORIES: { key: string; label: string; emoji: string }[] = [
  { key: 'rating_friendliness', label: 'Friendliness', emoji: '😊' },
  { key: 'rating_location',     label: 'Location accuracy', emoji: '📍' },
  { key: 'rating_drop_off',     label: 'Ease of drop-off', emoji: '🧳' },
  { key: 'rating_security',     label: 'Security', emoji: '🔒' },
];

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <TouchableOpacity key={s} onPress={() => onChange(s)}
          // @ts-ignore
          onClick={() => onChange(s)}>
          <Text style={{ fontSize: 22, color: s <= value ? Colors.star : Colors.border }}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function Review() {
  const { hostName, hostId, bookingId } = useLocalSearchParams<{
    hostName: string; hostId: string; bookingId: string;
  }>();

  const [rating, setRating] = useState(0);
  const [categoryRatings, setCategoryRatings] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [checking, setChecking] = useState(!!bookingId);
  const successOpacity = useRef(new Animated.Value(0)).current;
  const successY = useRef(new Animated.Value(20)).current;
  const successScale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (!success) return;
    Animated.parallel([
      Animated.timing(successOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(successY, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 8 }),
      Animated.spring(successScale, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 14 }),
    ]).start();
  }, [success]);

  useEffect(() => {
    if (!bookingId || !isSupabaseConfigured) { setChecking(false); return; }
    (async () => {
      try {
        const { data: booking } = await supabase
          .from('bookings').select('status').eq('id', bookingId).single();
        if (booking?.status === 'cancelled') {
          setError('Reviews are not allowed for cancelled bookings.');
          setChecking(false);
          return;
        }
        const { data: existing } = await supabase
          .from('reviews').select('id').eq('booking_id', bookingId).maybeSingle();
        if (existing) setAlreadyReviewed(true);
      } finally {
        setChecking(false);
      }
    })();
  }, [bookingId]);

  function toggleTag(tag: string) {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }

  function setCat(key: string, val: number) {
    setCategoryRatings(prev => ({ ...prev, [key]: val }));
  }

  async function submit() {
    setError('');
    if (rating === 0) { setError('Please select an overall star rating.'); return; }

    setSubmitting(true);
    try {
      if (isSupabaseConfigured) {
        const { data: { user }, error: authErr } = await supabase.auth.getUser();
        if (authErr) console.error('[Review] auth error:', authErr);
        if (!user) { setError('You need to be signed in to leave a review.'); return; }

        // Self-read only (auth.uid() = id) — same query as before, just
        // widened to also grab avatar_url so it can be snapshotted onto the
        // review row, same pattern as reviewer_name. No new cross-user access.
        const { data: profile } = await supabase
          .from('profiles').select('full_name, avatar_url').eq('id', user.id).single();
        const reviewerName = profile?.full_name?.trim() || user.email?.split('@')[0] || 'Anonymous';

        const result = await submitHostReview({
          userId: user.id,
          reviewerName,
          reviewerAvatarUrl: profile?.avatar_url ?? null,
          hostId,
          bookingId,
          rating,
          categoryRatings,
          comment,
          tags: selectedTags,
        });

        if (!result.success) {
          if (result.alreadyReviewed) { setAlreadyReviewed(true); return; }
          setError(result.error ?? 'Could not submit review. Please try again.');
          return;
        }

        setSuccess(true);
        setTimeout(() => router.replace('/(traveller)/bookings'), 2000);
        return;
      }

      // Demo/offline mode
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

  if (checking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><ActivityIndicator color={Colors.primary} size="large" /></View>
      </SafeAreaView>
    );
  }

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <Animated.View style={[styles.successScreen, { opacity: successOpacity, transform: [{ translateY: successY }] }]}>
          <Animated.Text style={[styles.successEmoji, { transform: [{ scale: successScale }] }]}>🙏</Animated.Text>
          <Text style={styles.successTitle}>Thank you!</Text>
          <Text style={styles.successSub}>Your review helps other travellers find great storage.</Text>
        </Animated.View>
      </SafeAreaView>
    );
  }

  if (alreadyReviewed) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successScreen}>
          <Text style={styles.successEmoji}>✅</Text>
          <Text style={styles.successTitle}>Already reviewed</Text>
          <Text style={styles.successSub}>You've already left a review for this booking.</Text>
          <TouchableOpacity style={[styles.btn, { marginTop: 24, paddingHorizontal: 32 }]} onPress={goBack}
            // @ts-ignore
            onClick={goBack}>
            <Text style={styles.btnText}>Back to bookings</Text>
          </TouchableOpacity>
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

        {/* Overall stars */}
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

        {/* Category ratings */}
        <Text style={styles.sectionLabel}>Rate specific aspects (optional)</Text>
        <View style={styles.categoriesBox}>
          {CATEGORIES.map(cat => (
            <View key={cat.key} style={styles.categoryRow}>
              <Text style={styles.categoryLabel}>{cat.emoji} {cat.label}</Text>
              <StarPicker value={categoryRatings[cat.key] ?? 0} onChange={v => setCat(cat.key, v)} />
            </View>
          ))}
        </View>

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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  inner: { padding: 24, paddingTop: 28 },
  back: { fontSize: 15, color: Colors.textSecondary, marginBottom: 24 },
  heading: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  sub: { fontSize: 15, color: Colors.textSecondary, marginBottom: 28 },
  starsRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 8 },
  star: { fontSize: 44, color: Colors.border },
  starActive: { color: Colors.star },
  ratingLabel: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center', marginBottom: 28 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 10 },
  categoriesBox: {
    backgroundColor: Colors.white, borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 16, paddingVertical: 4, marginBottom: 20, gap: 0,
  },
  categoryRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  categoryLabel: { fontSize: 14, color: Colors.textPrimary, fontWeight: '500' },
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
    backgroundColor: Colors.errorBg, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#FECACA', marginBottom: 16,
  },
  errorText: { fontSize: 14, color: Colors.error, fontWeight: '600', textAlign: 'center' },
  btn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
  successScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  successEmoji: { fontSize: 64, marginBottom: 20 },
  successTitle: { fontSize: 28, fontWeight: '900', color: Colors.textPrimary, marginBottom: 10 },
  successSub: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24 },
});
