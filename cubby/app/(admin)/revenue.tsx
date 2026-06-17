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
  totalPrice?: number;
  status: string;
  checkIn?: string;
  checkOut?: string;
}

export default function Revenue() {
  const [completedBookings, setCompletedBookings] = useState<Booking[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    try {
      const raw = await AsyncStorage.getItem('cubby_bookings');
      const bookings: Booking[] = raw ? JSON.parse(raw) : [];
      setCompletedBookings(bookings.filter(b => b.status === 'completed'));
    } catch {}
  }

  const totalRevenue = completedBookings.reduce((sum, b) => sum + (b.totalPrice ?? 0), 0);
  const cubbyCut = totalRevenue * 0.3;
  const hostCut = totalRevenue * 0.7;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Revenue</Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Revenue</Text>
            <Text style={styles.summaryValuePrimary}>R{totalRevenue.toFixed(0)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Cubby's 30%</Text>
            <Text style={styles.summaryValue}>R{cubbyCut.toFixed(0)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Hosts' 70%</Text>
            <Text style={styles.summaryValue}>R{hostCut.toFixed(0)}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Completed Bookings</Text>

        {completedBookings.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={styles.emptyText}>No completed bookings yet.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {completedBookings.map(booking => {
              const total = booking.totalPrice ?? 0;
              return (
                <View key={booking.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.travellerName}>{booking.travellerName || 'Unknown traveller'}</Text>
                      <Text style={styles.hostName}>@ {booking.hostName || 'Unknown host'}</Text>
                      {booking.checkIn && (
                        <Text style={styles.dates}>{booking.checkIn} → {booking.checkOut}</Text>
                      )}
                    </View>
                    <Text style={styles.totalAmount}>R{total.toFixed(0)}</Text>
                  </View>
                  <View style={styles.breakdown}>
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Cubby (30%)</Text>
                      <Text style={styles.breakdownValue}>R{(total * 0.3).toFixed(0)}</Text>
                    </View>
                    <View style={[styles.breakdownRow, { borderBottomWidth: 0 }]}>
                      <Text style={styles.breakdownLabel}>Host (70%)</Text>
                      <Text style={styles.breakdownValue}>R{(total * 0.7).toFixed(0)}</Text>
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
  summaryCard: {
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F0EAEA',
    overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  summaryDivider: { height: 1, backgroundColor: '#F0EAEA' },
  summaryLabel: { fontSize: 15, color: Colors.textSecondary, fontWeight: '500' },
  summaryValuePrimary: { fontSize: 20, fontWeight: '800', color: Colors.primary },
  summaryValue: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 10,
  },
  list: { paddingHorizontal: 20, gap: 12 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0EAEA',
    overflow: 'hidden',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  travellerName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  hostName: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  dates: { fontSize: 12, color: Colors.textLight, marginTop: 4 },
  totalAmount: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  breakdown: { borderTopWidth: 1, borderTopColor: '#F0EAEA' },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EAEA',
  },
  breakdownLabel: { fontSize: 13, color: Colors.textSecondary },
  breakdownValue: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, color: Colors.textSecondary },
});
