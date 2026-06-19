import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../src/constants/colors';

// Landing screen for cubby://payment-result?status=failed deep link
export default function PaymentFailed() {
  return (
    <SafeAreaView style={s.container}>
      <View style={s.inner}>
        <Text style={s.icon}>❌</Text>
        <Text style={s.title}>Payment failed</Text>
        <Text style={s.sub}>Your payment could not be processed. No charge was made. Please try again.</Text>
        <TouchableOpacity
          style={s.primary}
          onPress={() => router.replace('/(traveller)/explore')}
          // @ts-ignore
          onClick={() => router.replace('/(traveller)/explore')}
        >
          <Text style={s.primaryText}>Try again</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.ghost}
          onPress={() => router.replace('/(traveller)/bookings')}
          // @ts-ignore
          onClick={() => router.replace('/(traveller)/bookings')}
        >
          <Text style={s.ghostText}>View my bookings</Text>
        </TouchableOpacity>
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
  primary: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 32, marginBottom: 12 },
  primaryText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  ghost: { paddingVertical: 14 },
  ghostText: { fontSize: 15, color: Colors.textSecondary },
});
