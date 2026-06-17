import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, FlatList } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../src/constants/colors';

const STATUS_COLOR: Record<string, string> = {
  pending: '#F59E0B', confirmed: '#3B82F6', active: '#10B981',
  completed: '#6B7280', cancelled: '#EF4444',
};

export default function AdminBookings() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [tab, setTab] = useState<'all' | 'active' | 'completed'>('all');

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem('cubby_bookings').then(raw => {
      setBookings(raw ? JSON.parse(raw) : []);
    });
  }, []));

  const filtered = tab === 'all' ? bookings
    : tab === 'active' ? bookings.filter(b => ['pending','confirmed','active'].includes(b.status))
    : bookings.filter(b => b.status === 'completed');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>All Bookings</Text>
      </View>

      <View style={styles.tabs}>
        {(['all','active','completed'] as const).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardHost}>{item.host?.display_name ?? item.hostName ?? 'Unknown host'}</Text>
                <Text style={styles.cardTraveller}>👤 {item.traveller_name ?? 'Traveller'}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: (STATUS_COLOR[item.status] ?? '#6B7280') + '20' }]}>
                <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] ?? '#6B7280' }]}>{(item.status ?? '').toUpperCase()}</Text>
              </View>
            </View>
            <View style={styles.cardDetails}>
              <Text style={styles.detail}>📅 {item.drop_off_date ?? item.date ?? '—'}</Text>
              <Text style={styles.detail}>🧳 {item.bag_count ?? item.bags ?? '—'} bags</Text>
              <Text style={styles.detail}>💰 R{item.total_price ?? item.totalPrice ?? '—'}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🎟️</Text>
            <Text style={styles.emptyTitle}>No bookings yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  backText: { fontSize: 15, color: Colors.primary, fontWeight: '600', marginBottom: 12 },
  heading: { fontSize: 26, fontWeight: '900', color: '#1A1A1A' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F0EAEA', backgroundColor: '#fff' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: Colors.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: Colors.primary, fontWeight: '800' },
  list: { padding: 16, gap: 12, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  cardHost: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  cardTraveller: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  cardDetails: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  detail: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
});
