import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { MOCK_BOOKINGS } from '../../src/lib/mock-data';
import { Booking } from '../../src/types';

const STATUS_COLOR: Record<Booking['status'], string> = {
  pending: Colors.warning,
  confirmed: Colors.info,
  active: Colors.success,
  completed: Colors.textSecondary,
  cancelled: Colors.error,
};

const STATUS_LABEL: Record<Booking['status'], string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function BookingCard({ booking }: { booking: Booking }) {
  const typeEmoji: Record<string, string> = {
    cafe: '☕', home: '🏠', shop: '🛍️', guesthouse: '🏨', other: '📦',
  };

  return (
    <View style={styles.card}>
      {/* Top */}
      <View style={styles.cardTop}>
        <View style={styles.cardTopLeft}>
          <Text style={styles.cardEmoji}>{typeEmoji[booking.host.business_type]}</Text>
          <View>
            <Text style={styles.cardName}>{booking.host.display_name}</Text>
            <Text style={styles.cardLocation}>{booking.host.location_name}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[booking.status] + '20' }]}>
          <Text style={[styles.statusText, { color: STATUS_COLOR[booking.status] }]}>
            {STATUS_LABEL[booking.status]}
          </Text>
        </View>
      </View>

      {/* Details */}
      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Drop-off</Text>
          <Text style={styles.detailValue}>{booking.drop_off_time}</Text>
        </View>
        <View style={styles.detailDivider} />
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Pick-up</Text>
          <Text style={styles.detailValue}>{booking.pick_up_time}</Text>
        </View>
        <View style={styles.detailDivider} />
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Bags</Text>
          <Text style={styles.detailValue}>{booking.bag_count}</Text>
        </View>
        <View style={styles.detailDivider} />
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Total</Text>
          <Text style={styles.detailValue}>R{booking.total_price}</Text>
        </View>
      </View>

      {/* PIN code for confirmed/active */}
      {(booking.status === 'confirmed' || booking.status === 'active') && (
        <View style={styles.pinBox}>
          <Text style={styles.pinLabel}>Your drop-off PIN</Text>
          <Text style={styles.pinCode}>{booking.pin_code}</Text>
          <Text style={styles.pinHint}>Show this to your host on arrival</Text>
        </View>
      )}

      {/* Leave a review for completed bookings */}
      {booking.status === 'completed' && (
        <TouchableOpacity
          style={{ margin: 12, marginTop: 0, backgroundColor: Colors.accent, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
          onPress={() => router.push({ pathname: '/(traveller)/review', params: { hostName: booking.host.display_name } })}
        >
          <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.white }}>⭐ Leave a review</Text>
        </TouchableOpacity>
      )}

      {/* Date */}
      <Text style={styles.date}>{booking.drop_off_date}</Text>
    </View>
  );
}

export default function Bookings() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>My Bookings</Text>
      </View>

      <FlatList
        data={MOCK_BOOKINGS}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <BookingCard booking={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🎟️</Text>
            <Text style={styles.emptyTitle}>No bookings yet</Text>
            <Text style={styles.emptyText}>Find a Cubby host and store your bags</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push('/(traveller)/explore')}
            >
              <Text style={styles.emptyBtnText}>Find a host</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: 20, paddingTop: 8 },
  heading: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary },
  list: { padding: 20, gap: 16, paddingBottom: 40 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  cardTopLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardEmoji: { fontSize: 28 },
  cardName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  cardLocation: { fontSize: 13, color: Colors.textSecondary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '700' },
  details: {
    flexDirection: 'row',
    padding: 16,
  },
  detailItem: { flex: 1, alignItems: 'center' },
  detailLabel: { fontSize: 11, color: Colors.textLight, marginBottom: 4 },
  detailValue: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  detailDivider: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },
  pinBox: {
    backgroundColor: Colors.primary,
    margin: 12,
    marginTop: 0,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  pinLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  pinCode: { fontSize: 36, fontWeight: '900', color: Colors.white, letterSpacing: 8 },
  pinHint: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 6 },
  date: { fontSize: 12, color: Colors.textLight, textAlign: 'center', paddingBottom: 14 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 52, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  emptyText: { fontSize: 15, color: Colors.textSecondary, marginBottom: 24 },
  emptyBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  emptyBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
});
