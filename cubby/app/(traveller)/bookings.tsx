import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';
import { Colors } from '../../src/constants/colors';

const STATUS_COLOR: Record<string, string> = {
  pending: '#F59E0B',
  confirmed: '#3B82F6',
  active: '#10B981',
  completed: '#6B7280',
  cancelled: '#EF4444',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function Bookings() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    loadBookings();
  }, []));

  async function loadBookings() {
    try {
      if (isSupabaseConfigured) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('bookings')
            .select('*, hosts(display_name, location_name)')
            .eq('traveller_id', user.id)
            .order('created_at', { ascending: false });
          if (data) { setBookings(data); return; }
        }
      }
      const raw = await AsyncStorage.getItem('cubby_bookings');
      setBookings(raw ? JSON.parse(raw) : []);
    } catch {
      setBookings([]);
    }
  }

  async function cancelBooking(bookingId: string) {
    setCancellingId(bookingId);
    try {
      if (isSupabaseConfigured) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId).eq('traveller_id', user.id);
        }
      }
      // Update AsyncStorage too
      const raw = await AsyncStorage.getItem('cubby_bookings');
      if (raw) {
        const all = JSON.parse(raw).map((b: any) =>
          b.id === bookingId ? { ...b, status: 'cancelled' } : b
        );
        await AsyncStorage.setItem('cubby_bookings', JSON.stringify(all));
      }
      await loadBookings();
    } finally {
      setCancellingId(null);
      setConfirmCancelId(null);
    }
  }

  const upcoming = bookings.filter(b => ['pending', 'confirmed', 'active'].includes(b.status ?? 'confirmed'));
  const past = bookings.filter(b => ['completed', 'cancelled'].includes(b.status ?? ''));
  const shown = tab === 'upcoming' ? upcoming : past;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>My Bookings</Text>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, tab === 'upcoming' && styles.tabActive]}
          onPress={() => setTab('upcoming')}
          // @ts-ignore
          onClick={() => setTab('upcoming')}
        >
          <Text style={[styles.tabText, tab === 'upcoming' && styles.tabTextActive]}>
            Upcoming{upcoming.length > 0 ? ` (${upcoming.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'past' && styles.tabActive]}
          onPress={() => setTab('past')}
          // @ts-ignore
          onClick={() => setTab('past')}
        >
          <Text style={[styles.tabText, tab === 'past' && styles.tabTextActive]}>
            Past{past.length > 0 ? ` (${past.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {shown.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🎟️</Text>
            <Text style={styles.emptyTitle}>
              {tab === 'upcoming' ? 'No upcoming bookings' : 'No past bookings'}
            </Text>
            <Text style={styles.emptySub}>
              {tab === 'upcoming'
                ? 'Find a storage spot and book it to see it here.'
                : 'Your completed bookings will appear here.'}
            </Text>
            {tab === 'upcoming' && (
              <TouchableOpacity
                style={styles.exploreBtn}
                onPress={() => router.replace('/(traveller)/explore')}
                // @ts-ignore
                onClick={() => router.replace('/(traveller)/explore')}
              >
                <Text style={styles.exploreBtnText}>Find storage →</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          shown.map(booking => {
            const status = booking.status ?? 'confirmed';
            const statusColor = STATUS_COLOR[status] ?? '#6B7280';
            const hostName = booking.hosts?.display_name ?? booking.hostName ?? booking.host?.display_name ?? 'Your host';
            const locationName = booking.hosts?.location_name ?? booking.locationName ?? '';
            const date = booking.drop_off_date ?? booking.date ?? '';
            const dropOff = booking.drop_off_time ?? booking.dropOff ?? '';
            const pickUp = booking.pick_up_time ?? booking.pickUp ?? '';
            const bags = booking.bag_count ?? booking.bags ?? 1;
            const total = booking.total_price ?? booking.totalPrice ?? 0;
            const pinCode = booking.pin_code ?? booking.pin ?? '';

            return (
              <View key={booking.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardHost}>{hostName}</Text>
                    {!!locationName && <Text style={styles.cardLocation}>📍 {locationName}</Text>}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {STATUS_LABEL[status] ?? status}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardDetails}>
                  {!!date && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailIcon}>📅</Text>
                      <Text style={styles.detailText}>{date}</Text>
                    </View>
                  )}
                  {(!!dropOff || !!pickUp) && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailIcon}>🕐</Text>
                      <Text style={styles.detailText}>{dropOff}{dropOff && pickUp ? ' → ' : ''}{pickUp}</Text>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>🎒</Text>
                    <Text style={styles.detailText}>{bags} bag{Number(bags) !== 1 ? 's' : ''}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>💰</Text>
                    <Text style={styles.detailText}>R{total}</Text>
                  </View>
                </View>

                {!!pinCode && status !== 'completed' && status !== 'cancelled' && (
                  <View style={styles.pinCard}>
                    <Text style={styles.pinLabel}>Your drop-off PIN</Text>
                    <Text style={styles.pinCode}>{pinCode}</Text>
                    <Text style={styles.pinHint}>Show this to your host on arrival</Text>
                  </View>
                )}

                {status === 'completed' && (
                  <TouchableOpacity
                    style={styles.reviewBtn}
                    onPress={() => router.push({ pathname: '/(traveller)/review', params: { hostId: booking.hostId ?? booking.host_id, hostName, bookingId: booking.id } })}
                    // @ts-ignore
                    onClick={() => router.push({ pathname: '/(traveller)/review', params: { hostId: booking.hostId ?? booking.host_id, hostName, bookingId: booking.id } })}
                  >
                    <Text style={styles.reviewBtnText}>✏️ Leave a review</Text>
                  </TouchableOpacity>
                )}

                {['pending', 'confirmed'].includes(status) && (
                  confirmCancelId === booking.id ? (
                    <View style={{ gap: 8 }}>
                      <Text style={{ fontSize: 13, color: '#DC2626', fontWeight: '600', textAlign: 'center' }}>Cancel this booking?</Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          style={{ flex: 1, backgroundColor: '#DC2626', borderRadius: 10, padding: 10, alignItems: 'center', opacity: cancellingId === booking.id ? 0.6 : 1 }}
                          onPress={() => cancelBooking(booking.id)}
                          // @ts-ignore
                          onClick={() => cancelBooking(booking.id)}
                          disabled={cancellingId === booking.id}
                        >
                          <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>{cancellingId === booking.id ? 'Cancelling…' : 'Yes, cancel'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{ flex: 1, backgroundColor: 'white', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' }}
                          onPress={() => setConfirmCancelId(null)}
                          // @ts-ignore
                          onClick={() => setConfirmCancelId(null)}
                        >
                          <Text style={{ color: '#6B7280', fontWeight: '700', fontSize: 13 }}>Keep</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => setConfirmCancelId(booking.id)}
                      // @ts-ignore
                      onClick={() => setConfirmCancelId(booking.id)}
                    >
                      <Text style={styles.cancelBtnText}>Cancel booking</Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  heading: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.white,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#FF5C5C' },
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: '#FF5C5C', fontWeight: '800' },
  list: { padding: 16, gap: 16 },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 20 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8, textAlign: 'center' },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  exploreBtn: { backgroundColor: '#FF5C5C', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28 },
  exploreBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  card: { backgroundColor: Colors.white, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardHost: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  cardLocation: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  cardDetails: { gap: 6 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailIcon: { fontSize: 14, width: 20 },
  detailText: { fontSize: 14, color: Colors.textSecondary },
  pinCard: { backgroundColor: Colors.primary, borderRadius: 14, padding: 14, alignItems: 'center' },
  pinLabel: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginBottom: 4 },
  pinCode: { fontSize: 36, fontWeight: '900', color: '#fff', letterSpacing: 8, marginBottom: 4 },
  pinHint: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  reviewBtn: { borderWidth: 1.5, borderColor: '#FF5C5C', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  reviewBtnText: { fontSize: 14, fontWeight: '700', color: '#FF5C5C' },
  cancelBtn: { borderWidth: 1.5, borderColor: '#DC2626', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: '#DC2626' },
});
