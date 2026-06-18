import { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../src/constants/colors';

const TAGS = ['Great location', 'Friendly host', 'Secure storage', 'Easy to find', 'Quick response', 'Would return'];

export default function Review() {
  const { hostName, hostId } = useLocalSearchParams<{ hostName: string; hostId: string }>();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  function toggleTag(tag: string) {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }

  async function submit() {
    if (rating === 0) {
      Alert.alert('Please give a star rating');
      return;
    }

    const key = `cubby_reviews_${hostId ?? hostName}`;
    const existing = await AsyncStorage.getItem(key);
    const reviews = existing ? JSON.parse(existing) : [];
    reviews.unshift({
      id: Date.now().toString(),
      reviewer_name: 'You',
      rating,
      comment,
      tags: selectedTags,
      created_at: new Date().toISOString(),
    });
    await AsyncStorage.setItem(key, JSON.stringify(reviews));

    Alert.alert('Review submitted! 🙏', 'Thank you — your review helps other travellers.', [
      { text: 'OK', onPress: () => router.replace('/(traveller)/explore') }
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(traveller)/explore')}>
          <Text style={styles.back}>← Skip for now</Text>
        </TouchableOpacity>

        <Text style={styles.heading}>How was your experience?</Text>
        <Text style={styles.sub}>Reviewing {hostName ?? 'your host'}</Text>

        {/* Stars */}
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map(s => (
            <TouchableOpacity key={s} onPress={() => setRating(s)}>
              <Text style={[styles.star, s <= rating && styles.starActive]}>★</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.ratingLabel}>
          {rating === 0 ? 'Tap to rate' : rating === 5 ? 'Outstanding! 🎉' : rating === 4 ? 'Really good!' : rating === 3 ? 'It was okay' : rating === 2 ? 'Not great' : 'Poor experience'}
        </Text>

        {/* Quick tags */}
        <Text style={styles.sectionLabel}>What stood out?</Text>
        <View style={styles.tagsRow}>
          {TAGS.map(tag => (
            <TouchableOpacity
              key={tag}
              style={[styles.tag, selectedTags.includes(tag) && styles.tagActive]}
              onPress={() => toggleTag(tag)}
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

        <TouchableOpacity style={[styles.btn, rating === 0 && styles.btnDisabled]} onPress={submit} disabled={rating === 0}>
          <Text style={styles.btnText}>Submit review</Text>
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
  btn: { backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontSize: 17, fontWeight: '700', color: Colors.white },
});
