import { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity } from 'react-native';
import { Colors } from '../../src/constants/colors';

type DeliveryStatus = 'pending' | 'accepted' | 'declined';

interface DeliveryRequest {
  id: string;
  traveller: string;
  bags: number;
  pickup_address: string;
  dropoff_address: string;
  pickup_time: string;
  date: string;
  total: number;
  status: DeliveryStatus;
}

const INITIAL_DELIVERIES: DeliveryRequest[] = [
  {
    id: '1',
    traveller: 'Sarah T.',
    bags: 2,
    pickup_address: '12 Long Street, City Bowl',
    dropoff_address: 'V&A Waterfront',
    pickup_time: '10:30',
    date: 'Today',
    total: 120,
    status: 'pending',
  },
  {
    id: '2',
    traveller: 'Luca B.',
    bags: 3,
    pickup_address: 'Cape Town International Airport',
    dropoff_address: 'Sea Point Promenade',
    pickup_time: '13:00',
    date: 'Today',
    total: 180,
    status: 'pending',
  },
  {
    id: '3',
    traveller: 'Anika R.',
    bags: 1,
    pickup_address: 'Airbnb, De Waterkant',
    dropoff_address: 'Cape Town Station',
    pickup_time: '08:45',
    date: 'Yesterday',
    total: 60,
    status: 'accepted',
  },
];

export default function Deliveries() {
  const [deliveries, setDeliveries] = useState<DeliveryRequest[]>(INITIAL_DELIVERIES);

  function accept(id: string) {
    setDeliveries(d => d.map(req => req.id === id ? { ...req, status: 'accepted' } : req));
  }
  function decline(id: string) {
    setDeliveries(d => d.map(req => req.id === id ? { ...req, status: 'declined' } : req));
  }

  function renderItem({ item }: { item: DeliveryRequest }) {
    const statusColor = item.status === 'accepted' ? Colors.success : item.status === 'declined' ? Colors.error : Colors.warning;
    const statusLabel = item.status === 'accepted' ? '✓ Accepted' : item.status === 'declined' ? '✕ Declined' : '⏳ Pending';

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.avatar}>
            <Text style={{ fontSize: 22 }}>👤</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.traveller}</Text>
            <Text style={styles.sub}>{item.bags} bag{item.bags > 1 ? 's' : ''} · Pickup at {item.pickup_time}</Text>
            <Text style={styles.date}>{item.date}</Text>
          </View>
          <View>
            <Text style={styles.amount}>R{item.total}</Text>
            <Text style={[styles.status, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        <View style={styles.addressBlock}>
          <View style={styles.addressRow}>
            <Text style={styles.addressIcon}>📍</Text>
            <Text style={styles.addressText} numberOfLines={1}>{item.pickup_address}</Text>
          </View>
          <View style={styles.addressRow}>
            <Text style={styles.addressIcon}>🏁</Text>
            <Text style={styles.addressText} numberOfLines={1}>{item.dropoff_address}</Text>
          </View>
        </View>

        {item.status === 'pending' && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.acceptBtn} onPress={() => accept(item.id)}>
              <Text style={styles.acceptText}>✓ Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.declineBtn} onPress={() => decline(item.id)}>
              <Text style={styles.declineText}>✕ Decline</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  const pending = deliveries.filter(d => d.status === 'pending').length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Delivery Requests</Text>
        {pending > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{pending} new</Text>
          </View>
        )}
      </View>

      <FlatList
        data={deliveries}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🚗</Text>
            <Text style={styles.emptyText}>No delivery requests yet{'\n'}Go available to start receiving requests</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 20, paddingTop: 8 },
  heading: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary },
  badge: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 12, fontWeight: '700', color: Colors.white },
  list: { padding: 20, gap: 14, paddingBottom: 40 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  sub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  date: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  amount: { fontSize: 16, fontWeight: '800', color: Colors.primary, textAlign: 'right' },
  status: { fontSize: 12, fontWeight: '600', textAlign: 'right', marginTop: 4 },
  addressBlock: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 10,
    gap: 6,
    marginBottom: 12,
  },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addressIcon: { fontSize: 14 },
  addressText: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  actions: { flexDirection: 'row', gap: 10 },
  acceptBtn: {
    flex: 1, backgroundColor: Colors.primary, borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  acceptText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  declineBtn: {
    flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  declineText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 15 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24 },
});
