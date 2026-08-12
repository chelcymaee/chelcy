import { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  TextInput, ScrollView,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';
import { submitTravellerReview } from '../../src/lib/review-service';
import { useSelectedHost } from '../../src/lib/host-context';

const CATEGORIES = [
  { key: 'rating_respectful',    label: 'Respectful',        emoji: '🤝' },
  { key: 'rating_on_time',       label: 'On time',           emoji: '⏰' },
  { key: 'rating_communication', label: 'Easy communication', emoji: '💬' },
];

const RATING_LABELS = ['', 'Poor', 'Not great', 'Okay', 'Good', 'Excellent'];

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <TouchableOpacity key={s} onPress={() => onChange(s)}
          // @ts-ignore
          onClick={() => onChange(s)}>
          <Text style={{ fontSize: 28, color: s <= value ? Colors.star : Colors.border }}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function ReviewTraveller() {
  const { travellerId, travellerName, bookingId } = useLocalSearchParams<{
    travellerId: string; travellerName: string; bookingId: string;
  }>();

  // Booking-specific, not selected-listing-specific: a host can open this
  // from either listing's Reviews tab, and the write below must always be
  // stamped with the booking's own host_id — never merely whichever
  // listing happens to be selected on Dashboard. Same pattern as
  // traveller-profile.tsx / review-detail.tsx.
  const { hosts, loading: hostContextLoading } = useSelectedHost();

  const [ratings, setRatings] = useState<Record<string, number>>({
    rating_respectful: 0,
    rating_on_time: 0,
    rating_communication: 0,
  });
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const allRated = Object.values(ratings).every(v => v > 0);
  const goBack = () => router.replace('/(host)/requests');

  // Guard: params must come from navigation — direct URL access loses them
  if (!bookingId || !travellerId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={{ fontSize: 40, marginBottom: 16 }}>⚠️</Text>
          <Text style={{ fontSize: 17, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 }}>
            Missing booking info
          </Text>
          <Text style={{ fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginBottom: 24, paddingHorizontal: 32 }}>
            Please open this page from the Requests screen, not directly via URL.
          </Text>
          <TouchableOpacity onPress={goBack}
            // @ts-ignore
            onClick={goBack}>
            <Text style={{ fontSize: 15, color: Colors.primary, fontWeight: '600' }}>← Back to Requests</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  async function submit() {
    setError('');
    if (!allRated) { setError('Please rate all three categories.'); return; }

    setSubmitting(true);
    try {
      if (!isSupabaseConfigured) {
        setSuccess(true);
        setTimeout(goBack, 2000);
        return;
      }

      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr) console.error('[ReviewTraveller] auth error:', authErr);
      if (!user) { setError('Not signed in.'); return; }

      if (hostContextLoading) {
        setError('Still loading your listings — please try again in a moment.');
        return;
      }

      // Resolve the booking's own host_id directly — not "whichever
      // listing this account's ambiguous single-row lookup happened to
      // return" (that lookup threw PGRST116 for any multi-listing
      // account, and even single-listing it never actually verified the
      // booking belonged to that host). A review must always be stamped
      // with the listing the booking actually happened at.
      const { data: bookingRow, error: bookingErr } = await supabase
        .from('bookings')
        .select('id, host_id')
        .eq('id', bookingId)
        .eq('traveller_id', travellerId)
        .single();
      if (bookingErr) console.error('[ReviewTraveller] booking lookup error:', bookingErr);
      if (!bookingRow) { setError('Booking not found.'); return; }

      // Security: verify the booking's host_id is one of THIS user's
      // owned listings (any of them) — HostProvider's hosts array is the
      // source of truth for ownership, same as every other migrated
      // screen.
      const hostRow = hosts.find(h => h.id === bookingRow.host_id);
      if (!hostRow) { setError('Host profile not found.'); return; }

      const result = await submitTravellerReview({
        reviewerId: user.id,
        hostId: hostRow.id,
        hostName: hostRow.display_name ?? '',
        travellerId,
        bookingId,
        ratings: {
          rating_respectful: ratings.rating_respectful,
          rating_on_time: ratings.rating_on_time,
          rating_communication: ratings.rating_communication,
        },
        comment,
      });

      if (!result.success) {
        if (result.alreadyReviewed) {
          setError('You have already reviewed this traveller for this booking.');
        } else {
          setError(result.error ?? 'Could not submit review. Please try again.');
        }
        return;
      }

      setSuccess(true);
      setTimeout(goBack, 2000);
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.successEmoji}>🙏</Text>
          <Text style={styles.successTitle}>Review submitted!</Text>
          <Text style={styles.successSub}>Thanks for helping build trust in the Cubby community.</Text>
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

        <Text style={styles.heading}>Review your traveller</Text>
        <Text style={styles.sub}>{travellerName ?? 'This traveller'}</Text>
        <Text style={styles.note}>
          These reviews are private and help Cubby maintain a trustworthy community.
          Do not include personal information.
        </Text>

        <View style={styles.categoriesBox}>
          {CATEGORIES.map((cat, idx) => (
            <View key={cat.key} style={[styles.catRow, idx < CATEGORIES.length - 1 && styles.catRowBorder]}>
              <View style={{ marginBottom: 8 }}>
                <Text style={styles.catLabel}>{cat.emoji} {cat.label}</Text>
                {ratings[cat.key] > 0 && (
                  <Text style={styles.catHint}>{RATING_LABELS[ratings[cat.key]]}</Text>
                )}
              </View>
              <StarPicker
                value={ratings[cat.key]}
                onChange={v => setRatings(prev => ({ ...prev, [cat.key]: v }))}
              />
            </View>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Any comments? (optional)</Text>
        <TextInput
          style={styles.textArea}
          value={comment}
          onChangeText={setComment}
          placeholder="Anything helpful for other hosts? Keep it respectful and factual."
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
          style={[styles.btn, (!allRated || submitting) && styles.btnDisabled]}
          onPress={submit}
          // @ts-ignore
          onClick={submit}
          disabled={!allRated || submitting}
        >
          <Text style={styles.btnText}>{submitting ? 'Submitting…' : 'Submit review'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  inner: { padding: 24, paddingTop: 28, paddingBottom: 48 },
  back: { fontSize: 15, color: Colors.textSecondary, marginBottom: 24 },
  heading: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  sub: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
  note: { fontSize: 13, color: Colors.textLight, marginBottom: 28, lineHeight: 19 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 10 },
  categoriesBox: {
    backgroundColor: Colors.white, borderRadius: 14, borderWidth: 1,
    borderColor: Colors.border, paddingHorizontal: 16, marginBottom: 24,
  },
  catRow: { paddingVertical: 16 },
  catRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  catLabel: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  catHint: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
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
  successEmoji: { fontSize: 64, marginBottom: 20 },
  successTitle: { fontSize: 28, fontWeight: '900', color: Colors.textPrimary, marginBottom: 10 },
  successSub: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24 },
});
