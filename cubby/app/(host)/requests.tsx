import { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity } from 'react-native';
import { Colors } from '../../src/constants/colors';

type RequestStatus = 'pending' | 'accepted' | 'declined';

interface StorageRequest {
  id: string;
  traveller: string;
  bags: number;
  dropOff: string;
  pickUp: string;
  date: string;
  total: number;
  status: RequestStatus;
}

const INITIAL_REQUESTS: StorageRequest[] = [
  { id: '1', traveller: 'Sarah T.', bags: 2, dropOff: '09:00', pickUp: '15:00', date: 'Today', total: 160, status: 'pending' },
  { id: '2', traveller: 'Luca B.', bags: 3, dropOff: '11:00', pickUp: '19:00', date: 'Today', total: 240, status: 'pending' },
  { id: '3', traveller: 'Anika R.', bags: 1, dropOff: '08:30', pickUp: '14:00', date: 'Yesterday', total: 80, status: 'accepted' },
];

export default function Requests() {
  const [requests, setRequests] = useState<StorageRequest[]>(INITIAL_REQUESTS);

  function accept(id: string) {
    setRequests(r => r.map(req => req.id === id ? { ...req, status: 'accepted' } : req));
  }
  function decline(id: string) {
    setRequests(r => r.map(req => req.id === id ? { ...req, status: 'declined' } : req));
  }

  function renderItem({ item }: { item: StorageRequest }) {
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
            <Text style={styles.sub}>{item.bags} bag{item.bags > 1 ? 's' : ''} · {item.dropOff} – {item.pickUp}</Text>
            <Text style={styles.date}>{item.date}</Text>
          </View>
          <View>
            <Text style={styles.amount}>R{item.total}</Text>
            <Text style={[styles.status, { color: statusColor }]}>{statusLabel}</Text>
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

  const pending = requests.filter(r => r.status === 'pending').length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Booking Requests</Text>
        {pending > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{pending} new</Text>
          </View>
        )}
      </View>

      <FlatList
        data={requests}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
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
  list: { padding: 20, gap: 14 },
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
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
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
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
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
});
