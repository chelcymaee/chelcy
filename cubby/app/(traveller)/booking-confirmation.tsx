import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Share } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors } from '../../src/constants/colors';

export default function BookingConfirmation() {
  const { hostName, dropOff, pickUp, bags, total, pin } = useLocalSearchParams<{
    hostName: string; dropOff: string; pickUp: string;
    bags: string; total: string; pin: string;
  }>();

  const pinCode = pin ?? '4821';

  async function shareBooking() {
    await Share.share({
      message: `I'm using Cubby to store my bags at ${hostName ?? 'a Cubby host'} while I explore Cape Town! 🧳 cubby.app`,
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        {/* Success header */}
        <View style={styles.successHeader}>
          <View style={styles.successIcon}>
            <Text style={styles.successEmoji}>✅</Text>
          </View>
          <Text style={styles.successTitle}>Booking confirmed!</Text>
          <Text style={styles.successSub}>Your bags are as good as stored. Head to the host and show your PIN.</Text>
        </View>

        {/* PIN code - most important element */}
        <View style={styles.pinCard}>
          <Text style={styles.pinLabel}>Your drop-off PIN</Text>
          <Text style={styles.pinCode}>{pinCode}</Text>
          <Text style={styles.pinHint}>Show this to your host when you arrive. Keep it safe.</Text>
        </View>

        {/* Booking summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Booking summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Host</Text>
            <Text style={styles.summaryValue}>{hostName ?? 'Your host'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Drop-off</Text>
            <Text style={styles.summaryValue}>{dropOff ?? '09:00'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Pick-up</Text>
            <Text style={styles.summaryValue}>{pickUp ?? '15:00'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Bags</Text>
            <Text style={styles.summaryValue}>{bags ?? '1'}</Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryRowTotal]}>
            <Text style={styles.summaryTotalLabel}>Total paid</Text>
            <Text style={styles.summaryTotalValue}>R{total ?? '0'}</Text>
          </View>
        </View>

        {/* What to do now */}
        <View style={styles.stepsCard}>
          <Text style={styles.stepsTitle}>What happens next</Text>
          {[
            { n: '1', text: 'Head to the host location' },
            { n: '2', text: 'Show your PIN code to the host' },
            { n: '3', text: 'Drop your bags and go explore!' },
            { n: '4', text: 'Return before pick-up time and collect your bags' },
          ].map(step => (
            <View key={step.n} style={styles.step}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{step.n}</Text>
              </View>
              <Text style={styles.stepText}>{step.text}</Text>
            </View>
          ))}
        </View>

        {/* Trust badge */}
        <View style={styles.trustRow}>
          <Text style={styles.trustBadge}>🔒 Payment secured via PayFast</Text>
          <Text style={styles.trustBadge}>🛡️ Up to R2,000 coverage per bag</Text>
        </View>

        {/* Actions */}
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/(traveller)/bookings')}>
          <Text style={styles.primaryBtnText}>View my bookings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={shareBooking}>
          <Text style={styles.secondaryBtnText}>📤 Share Cubby with a friend</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.ghostBtn} onPress={() => router.replace('/(traveller)/explore')}>
          <Text style={styles.ghostBtnText}>Back to explore</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { padding: 24, paddingTop: 32 },
  successHeader: { alignItems: 'center', marginBottom: 28 },
  successIcon: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#F0FFF4',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  successEmoji: { fontSize: 40 },
  successTitle: { fontSize: 28, fontWeight: '900', color: Colors.textPrimary, marginBottom: 8 },
  successSub: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  pinCard: {
    backgroundColor: Colors.primary, borderRadius: 20, padding: 24,
    alignItems: 'center', marginBottom: 16,
  },
  pinLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 8 },
  pinCode: { fontSize: 52, fontWeight: '900', color: Colors.white, letterSpacing: 12, marginBottom: 8 },
  pinHint: { fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  summaryCard: {
    backgroundColor: Colors.white, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 16, gap: 12,
  },
  summaryTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryRowTotal: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12 },
  summaryLabel: { fontSize: 14, color: Colors.textSecondary },
  summaryValue: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  summaryTotalLabel: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  summaryTotalValue: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  stepsCard: {
    backgroundColor: Colors.white, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 16, gap: 12,
  },
  stepsTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepNum: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNumText: { fontSize: 13, fontWeight: '700', color: Colors.white },
  stepText: { fontSize: 14, color: Colors.textPrimary, flex: 1 },
  trustRow: { gap: 8, marginBottom: 20 },
  trustBadge: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center' },
  primaryBtn: {
    backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 18,
    alignItems: 'center', marginBottom: 12,
  },
  primaryBtnText: { fontSize: 17, fontWeight: '700', color: Colors.white },
  secondaryBtn: {
    backgroundColor: Colors.accent, borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', marginBottom: 12,
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '700', color: Colors.white },
  ghostBtn: { paddingVertical: 14, alignItems: 'center' },
  ghostBtnText: { fontSize: 15, color: Colors.textSecondary },
});
