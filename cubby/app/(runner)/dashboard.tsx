import { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '../../src/constants/colors';

const ACTIVE_DELIVERY = {
  id: '1',
  traveller: 'Sarah T.',
  bags: 2,
  pickup_address: '12 Long Street, Cape Town City Bowl',
  dropoff_address: 'V&A Waterfront, Cape Town',
  pickup_time: '10:30',
  total: 120,
  status: 'accepted',
};

export default function RunnerDashboard() {
  const [isAvailable, setIsAvailable] = useState(true);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back 👋</Text>
            <Text style={styles.heading}>Runner Dashboard</Text>
          </View>
        </View>

        {/* Availability toggle */}
        <TouchableOpacity
          style={[styles.toggleCard, isAvailable ? styles.toggleCardAvailable : styles.toggleCardOffline]}
          onPress={() => setIsAvailable(v => !v)}
          activeOpacity={0.85}
        >
          <View>
            <Text style={[styles.toggleTitle, { color: isAvailable ? Colors.success : Colors.textSecondary }]}>
              {isAvailable ? '🟢 Available' : '⚫ Offline'}
            </Text>
            <Text style={styles.toggleSub}>
              {isAvailable ? 'You are accepting delivery requests' : 'You are not accepting requests'}
            </Text>
          </View>
          <View style={[styles.togglePill, { backgroundColor: isAvailable ? Colors.success : Colors.textLight }]}>
            <Text style={styles.togglePillText}>{isAvailable ? 'GO OFFLINE' : 'GO ONLINE'}</Text>
          </View>
        </TouchableOpacity>

        {/* Today's earnings */}
        <View style={styles.earningsCard}>
          <Text style={styles.earningsLabel}>Today's earnings</Text>
          <Text style={styles.earningsAmount}>R240</Text>
          <View style={styles.earningsRow}>
            <View style={styles.earningsStat}>
              <Text style={styles.earningsStatNum}>3</Text>
              <Text style={styles.earningsStatLabel}>Deliveries</Text>
            </View>
            <View style={styles.earningsDivider} />
            <View style={styles.earningsStat}>
              <Text style={styles.earningsStatNum}>R80</Text>
              <Text style={styles.earningsStatLabel}>Avg per trip</Text>
            </View>
            <View style={styles.earningsDivider} />
            <View style={styles.earningsStat}>
              <Text style={styles.earningsStatNum}>4.9</Text>
              <Text style={styles.earningsStatLabel}>Avg rating</Text>
            </View>
          </View>
        </View>

        {/* Active delivery */}
        <Text style={styles.sectionTitle}>Active delivery</Text>
        <View style={styles.activeCard}>
          <View style={styles.activeTop}>
            <View style={styles.avatar}>
              <Text style={{ fontSize: 22 }}>👤</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.travName}>{ACTIVE_DELIVERY.traveller}</Text>
              <Text style={styles.travSub}>{ACTIVE_DELIVERY.bags} bag{ACTIVE_DELIVERY.bags > 1 ? 's' : ''} · Pickup at {ACTIVE_DELIVERY.pickup_time}</Text>
            </View>
            <Text style={styles.activeAmount}>R{ACTIVE_DELIVERY.total}</Text>
          </View>
          <View style={styles.addressBlock}>
            <View style={styles.addressRow}>
              <Text style={styles.addressIcon}>📍</Text>
              <View>
                <Text style={styles.addressLabel}>Pickup</Text>
                <Text style={styles.addressText}>{ACTIVE_DELIVERY.pickup_address}</Text>
              </View>
            </View>
            <View style={styles.addressDivider} />
            <View style={styles.addressRow}>
              <Text style={styles.addressIcon}>🏁</Text>
              <View>
                <Text style={styles.addressLabel}>Drop-off</Text>
                <Text style={styles.addressText}>{ACTIVE_DELIVERY.dropoff_address}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.navigateBtn}>
            <Text style={styles.navigateBtnText}>🗺️ Open in Maps</Text>
          </TouchableOpacity>
        </View>

        {/* How it works */}
        <Text style={styles.sectionTitle}>How it works</Text>
        <View style={styles.howCard}>
          {[
            { step: '1', icon: '📲', title: 'Go available', desc: 'Toggle available to start receiving delivery requests in your area.' },
            { step: '2', icon: '🚗', title: 'Accept a request', desc: 'Review and accept delivery requests from travellers near you.' },
            { step: '3', icon: '🧳', title: 'Pick up bags', desc: 'Head to the pickup address and collect the traveller\'s bags.' },
            { step: '4', icon: '💰', title: 'Deliver & earn', desc: 'Drop off at the destination and earn per bag delivered.' },
          ].map(item => (
            <View key={item.step} style={styles.howRow}>
              <View style={styles.howIconCircle}>
                <Text style={{ fontSize: 20 }}>{item.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.howTitle}>{item.title}</Text>
                <Text style={styles.howDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
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
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    borderRadius: 18,
    padding: 18,
    borderWidth: 2,
    marginBottom: 16,
  },
  toggleCardAvailable: { backgroundColor: '#D1FAE5', borderColor: Colors.success },
  toggleCardOffline: { backgroundColor: Colors.white, borderColor: Colors.border },
  toggleTitle: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  toggleSub: { fontSize: 13, color: Colors.textSecondary },
  togglePill: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  togglePillText: { fontSize: 11, fontWeight: '800', color: Colors.white },
  earningsCard: {
    backgroundColor: Colors.primary,
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  earningsLabel: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  earningsAmount: { fontSize: 36, fontWeight: '900', color: Colors.white, marginBottom: 20 },
  earningsRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12 },
  earningsStat: { flex: 1, alignItems: 'center' },
  earningsStatNum: { fontSize: 20, fontWeight: '800', color: Colors.white },
  earningsStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  earningsDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, paddingHorizontal: 20, marginBottom: 12 },
  activeCard: {
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  activeTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  travName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  travSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  activeAmount: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  addressBlock: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 14,
  },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  addressIcon: { fontSize: 16, marginTop: 2 },
  addressLabel: { fontSize: 11, color: Colors.textLight, fontWeight: '600', marginBottom: 2 },
  addressText: { fontSize: 14, color: Colors.textPrimary, fontWeight: '500' },
  addressDivider: { height: 1, backgroundColor: Colors.border, marginVertical: 4 },
  navigateBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  navigateBtnText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  howCard: {
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 16,
  },
  howRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  howIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF5F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  howTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 },
  howDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
});
