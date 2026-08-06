import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { supabase } from '../../src/lib/supabase';
import Btn from '../../src/components/Btn';

/**
 * Landing screen for the cubby://confirm-email deep link. app/_layout.tsx's
 * confirm-email branch calls exchangeCodeForSession and then routes here
 * with a `result` param — but expo-router auto-registers a deep link for
 * every screen's own file path, so this exact route is *also* independently
 * reachable via cubby://confirm-email straight from the OS, bypassing that
 * handler entirely (e.g. a crafted cubby://confirm-email?result=verified
 * link). `result` is therefore only ever a wording hint, never the source
 * of truth: on mount this screen independently checks for a real, live
 * Supabase session and only shows the verified state if one genuinely
 * exists. A forged query string with no valid session behind it can't make
 * this screen claim success.
 */
export default function ConfirmEmail() {
  const { result } = useLocalSearchParams<{ result?: string }>();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      setHasSession(!!session);
      setChecking(false);
    });
    return () => { cancelled = true; };
  }, []);

  if (checking) {
    return (
      <Screen>
        <ActivityIndicator color={Colors.primary} />
      </Screen>
    );
  }

  if (hasSession) {
    return (
      <Screen>
        <Text style={styles.icon}>✅</Text>
        <Text style={styles.heading}>Email verified</Text>
        <Text style={styles.subheading}>
          {result === 'already'
            ? "You're already confirmed and signed in."
            : "You're all set — your email is confirmed and you're signed in."}
        </Text>
        <Btn label="Continue to Cubby" onPress={() => router.replace('/(traveller)/explore')} style={styles.btn} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={styles.heading}>Couldn't verify this link</Text>
      <Text style={styles.subheading}>
        This confirmation link is invalid or has already been used. If you've already confirmed your
        email, just sign in below.
      </Text>
      <Btn label="Sign in" onPress={() => router.replace('/(auth)/login')} style={styles.btn} />
    </Screen>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView contentContainerStyle={styles.inner} style={styles.container}>
      <View style={styles.logoRow}>
        <Text style={styles.logoIcon}>🧳</Text>
        <Text style={styles.logoName}>cubby</Text>
      </View>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { padding: 24, paddingTop: 60 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 32 },
  logoIcon: { fontSize: 28 },
  logoName: { fontSize: 28, fontWeight: '800', color: Colors.primary },
  icon: { fontSize: 40, marginBottom: 12 },
  heading: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary, marginBottom: 6 },
  subheading: { fontSize: 16, color: Colors.textSecondary, marginBottom: 24, lineHeight: 22 },
  btn: { marginTop: 8 },
});
