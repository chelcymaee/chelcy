import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native';

async function completeOnboarding() {
  await AsyncStorage.setItem('cubby_onboarded', 'true');
  router.replace('/');
}

// ─── Slide 1: Got bags? Cubby it! ─────────────────────────────────────────────
function Slide1() {
  return (
    <View style={slideStyles.slide}>
      <View style={slideStyles.illustrationBg}>
        <Text style={slideStyles.illustrationEmojis}>🧳👜🎒</Text>
      </View>
      <View style={slideStyles.content}>
        <Text style={slideStyles.heading}>{'Got bags?\nCubby it!'}</Text>
        <Text style={slideStyles.sub}>
          Luggage storage in cafés, hotels and guesthouses near you.
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={slideStyles.pillsScroll} contentContainerStyle={slideStyles.pillsContent}>
          <View style={slideStyles.trustPill}><Text style={slideStyles.trustPillText}>✓ 100% Secure storage</Text></View>
          <View style={slideStyles.trustPill}><Text style={slideStyles.trustPillText}>✓ R2,000 per bag coverage</Text></View>
        </ScrollView>
      </View>
    </View>
  );
}

// ─── Slide 2: How to Cubby in 3 steps ─────────────────────────────────────────
function Slide2() {
  const steps = [
    { num: '①', text: 'Find and book affordable luggage storage near you' },
    { num: '②', text: 'Drop your bags at a verified host' },
    { num: '③', text: 'Get your PIN and explore the city, bag-free!' },
  ];
  return (
    <View style={slideStyles.slide}>
      <View style={slideStyles.illustrationBg}>
        <Text style={slideStyles.illustrationEmojis}>📍🧳✅</Text>
      </View>
      <View style={slideStyles.content}>
        <Text style={slideStyles.heading}>{'How to Cubby,\nin 3 steps!'}</Text>
        <View style={slideStyles.stepsCard}>
          {steps.map((step, i) => (
            <View key={i} style={[slideStyles.stepRow, i < steps.length - 1 && slideStyles.stepRowBorder]}>
              <Text style={slideStyles.stepNum}>{step.num}</Text>
              <Text style={slideStyles.stepText}>{step.text}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── Slide 3: What people are saying ──────────────────────────────────────────
function Slide3() {
  const reviews = [
    { name: 'Sarah', location: 'Cape Town', comment: 'Dropped my bags at a café near the waterfront. So easy!' },
    { name: 'James', location: 'Sea Point', comment: 'Brilliant app. Stored our bags while we explored!' },
  ];
  return (
    <View style={slideStyles.slide}>
      <View style={slideStyles.content}>
        <Text style={[slideStyles.heading, { marginTop: 32 }]}>{'What people\nare saying'}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={slideStyles.reviewsScroll} contentContainerStyle={slideStyles.reviewsContent}>
          {reviews.map(r => (
            <View key={r.name} style={slideStyles.reviewCard}>
              <View style={slideStyles.reviewHeader}>
                <View style={slideStyles.reviewAvatar}>
                  <Text style={slideStyles.reviewAvatarText}>{r.name[0]}</Text>
                </View>
                <View>
                  <Text style={slideStyles.reviewName}>{r.name}</Text>
                  <Text style={slideStyles.reviewLocation}>📍 {r.location}</Text>
                </View>
              </View>
              <Text style={slideStyles.reviewStars}>★★★★★</Text>
              <Text style={slideStyles.reviewComment}>"{r.comment}"</Text>
            </View>
          ))}
        </ScrollView>
        <View style={slideStyles.partnerRow}>
          <Text style={slideStyles.partnerItem}>☕ Cafés</Text>
          <Text style={slideStyles.partnerDot}>·</Text>
          <Text style={slideStyles.partnerItem}>🏨 Hotels</Text>
          <Text style={slideStyles.partnerDot}>·</Text>
          <Text style={slideStyles.partnerItem}>🛏️ Hostels</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Slide 4: Less Bags, More Fun ─────────────────────────────────────────────
function Slide4() {
  return (
    <View style={slideStyles.slide}>
      <View style={slideStyles.illustrationBgBlue}>
        <Text style={slideStyles.illustrationEmojis}>🌍✈️🎉</Text>
      </View>
      <View style={slideStyles.content}>
        <Text style={slideStyles.heading}>{'Less Bags,\nMore Fun'}</Text>
        <Text style={slideStyles.sub}>
          Never change your plans because of a bag.
        </Text>
      </View>
    </View>
  );
}

const SLIDES = [Slide1, Slide2, Slide3, Slide4];

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Onboarding() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  function handleContinue() {
    if (currentIndex < SLIDES.length - 1) {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
      setTimeout(() => setCurrentIndex(i => i + 1), 150);
    } else {
      completeOnboarding();
    }
  }

  const SlideComponent = SLIDES[currentIndex];

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.skipBtn} onPress={completeOnboarding}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
        <SlideComponent />
      </Animated.View>

      <View style={styles.bottom}>
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === currentIndex && styles.dotActive]} />
          ))}
        </View>
        <TouchableOpacity style={styles.continueBtn} onPress={handleContinue} activeOpacity={0.85}>
          <Text style={styles.continueBtnText}>
            {currentIndex === SLIDES.length - 1 ? 'Get started →' : 'Continue →'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const slideStyles = StyleSheet.create({
  slide: { flex: 1 },
  illustrationBg: {
    backgroundColor: '#FFF0EE',
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationBgBlue: {
    backgroundColor: '#EFF6FF',
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationEmojis: { fontSize: 72, letterSpacing: 8 },
  content: { paddingHorizontal: 28, paddingTop: 28 },
  heading: { fontSize: 36, fontWeight: '800', color: '#1A1A1A', lineHeight: 44, marginBottom: 14 },
  sub: { fontSize: 16, color: '#6B7280', lineHeight: 24, marginBottom: 20 },

  // Slide 1 trust badges
  pillsScroll: { marginBottom: 4 },
  pillsContent: { gap: 10, flexDirection: 'row' },
  trustPill: {
    backgroundColor: '#FFF0EE',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#FFCDC8',
  },
  trustPillText: { fontSize: 14, fontWeight: '600', color: '#FF5C5C' },

  // Slide 2 steps card
  stepsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0EAEA',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
  },
  stepRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0EAEA',
  },
  stepNum: { fontSize: 22, color: '#FF5C5C', fontWeight: '700', lineHeight: 26 },
  stepText: { fontSize: 15, color: '#1A1A1A', lineHeight: 22, flex: 1, fontWeight: '500' },

  // Slide 3 reviews
  reviewsScroll: { marginBottom: 20 },
  reviewsContent: { gap: 12, flexDirection: 'row' },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    width: 260,
    borderWidth: 1,
    borderColor: '#F0EAEA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  reviewAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FF5C5C', alignItems: 'center', justifyContent: 'center',
  },
  reviewAvatarText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  reviewName: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  reviewLocation: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  reviewStars: { fontSize: 16, color: '#FFD93D', marginBottom: 6 },
  reviewComment: { fontSize: 14, color: '#6B7280', lineHeight: 20, fontStyle: 'italic' },
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  partnerItem: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  partnerDot: { fontSize: 14, color: '#D1D5DB' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  skipBtn: {
    position: 'absolute',
    top: 56,
    right: 24,
    zIndex: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  skipText: { fontSize: 15, color: '#6B7280', fontWeight: '600' },
  bottom: {
    paddingHorizontal: 28,
    paddingBottom: 40,
    paddingTop: 16,
    backgroundColor: '#FAFAFA',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F0EAEA',
  },
  dotActive: {
    backgroundColor: '#FF5C5C',
    width: 24,
  },
  continueBtn: {
    backgroundColor: '#FF5C5C',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  continueBtnText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
});
