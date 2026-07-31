import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import Btn from '../../src/components/Btn';
import { fetchPaymentOutcome } from '../../src/lib/payment-status';

// Landing screen for cubby://payment-result?status=success deep link.
// Used when the app is cold-started or backgrounded during payment — see
// app/_layout.tsx's usePaymentDeepLink(), the one place this screen is
// navigated to from.
//
// The deep link's `status=success` param is only what got us to THIS
// screen rather than payment-failed — it is never treated as proof the
// payment actually went through. A browser/OS-level return can happen
// without any payment having completed (or with the wrong outcome), the
// same reason paygate-return never trusts PayGate's own claimed
// TRANSACTION_STATUS server-side. This screen always re-fetches the
// booking's real status from Supabase via bookingId before ever showing
// "confirmed".
export default function PaymentSuccess() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [outcome, setOutcome] = useState<'checking' | 'success' | 'pending' | 'failed'>('checking');

  useEffect(() => {
    let cancelled = false;
    async function verify() {
      if (!bookingId) {
        // No booking to verify against — can't confirm anything, so this
        // never resolves to 'success' on nothing but the URL's say-so.
        if (!cancelled) setOutcome('pending');
        return;
      }
      const result = await fetchPaymentOutcome(bookingId);
      if (!cancelled) setOutcome(result);
    }
    verify();
    return () => { cancelled = true; };
  }, [bookingId]);

  useEffect(() => {
    if (outcome !== 'success') return;
    // Brief delay so user sees the success state before navigating
    const t = setTimeout(() => {
      router.replace('/(traveller)/bookings');
    }, 2500);
    return () => clearTimeout(t);
  }, [outcome]);

  if (outcome === 'checking') {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.inner}>
          <ActivityIndicator color={Colors.primary} style={s.spinner} />
          <Text style={s.title}>Checking your payment…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (outcome === 'pending') {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.inner}>
          <Text style={s.icon}>⏳</Text>
          <Text style={s.title}>Still processing…</Text>
          <Text style={s.sub}>We're waiting for your payment to be confirmed. Check your bookings tab shortly.</Text>
          <Btn label="View my bookings" onPress={() => router.replace('/(traveller)/bookings')} />
        </View>
      </SafeAreaView>
    );
  }

  if (outcome === 'failed') {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.inner}>
          <Text style={s.icon}>❌</Text>
          <Text style={s.title}>Payment not confirmed</Text>
          <Text style={s.sub}>We couldn't confirm this payment went through. Check your bookings tab, or try again.</Text>
          <Btn label="View my bookings" onPress={() => router.replace('/(traveller)/bookings')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.inner}>
        <Text style={s.icon}>✅</Text>
        <Text style={s.title}>Payment successful!</Text>
        <Text style={s.sub}>Your booking is confirmed. Redirecting to your bookings…</Text>
        <ActivityIndicator color={Colors.primary} style={s.spinner} />
        <Btn label="View my bookings" onPress={() => router.replace('/(traveller)/bookings')} />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  icon: { fontSize: 72, marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '900', color: Colors.textPrimary, marginBottom: 10, textAlign: 'center' },
  sub: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  spinner: { marginBottom: 28 },
});
