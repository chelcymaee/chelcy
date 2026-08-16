import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../src/constants/colors';
import { useAuth } from '../src/lib/auth-context';
import { supabase } from '../src/lib/supabase';

function LogoPin() {
  return (
    <View style={styles.pinWrap}>
      {/* Pin shape made from views */}
      <View style={styles.pinCircle}>
        <View style={styles.pinBag}>
          <View style={styles.bagHandle} />
          <View style={styles.bagBody}>
            <View style={styles.bagDot} />
          </View>
        </View>
      </View>
      <View style={styles.pinPoint} />
      <View style={styles.pinShadow} />
    </View>
  );
}

export default function Welcome() {
  const { session, loading } = useAuth();
  const pinDrop = useRef(new Animated.Value(-120)).current;
  const pinOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Wait for AuthProvider to finish restoring (or fail to find) a
    // persisted session before making any routing decision here — avoids
    // a flash of Welcome/onboarding-check followed by a second redirect
    // once the real session state resolves a moment later.
    if (loading) return;

    if (session) {
      // A session was already restored from storage — skip Welcome/Login
      // entirely and route exactly the way login.tsx's navigateByRole()
      // does right after a fresh sign-in, so a restored session lands in
      // the same place a manual login would have. profiles.role query
      // mirrors login.tsx's; any failure/missing role safely defaults to
      // the traveller path rather than getting stuck.
      supabase.from('profiles').select('role').eq('id', session.user.id).single()
        .then(({ data: profile }) => {
          const role = profile?.role ?? 'traveller';
          if (role === 'host' || role === 'both') router.replace('/(host)/dashboard');
          else if (role === 'runner') router.replace('/(runner)/dashboard');
          else router.replace('/(traveller)/explore');
        });
      return;
    }

    // No session (never logged in, logged out, or an unrecoverably expired
    // session already resolved to null by AuthProvider) — unchanged
    // existing behavior.
    AsyncStorage.getItem('cubby_onboarded').then(val => {
      if (!val) {
        router.replace('/onboarding');
        return;
      }
      // Pin drop animation then fade in content
      Animated.sequence([
        Animated.parallel([
          Animated.spring(pinDrop, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
          Animated.timing(pinOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]),
        Animated.timing(contentOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
    });
  }, [loading, session]);

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <Animated.View style={{ transform: [{ translateY: pinDrop }], opacity: pinOpacity }}>
          <LogoPin />
        </Animated.View>
        <Animated.View style={{ opacity: contentOpacity }}>
          <Text style={styles.logoText}>Cubby</Text>
          <Text style={styles.tagline}>STORE. EXPLORE. <Text style={styles.taglineAccent}>COLLECT.</Text></Text>
        </Animated.View>
      </View>

      <Animated.View style={[styles.pillsRow, { opacity: contentOpacity }]}>
        <View style={styles.pill}><Text style={styles.pillText}>☕ Cafés</Text></View>
        <View style={styles.pill}><Text style={styles.pillText}>🏨 Hotels</Text></View>
        <View style={styles.pill}><Text style={styles.pillText}>🛏️ Hostels</Text></View>
        <View style={styles.pill}><Text style={styles.pillText}>🔑 Airbnbs</Text></View>
        <View style={styles.pill}><Text style={styles.pillText}>🗺️ Tour Operators</Text></View>
        <View style={styles.pill}><Text style={styles.pillText}>🚗 Bag Runners</Text></View>
      </Animated.View>

      <Animated.View style={[styles.ctas, { opacity: contentOpacity }]}>
        <TouchableOpacity style={styles.btnPrimary} onPress={() => router.push('/(auth)/signup')} activeOpacity={0.85}>
          <Text style={styles.btnPrimaryText}>Get started — it's free</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSecondary} onPress={() => router.push('/(auth)/login')} activeOpacity={0.85}>
          <Text style={styles.btnSecondaryText}>I already have an account</Text>
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.bottomRow}>
        <Text style={styles.location}>📍 Cape Town, South Africa</Text>
        <TouchableOpacity onPress={() => router.push('/(traveller)/partner-apply')}
          // @ts-ignore
          onClick={() => router.push('/(traveller)/partner-apply')}
        >
          <Text style={styles.partnerLink}>Partner with us →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'space-between', paddingTop: 80, paddingBottom: 50, paddingHorizontal: 24 },

  // Logo pin
  topSection: { alignItems: 'center' },
  pinWrap: { alignItems: 'center', marginBottom: 20 },
  pinCircle: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center',
    borderWidth: 6, borderColor: Colors.white,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16,
  },
  pinBag: { alignItems: 'center' },
  bagHandle: {
    width: 22, height: 8, borderTopLeftRadius: 8, borderTopRightRadius: 8,
    borderWidth: 4, borderColor: Colors.primary, borderBottomWidth: 0, marginBottom: -2,
  },
  bagBody: {
    width: 36, height: 32, borderRadius: 6,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  bagDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.accent },
  pinPoint: {
    width: 0, height: 0,
    borderLeftWidth: 14, borderRightWidth: 14, borderTopWidth: 20,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: Colors.white,
    marginTop: -2,
  },
  pinShadow: {
    width: 20, height: 8, borderRadius: 10,
    backgroundColor: Colors.accent, marginTop: 4, opacity: 0.9,
  },

  logoText: { fontSize: 52, fontWeight: '900', color: Colors.white, letterSpacing: -1, marginBottom: 8 },
  tagline: { fontSize: 14, color: Colors.white, letterSpacing: 3, fontWeight: '700' },
  taglineAccent: { color: Colors.accent },

  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  pill: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  pillText: { color: Colors.white, fontSize: 14, fontWeight: '600' },

  ctas: { width: '100%', gap: 12 },
  btnPrimary: { backgroundColor: Colors.white, borderRadius: 18, paddingVertical: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
  btnPrimaryText: { fontSize: 17, fontWeight: '800', color: Colors.primary },
  btnSecondary: { borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 18, paddingVertical: 18, alignItems: 'center' },
  btnSecondaryText: { fontSize: 17, fontWeight: '600', color: Colors.white },
  bottomRow: { alignItems: 'center', gap: 8 },
  location: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  partnerLink: { fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecorationLine: 'underline' },
});
