import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../src/constants/colors';

const UPCOMING = [
  {
    id: '1',
    traveller: 'Sarah T.',
    bags: 2,
    dropOff: '09:00',
    pickUp: '15:00',
    total: 160,
    status: 'confirmed',
  },
  {
    id: '2',
    traveller: 'James M.',
    bags: 1,
    dropOff: '10:30',
    pickUp: '18:00',
    total: 80,
    status: 'pending',
  },
];

export default function Dashboard() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back 👋</Text>
            <Text style={styles.heading}>Host Dashboard</Text>
          </View>
          <TouchableOpacity
            style={styles.switchBtn}
            onPress={() => router.replace('/(traveller)/explore')}
          >
            <Text style={styles.switchBtnText}>🧳 Switch to traveller</Text>
          </TouchableOpacity>
        </View>

        {/* Earnings summary */}
        <View style={styles.earningsCard}>
          <Text style={styles.earningsLabel}>This month's earnings</Text>
          <Text style={styles.earningsAmount}>R1,240</Text>
          <View style={styles.earningsRow}>
            <View style={styles.earningsStat}>
              <Text style={styles.earningsStatNum}>14</Text>
              <Text style={styles.earningsStatLabel}>Bookings</Text>
            </View>
            <View style={styles.earningsDivider} />
            <View style={styles.earningsStat}>
              <Text style={styles.earningsStatNum}>4.9</Text>
              <Text style={styles.earningsStatLabel}>Avg rating</Text>
            </View>
            <View style={styles.earningsDivider} />
            <View style={styles.earningsStat}>
              <Text style={styles.earningsStatNum}>98%</Text>
              <Text style={styles.earningsStatLabel}>Response</Text>
            </View>
          </View>
        </View>

        {/* Weekly breakdown */}
        <View style={styles.weekCard}>
          <Text style={styles.weekTitle}>This week</Text>
          <View style={styles.weekBars}>
            {['M','T','W','T','F','S','S'].map((day, i) => {
              const heights = [60, 80, 40, 90, 100, 70, 30];
              return (
                <View key={i} style={styles.weekBarCol}>
                  <View style={[styles.weekBar, { height: heights[i] }]} />
                  <Text style={styles.weekBarLabel}>{day}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Status toggle */}
        <View style={styles.statusCard}>
          <View>
            <Text style={styles.statusTitle}>Availability</Text>
            <Text style={styles.statusSub}>You are currently accepting bags</Text>
          </View>
          <View style={styles.statusToggle}>
            <View style={styles.statusDot} />
            <Text style={styles.statusOnText}>Open</Text>
          </View>
        </View>

        {/* Today's bookings */}
        <Text style={styles.sectionTitle}>Today's bookings</Text>
        <View style={styles.bookingsList}>
          {UPCOMING.map(b => (
            <View key={b.id} style={styles.bookingCard}>
              <View style={styles.bookingTop}>
                <View style={styles.travIcon}>
                  <Text style={{ fontSize: 20 }}>👤</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.travName}>{b.traveller}</Text>
                  <Text style={styles.travDetails}>{b.bags} bag{b.bags > 1 ? 's' : ''} · {b.dropOff} – {b.pickUp}</Text>
                </View>
                <View>
                  <Text style={styles.bookingAmount}>R{b.total}</Text>
                  <View style={[styles.bookingStatus, { backgroundColor: b.status === 'confirmed' ? '#D1FAE5' : '#FEF3C7' }]}>
                    <Text style={[styles.bookingStatusText, { color: b.status === 'confirmed' ? Colors.success : Colors.warning }]}>
                      {b.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                    </Text>
                  </View>
                </View>
              </View>

              {b.status === 'pending' && (
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.acceptBtn}>
                    <Text style={styles.acceptBtnText}>✓ Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.declineBtn}>
                    <Text style={styles.declineBtnText}>✕ Decline</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Quick tips */}
        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>💡 Hosting tips</Text>
          <Text style={styles.tipText}>Hosts who respond within 1 hour earn 40% more bookings. Keep your availability up to date!</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingTop: 8,
  },
  greeting: { fontSize: 14, color: Colors.textSecondary },
  heading: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  switchBtn: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  switchBtnText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  earningsCard: {
    backgroundColor: Colors.primary,
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  earningsLabel: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  earningsAmount: { fontSize: 36, fontWeight: '900', color: Colors.white, marginBottom: 20 },
  earningsRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12 },
  earningsStat: { flex: 1, alignItems: 'center' },
  earningsStatNum: { fontSize: 20, fontWeight: '800', color: Colors.white },
  earningsStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  earningsDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 4 },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
  },
  statusTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  statusSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  statusToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D1FAE5',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success },
  statusOnText: { fontSize: 14, fontWeight: '700', color: Colors.success },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, paddingHorizontal: 20, marginBottom: 12 },
  bookingsList: { paddingHorizontal: 20, gap: 12, marginBottom: 20 },
  bookingCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bookingTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  travIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  travName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  travDetails: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  bookingAmount: { fontSize: 16, fontWeight: '800', color: Colors.primary, textAlign: 'right' },
  bookingStatus: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4, alignSelf: 'flex-end' },
  bookingStatusText: { fontSize: 11, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  acceptBtn: {
    flex: 1, backgroundColor: Colors.success, borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  acceptBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  declineBtn: {
    flex: 1, borderWidth: 1.5, borderColor: Colors.error, borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  declineBtnText: { color: Colors.error, fontWeight: '700', fontSize: 14 },
  weekCard: { backgroundColor: Colors.white, marginHorizontal: 20, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: Colors.border, marginBottom: 20 },
  weekTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12 },
  weekBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 110 },
  weekBarCol: { flex: 1, alignItems: 'center', gap: 4 },
  weekBar: { width: '100%', backgroundColor: Colors.primary, borderRadius: 6, opacity: 0.8 },
  weekBarLabel: { fontSize: 10, color: Colors.textSecondary },
  tipCard: {
    backgroundColor: '#FFF9EC',
    borderRadius: 14,
    marginHorizontal: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F59E0B40',
  },
  tipTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  tipText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
});
