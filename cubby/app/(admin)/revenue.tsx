import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Revenue() {
  const [bookings, setBookings] = useState<any[]>([]);

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem('cubby_bookings').then(raw => {
      const all = raw ? JSON.parse(raw) : [];
      setBookings(all.filter((b: any) => b.status === 'completed'));
    });
  }, []));

  const total = bookings.reduce((sum, b) => sum + (b.total_price ?? b.totalPrice ?? 0), 0);
  const cubbyShare = total * 0.3;
  const hostShare = total * 0.7;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(admin)/dashboard')}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.heading}>Revenue</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Total Revenue</Text>
          <Text style={styles.summaryTotal}>R{total.toFixed(2)}</Text>
          <View style={styles.splitRow}>
            <View style={styles.splitItem}>
              <Text style={styles.splitLabel}>Cubby (30%)</Text>
              <Text style={styles.splitValue}>R{cubbyShare.toFixed(2)}</Text>
            </View>
            <View style={styles.splitDivider} />
            <View style={styles.splitItem}>
              <Text style={styles.splitLabel}>Hosts (70%)</Text>
              <Text style={styles.splitValue}>R{hostShare.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Completed Bookings</Text>
        {bookings.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>💰</Text>
            <Text style={styles.emptyTitle}>No completed bookings yet</Text>
          </View>
        ) : bookings.map(b => {
          const price = b.total_price ?? b.totalPrice ?? 0;
          return (
            <View key={b.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowHost}>{b.host?.display_name ?? b.hostName ?? 'Host'}</Text>
                <Text style={styles.rowDate}>{b.drop_off_date ?? b.date ?? '—'} · {b.bag_count ?? b.bags ?? '—'} bags</Text>
              </View>
              <View style={styles.rowAmounts}>
                <Text style={styles.rowTotal}>R{price}</Text>
                <Text style={styles.rowSplit}>↳ R{(price * 0.3).toFixed(0)} / R{(price * 0.7).toFixed(0)}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  backText: { fontSize: 15, color: Colors.primary, fontWeight: '600', marginBottom: 12 },
  heading: { fontSize: 26, fontWeight: '900', color: '#1A1A1A' },
  summaryCard: { margin: 16, backgroundColor: Colors.primary, borderRadius: 20, padding: 24, alignItems: 'center' },
  summaryTitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryTotal: { fontSize: 42, fontWeight: '900', color: '#fff', marginBottom: 20 },
  splitRow: { flexDirection: 'row', width: '100%', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: 16 },
  splitItem: { flex: 1, alignItems: 'center' },
  splitDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)', marginVertical: 4 },
  splitLabel: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginBottom: 4, fontWeight: '600' },
  splitValue: { fontSize: 20, fontWeight: '800', color: '#fff' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1A1A1A', paddingHorizontal: 20, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, borderRadius: 14, padding: 16 },
  rowHost: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  rowDate: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  rowAmounts: { alignItems: 'flex-end' },
  rowTotal: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  rowSplit: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#6B7280' },
});
