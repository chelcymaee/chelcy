import { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import Btn from '../../src/components/Btn';

// Landing screen for cubby://payment-result?status=success deep link
// Used when the app is cold-started or backgrounded during payment
export default function PaymentSuccess() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();

  useEffect(() => {
    // Brief delay so user sees the success state before navigating
    const t = setTimeout(() => {
      router.replace('/(traveller)/bookings');
    }, 2500);
    return () => clearTimeout(t);
  }, []);

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
