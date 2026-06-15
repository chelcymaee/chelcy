import { useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../src/constants/colors';

const { width, height } = Dimensions.get('window');

export default function Welcome() {
  return (
    <View style={styles.container}>
      {/* Background */}
      <View style={styles.bg} />

      {/* Logo area */}
      <View style={styles.logoSection}>
        <View style={styles.logoBox}>
          <Text style={styles.logoIcon}>🧳</Text>
        </View>
        <Text style={styles.logoText}>cubby</Text>
        <Text style={styles.tagline}>Store your bags.{'\n'}Explore freely.</Text>
      </View>

      {/* Cards preview illustration */}
      <View style={styles.illustrationRow}>
        <View style={[styles.card, { transform: [{ rotate: '-6deg' }], top: 10 }]}>
          <Text style={styles.cardEmoji}>☕</Text>
          <Text style={styles.cardLabel}>Café</Text>
          <View style={styles.stars}>
            <Text style={styles.starsText}>★★★★★</Text>
          </View>
        </View>
        <View style={[styles.card, styles.cardMid]}>
          <Text style={styles.cardEmoji}>🏠</Text>
          <Text style={styles.cardLabel}>Home Host</Text>
          <View style={styles.stars}>
            <Text style={styles.starsText}>★★★★★</Text>
          </View>
        </View>
        <View style={[styles.card, { transform: [{ rotate: '6deg' }], top: 10 }]}>
          <Text style={styles.cardEmoji}>🛍️</Text>
          <Text style={styles.cardLabel}>Shop</Text>
          <View style={styles.stars}>
            <Text style={styles.starsText}>★★★★☆</Text>
          </View>
        </View>
      </View>

      {/* CTAs */}
      <View style={styles.ctas}>
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => router.push('/(auth)/signup')}
          activeOpacity={0.85}
        >
          <Text style={styles.btnPrimaryText}>Get started</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => router.push('/(auth)/login')}
          activeOpacity={0.85}
        >
          <Text style={styles.btnSecondaryText}>I already have an account</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.location}>📍 Cape Town, South Africa</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 24,
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.primary,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoIcon: { fontSize: 36 },
  logoText: {
    fontSize: 42,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 26,
  },
  illustrationRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 56,
    height: 120,
    alignItems: 'center',
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    width: 90,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  cardMid: {
    transform: [{ scale: 1.08 }],
    shadowOpacity: 0.25,
  },
  cardEmoji: { fontSize: 28 },
  cardLabel: { fontSize: 12, fontWeight: '600', color: Colors.textPrimary, marginTop: 4 },
  stars: { marginTop: 6 },
  starsText: { fontSize: 10, color: Colors.star },
  ctas: { width: '100%', gap: 12 },
  btnPrimary: {
    backgroundColor: Colors.accent,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  btnPrimaryText: { fontSize: 17, fontWeight: '700', color: Colors.white },
  btnSecondary: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  btnSecondaryText: { fontSize: 17, fontWeight: '600', color: Colors.white },
  location: {
    marginTop: 24,
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
});
