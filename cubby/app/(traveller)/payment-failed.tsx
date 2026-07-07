import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import Btn from '../../src/components/Btn';

// Landing screen for cubby://payment-result?status=failed deep link
export default function PaymentFailed() {
  return (
    <SafeAreaView style={s.container}>
      <View style={s.inner}>
        <Text style={s.icon}>❌</Text>
        <Text style={s.title}>Payment failed</Text>
        <Text style={s.sub}>Your payment could not be processed. No charge was made. Please try again.</Text>
        <Btn label="Try again" onPress={() => router.replace('/(traveller)/explore')} style={s.primary} />
        <Btn label="View my bookings" onPress={() => router.replace('/(traveller)/bookings')} variant="ghost" style={s.ghost} />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  icon: { fontSize: 72, marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '900', color: Colors.textPrimary, marginBottom: 10, textAlign: 'center' },
  sub: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  primary: { marginBottom: 12 },
  ghost: {},
});
