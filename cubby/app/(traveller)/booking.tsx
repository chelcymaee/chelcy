import { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, Linking,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { MOCK_HOSTS } from '../../src/lib/mock-data';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';

const TIME_SLOTS = [
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
];

export default function Booking() {
  const { hostId, bagCount } = useLocalSearchParams<{ hostId: string; bagCount: string }>();
  const host = MOCK_HOSTS.find(h => h.id === hostId);
  const bags = parseInt(bagCount ?? '1');

  const [dropTime, setDropTime] = useState('09:00');
  const [pickTime, setPickTime] = useState('15:00');
  const [loading, setLoading] = useState(false);

  if (!host) return null;

  const total = host.price_per_bag_per_day * bags;
  const platformFee = Math.round(total * 0.1);
  const grandTotal = total + platformFee;

  async function handleConfirm() {
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        // Get logged-in user's email
        const { data: { user } } = await supabase.auth.getUser();
        const travellerEmail = user?.email ?? '';

        // Create a pending booking record first so we have an ID
        const { data: booking, error: bookingError } = await supabase
          .from('bookings')
          .insert({
            host_id: host.id,
            traveller_id: user?.id,
            drop_off_date: new Date().toISOString().split('T')[0],
            drop_off_time: dropTime,
            pick_up_date: new Date().toISOString().split('T')[0],
            pick_up_time: pickTime,
            bag_count: bags,
            total_price: grandTotal,
            status: 'pending',
            pin_code: String(Math.floor(1000 + Math.random() * 9000)),
          })
          .select('id')
          .single();

        if (bookingError || !booking) {
          Alert.alert('Error', 'Could not create booking. Please try again.');
          return;
        }

        const { data, error } = await supabase.functions.invoke('create-payment', {
          body: {
            bookingId: booking.id,
            amount: grandTotal * 100, // send in cents
            bagCount: bags,
            hostName: host.display_name,
            travellerId: user?.id,
            travellerEmail,
          },
        });

        if (error || !data?.redirectUrl) {
          Alert.alert('Payment Error', 'Could not start payment. Please try again.');
          return;
        }

        // Open the Peach Payments checkout in the browser
        await Linking.openURL(data.redirectUrl);
      } else {
        // Supabase not yet configured — demo mode
        Alert.alert(
          'Coming Soon',
          'Payment processing will be available once Cubby goes live. Your booking has been saved.',
          [
            {
              text: 'OK',
              onPress: () =>
                router.replace({
                  pathname: '/(traveller)/booking-confirmation',
                  params: {
                    hostName: host.display_name,
                    dropOff: dropTime,
                    pickUp: pickTime,
                    bags: String(bags),
                    total: String(grandTotal),
                    pin: String(Math.floor(1000 + Math.random() * 9000)),
                  },
                }),
            },
          ],
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <TouchableOpacity style={styles.back} onPress={() => router.canGoBack() ? router.back() : router.replace('/(traveller)/explore')}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>Confirm booking</Text>

        {/* Host summary */}
        <View style={styles.hostCard}>
          <Text style={styles.hostCardEmoji}>
            {host.business_type === 'cafe' ? '☕' : host.business_type === 'home' ? '🏠' : '🛍️'}
          </Text>
          <View>
            <Text style={styles.hostCardName}>{host.display_name}</Text>
            <Text style={styles.hostCardLocation}>{host.location_name}</Text>
          </View>
        </View>

        {/* Date — today only for demo */}
        <Text style={styles.sectionTitle}>Date</Text>
        <View style={styles.dateBox}>
          <Text style={styles.dateText}>📅 Today — {new Date().toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
        </View>

        {/* Drop-off time */}
        <Text style={styles.sectionTitle}>Drop-off time</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.timeRow}>
            {TIME_SLOTS.filter(t => t >= host.available_from && t <= host.available_until).map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.timeChip, dropTime === t && styles.timeChipActive]}
                onPress={() => setDropTime(t)}
              >
                <Text style={[styles.timeText, dropTime === t && styles.timeTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Pick-up time */}
        <Text style={styles.sectionTitle}>Pick-up time</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.timeRow}>
            {TIME_SLOTS.filter(t => t > dropTime && t <= host.available_until).map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.timeChip, pickTime === t && styles.timeChipActive]}
                onPress={() => setPickTime(t)}
              >
                <Text style={[styles.timeText, pickTime === t && styles.timeTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Bag count */}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>🎒 Bags</Text>
          <Text style={styles.summaryValue}>{bags}</Text>
        </View>

        {/* Price breakdown */}
        <Text style={styles.sectionTitle}>Price breakdown</Text>
        <View style={styles.priceBox}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>R{host.price_per_bag_per_day} × {bags} bag{bags > 1 ? 's' : ''}</Text>
            <Text style={styles.priceValue}>R{total}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Platform fee (10%)</Text>
            <Text style={styles.priceValue}>R{platformFee}</Text>
          </View>
          <View style={styles.priceDivider} />
          <View style={styles.priceRow}>
            <Text style={styles.priceTotalLabel}>Total</Text>
            <Text style={styles.priceTotalValue}>R{grandTotal}</Text>
          </View>
        </View>

        {/* Trust note */}
        <View style={styles.trustNote}>
          <Text style={styles.trustIcon}>🔒</Text>
          <Text style={styles.trustText}>
            Your payment is held securely and only released to the host after successful pick-up.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Confirm bar */}
      <View style={styles.confirmBar}>
        <TouchableOpacity
          style={[styles.confirmBtn, loading && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.confirmText}>
            {loading ? 'Booking…' : `Pay R${grandTotal} & confirm`}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { padding: 20, paddingTop: 60 },
  back: { marginBottom: 16 },
  backText: { fontSize: 16, color: Colors.primary, fontWeight: '600' },
  heading: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, marginBottom: 20 },
  hostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  hostCardEmoji: { fontSize: 32 },
  hostCardName: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  hostCardLocation: { fontSize: 13, color: Colors.textSecondary },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 10, marginTop: 16 },
  dateBox: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dateText: { fontSize: 14, color: Colors.textPrimary },
  timeRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  timeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  timeChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  timeText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  timeTextActive: { color: Colors.white },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryLabel: { fontSize: 15, color: Colors.textPrimary },
  summaryValue: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  priceBox: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  priceLabel: { fontSize: 15, color: Colors.textSecondary },
  priceValue: { fontSize: 15, color: Colors.textPrimary },
  priceDivider: { height: 1, backgroundColor: Colors.border },
  priceTotalLabel: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  priceTotalValue: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  trustNote: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#EFF9F5',
    borderRadius: 12,
    padding: 14,
    marginTop: 20,
  },
  trustIcon: { fontSize: 18 },
  trustText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  confirmBar: {
    padding: 20,
    paddingBottom: 34,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  confirmBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmText: { fontSize: 17, fontWeight: '700', color: Colors.white },
});
