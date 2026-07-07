import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../src/constants/colors';

// Card details are never stored in the app — all payments go through the
// PayFast hosted checkout page which handles card capture securely.
export default function PaymentDetails() {
  return (
    <SafeAreaView style={s.container}>
      <View style={s.inner}>
        <Text style={s.emoji}>🔒</Text>
        <Text style={s.heading}>Payment methods</Text>
        <Text style={s.body}>
          Payment methods are securely handled by{'\n'}
          <Text style={s.bold}>PayFast</Text>.
        </Text>
        <Text style={s.body}>
          Your card details are entered directly on PayFast's PCI-DSS certified checkout page and are never stored by Cubby.
        </Text>
        <View style={s.badge}>
          <Text style={s.badgeText}>🛡️ PCI-DSS compliant · 256-bit SSL</Text>
        </View>
        <TouchableOpacity
          style={s.btn}
          onPress={() => router.replace('/(traveller)/profile')}
          // @ts-ignore
          onClick={() => router.replace('/(traveller)/profile')}
        >
          <Text style={s.btnText}>Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emoji: { fontSize: 64, marginBottom: 20 },
  heading: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, marginBottom: 16, textAlign: 'center' },
  body: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 16 },
  bold: { fontWeight: '700', color: Colors.textPrimary },
  badge: {
    backgroundColor: '#F0FFF4', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10,
    marginBottom: 32, borderWidth: 1, borderColor: '#A7F3D0',
  },
  badgeText: { fontSize: 13, color: Colors.success, fontWeight: '600' },
  btn: {
    backgroundColor: Colors.primary, borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 40,
  },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
