import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { Colors } from '../../src/constants/colors';

interface Booking {
  id: string;
  travellerName?: string;
  hostName?: string;
  checkIn?: string;
  checkOut?: string;
  bags?: number;
  totalPrice?: number;
  status: string;
}

type Filter = 'all' | 'active' | 'completed';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: '#DCFCE7', text: '#16A34A' },
  completed: { bg: '#EFF6FF', text: '#2563EB' },
  cancelled: { bg: '#FEF2F2', text: '#DC2626' },
  pending: { bg: '#FFFBEB', text: '#D97706' },
};

export default function Bookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<Filter>('all');

  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, [])
  );

  async function loadBookings() {
    try {
      const raw = await AsyncStorage.getItem('cubby_bookings');
      setBookings(raw ? JSON.parse(raw) : []);
    } catch {}
  }

  const filtered = bookings.filter(b => {
    if (filter === 'all') return true;
    return b.status === filter;
  });

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Completed' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Bookings</Text>
        </View>

        <View style={styles.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📦</Text>
            <Text style={styles.emptyText}>No bookings found.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filtered.map(booking => {
              const statusStyle = STATUS_COLORS[booking.status] || STATUS_COLORS['pending'];
              return (
                <View key={booking.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.travellerName}>{booking.travellerName || 'Unknown traveller'}</Text>
                      <Text style={styles.hostName}>@ {booking.hostName || 'Unknown host'}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
                      <Text style={[styles.badgeText, { color: statusStyle.text }]}>
                        {booking.status}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardDetails}>
                    {booking.checkIn && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Check-in</Text>
                        <Text style={styles.detailValue}>{booking.checkIn}</Text>
                      </View>
                    )}
                    {booking.checkOut && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Check-out</Text>
                        <Text style={styles.detailValue}>{booking.checkOut}</Text>
                      </View>
                    )}
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Bags</Text>
                      <Text style={styles.detailValue}>{booking.bags ?? '—'}</Text>
                    </View>
                    <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                      <Text style={styles.detailLabel}>Total</Text>
                      <Text style={[styles.detailValue, styles.totalValue]}>
                        R{(booking.totalPrice ?? 0).toFixed(0)}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  backLink: { fontSize: 16, color: Colors.primary, fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 16,
    marginTop: 4,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#F0EAEA',
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  filterTextActive: { color: Colors.white },
  list: { paddingHorizontal: 20, gap: 12 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0EAEA',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  travellerName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  hostName: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  cardDetails: { borderTopWidth: 1, borderTopColor: '#F0EAEA' },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EAEA',
  },
  detailLabel: { fontSize: 14, color: Colors.textSecondary },
  detailValue: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  totalValue: { color: Colors.primary, fontWeight: '800' },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, color: Colors.textSecondary },
});
