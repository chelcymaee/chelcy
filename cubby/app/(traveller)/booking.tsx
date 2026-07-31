import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { Colors } from '../../src/constants/colors';
import { supabase, isSupabaseConfigured, SUPABASE_URL } from '../../src/lib/supabase';
import { MOCK_HOSTS } from '../../src/lib/mock-data';
import DatePickerModal, { todayISO, formatDateLabel } from '../../src/components/DatePickerModal';

const TIME_SLOTS = [
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
];

// Maps paygate-initiate's structured `code` field (see
// supabase/functions/paygate-initiate/index.ts) to a traveller-facing
// message. Codes that shouldn't be reachable from this screen in practice
// (e.g. NOT_PAYABLE, "Traveller email not found" — this screen always
// creates a fresh pending_payment booking and only reaches this call while
// signed in) still get a real message rather than the generic fallback, in
// case a race or stale profile ever does hit them.
// supabase-js's functions.invoke() does NOT parse the response body into
// `data` on a non-2xx response — it throws a FunctionsHttpError whose
// `.context` is the raw, unread Response object instead (confirmed against
// the installed @supabase/functions-js source, and against
// paygate-initiate/index.ts, which always responds with a real JSON body
// on every error path). `data?.code` is therefore always undefined on
// failure; this reads the actual structured `{error, code}` body
// paygate-initiate sent.
async function extractPaygateErrorCode(error: unknown): Promise<string | undefined> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      return body?.code;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function paygateInitiateErrorMessage(code: string | undefined): string {
  switch (code) {
    case 'PAYGATE_NOT_CONFIGURED':
      return 'Payments are not available yet. Please contact support.';
    case 'NOT_PAYABLE':
      return 'This booking is no longer available for payment.';
    case 'PAYGATE_TIMEOUT':
    case 'PAYGATE_UNREACHABLE':
      return 'Could not reach the payment provider. Please check your connection and try again.';
    default:
      return 'Could not start payment. Please try again.';
  }
}

function normalizeHost(raw: any) {
  return {
    id: raw.id,
    display_name: raw.display_name ?? raw.displayName ?? '',
    business_type: raw.business_type ?? raw.businessType ?? 'other',
    location_name: raw.location_name ?? raw.locationName ?? '',
    price_per_bag_per_day: raw.price_per_bag_per_day ?? raw.pricePerBag ?? 100,
    available_from: raw.available_from ?? raw.availableFrom ?? '08:00',
    available_until: raw.available_until ?? raw.availableUntil ?? '20:00',
  };
}

export default function Booking() {
  const { hostId, bagCount, selectedDate: paramDate } = useLocalSearchParams<{ hostId: string; bagCount: string; selectedDate: string }>();
  const bags = parseInt(bagCount ?? '1');

  const [host, setHost] = useState<any>(null);
  const [hostLoading, setHostLoading] = useState(true);
  const [bookingDate, setBookingDate] = useState(paramDate && paramDate.length === 10 ? paramDate : todayISO());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dropTime, setDropTime] = useState('09:00');
  const [pickTime, setPickTime] = useState('15:00');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  // PIN generated once per booking screen mount — stable across re-renders
  const [pin] = useState(() => String(Math.floor(1000 + Math.random() * 9000)));

  // Load host from AsyncStorage or Supabase — NOT from empty MOCK_HOSTS
  useEffect(() => {
    async function loadHost() {
      if (!hostId) { setHostLoading(false); return; }
      try {
        if (isSupabaseConfigured) {
          const { data } = await supabase.from('hosts').select('*').eq('id', hostId).single();
          if (data) { setHost(normalizeHost(data)); setHostLoading(false); return; }
        }
        // Try AsyncStorage (admin-created hosts)
        const raw = await AsyncStorage.getItem('cubby_hosts');
        if (raw) {
          const found = JSON.parse(raw).find((h: any) => h.id === hostId);
          if (found) { setHost(normalizeHost(found)); setHostLoading(false); return; }
        }
        // Fallback to mock data
        const mock = MOCK_HOSTS.find(h => h.id === hostId);
        if (mock) setHost(normalizeHost(mock));
      } catch {}
      setHostLoading(false);
    }
    loadHost();
  }, [hostId]);

  if (hostLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: Colors.textSecondary, fontSize: 16 }}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!host) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>😕</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 }}>Host not found</Text>
          <Text style={{ fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginBottom: 24 }}>
            We couldn't load this host's details. Please go back and try again.
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 24 }}
            onPress={() => router.replace('/(traveller)/explore')}
            // @ts-ignore
            onClick={() => router.replace('/(traveller)/explore')}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Back to explore</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const total = host.price_per_bag_per_day * bags;
  const platformFee = Math.round(total * 0.1);
  const grandTotal = total + platformFee;

  const isToday = bookingDate === todayISO();
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const availableDropSlots = isToday
    ? TIME_SLOTS.filter(t => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m > nowMinutes + 30;
      })
    : TIME_SLOTS;
  const availablePickSlots = TIME_SLOTS.filter(t => t > dropTime);

  async function handleConfirm() {
    setErrorMsg('');
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { data: { user } } = await supabase.auth.getUser();

        const { data: booking, error: bookingError } = await supabase
          .from('bookings')
          .insert({
            host_id: host.id,
            traveller_id: user?.id,
            drop_off_date: bookingDate,
            drop_off_time: dropTime,
            pick_up_date: bookingDate,
            pick_up_time: pickTime,
            bag_count: bags,
            total_price: grandTotal,
            status: 'pending_payment',
            payment_provider: 'paygate',
            pin_code: pin,
          })
          .select('id')
          .single();

        if (bookingError || !booking) {
          setErrorMsg('Could not create booking. Please try again.');
          return;
        }

        // paygate-initiate re-derives AMOUNT/EMAIL server-side from the
        // booking/profile row itself — bookingId is the only input trusted
        // from the client, same principle payfast-create used.
        const { data, error } = await supabase.functions.invoke('paygate-initiate', {
          body: { bookingId: booking.id },
        });

        if (error || !data?.ok || !data?.payRequestId || !data?.checksum) {
          // Clean up the pending booking so it doesn't clutter the user's list
          await supabase.from('bookings').delete().eq('id', booking.id);
          const code = error ? await extractPaygateErrorCode(error) : data?.code;
          setErrorMsg(paygateInitiateErrorMessage(code));
          return;
        }

        // paygate-initiate only returns the already-verified PAY_REQUEST_ID +
        // CHECKSUM, not a full URL — paygate-redirect is what turns them into
        // the actual hosted-checkout hop, so the URL is built here.
        const redirectUrl =
          `${SUPABASE_URL}/functions/v1/paygate-redirect` +
          `?payRequestId=${encodeURIComponent(data.payRequestId)}` +
          `&checksum=${encodeURIComponent(data.checksum)}`;

        // Open hosted payment page in an in-app browser that auto-closes on deep link return
        if (Platform.OS === 'web') {
          // On web, open in same tab — paygate-return redirects back via JS
          window.location.href = redirectUrl;
          return;
        }

        const result = await WebBrowser.openAuthSessionAsync(
          redirectUrl,
          'cubby://payment-result',
        );

        if (result.type === 'success') {
          const parsed = Linking.parse(result.url);
          const status = parsed.queryParams?.status as string | undefined;
          // paygate-return only ever reports 'success' | 'pending' | 'failed'
          // (PayWeb3 has no separate CANCEL_URL — a cancelled PayGate
          // checkout arrives back here as a non-approved TRANSACTION_STATUS,
          // which paygate-return maps to 'pending' or 'failed' from the
          // booking's own DB status, same as any other non-approved outcome).
          if (status === 'success') {
            router.replace({
              pathname: '/(traveller)/booking-confirmation',
              params: {
                hostName: host.display_name,
                dropOff: dropTime,
                pickUp: pickTime,
                bags: String(bags),
                total: String(grandTotal),
                pin,
                date: bookingDate,
              },
            });
          } else if (status === 'pending') {
            setErrorMsg('Payment is processing. Check your bookings tab in a few minutes.');
          } else {
            // 'failed', or any unrecognised value — same generic message,
            // since paygate-return never discloses more than these three.
            setErrorMsg('Payment was not completed. Please try again.');
          }
        } else if (result.type === 'cancel') {
          // The traveller closed the in-app browser themselves before any
          // PayGate redirect happened — distinct from a PayGate-reported
          // decline, which comes back as status=failed/pending above.
          setErrorMsg('Payment was cancelled.');
        } else {
          setErrorMsg('Payment failed. Please try again.');
        }
      } else {
        // Demo mode: save booking to AsyncStorage then go to confirmation
        const bookingId = `booking-${Date.now()}`;
        const newBooking = {
          id: bookingId,
          hostId: host.id,
          hostName: host.display_name,
          drop_off_date: bookingDate,
          drop_off_time: dropTime,
          pick_up_date: bookingDate,
          pick_up_time: pickTime,
          bag_count: bags,
          total_price: grandTotal,
          status: 'confirmed',
          pin_code: pin,
          created_at: new Date().toISOString(),
        };

        // Save to AsyncStorage so it appears in bookings list
        const existingRaw = await AsyncStorage.getItem('cubby_bookings');
        const existing = existingRaw ? JSON.parse(existingRaw) : [];
        await AsyncStorage.setItem('cubby_bookings', JSON.stringify([newBooking, ...existing]));

        router.replace({
          pathname: '/(traveller)/booking-confirmation',
          params: {
            hostName: host.display_name,
            dropOff: dropTime,
            pickUp: pickTime,
            bags: String(bags),
            total: String(grandTotal),
            pin,
            date: bookingDate,
          },
        });
      }
    } finally {
      setLoading(false);
    }
  }

  const goBack = () => router.replace('/(traveller)/explore');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.back} onPress={goBack}
          // @ts-ignore
          onClick={goBack}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        {!!errorMsg && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>⚠️ {errorMsg}</Text>
          </View>
        )}

        <Text style={styles.heading}>Confirm booking</Text>

        <View style={styles.hostCard}>
          <Text style={styles.hostCardEmoji}>
            {host.business_type === 'café' || host.business_type === 'cafe' ? '☕' : host.business_type === 'home' ? '🏠' : host.business_type === 'hotel' ? '🏨' : '🛍️'}
          </Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.hostCardName}>{host.display_name}</Text>
            <Text style={styles.hostCardLocation}>{host.location_name}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Date</Text>
        <TouchableOpacity
          style={styles.dateBox}
          onPress={() => setShowDatePicker(true)}
          // @ts-ignore
          onClick={() => setShowDatePicker(true)}
        >
          <Text style={styles.dateText}>📅 {formatDateLabel(bookingDate)}</Text>
          <Text style={styles.dateChangeHint}>Change</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Drop-off time</Text>
        {availableDropSlots.length === 0 ? (
          <View style={styles.noSlotsBox}>
            <Text style={styles.noSlotsText}>No more drop-off slots today. Please pick a future date.</Text>
          </View>
        ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.timeRow}>
            {availableDropSlots.map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.timeChip, dropTime === t && styles.timeChipActive]}
                onPress={() => setDropTime(t)}
                // @ts-ignore
                onClick={() => setDropTime(t)}
              >
                <Text style={[styles.timeText, dropTime === t && styles.timeTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        )}

        <Text style={styles.sectionTitle}>Pick-up time</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.timeRow}>
            {availablePickSlots.map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.timeChip, pickTime === t && styles.timeChipActive]}
                onPress={() => setPickTime(t)}
                // @ts-ignore
                onClick={() => setPickTime(t)}
              >
                <Text style={[styles.timeText, pickTime === t && styles.timeTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>🎒 Bags</Text>
          <Text style={styles.summaryValue}>{bags}</Text>
        </View>

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

        <View style={styles.trustNote}>
          <Text style={styles.trustIcon}>🔒</Text>
          <Text style={styles.trustText}>
            Your payment is held securely and only released to the host after successful pick-up.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <View style={styles.confirmBar}>
        <TouchableOpacity
          style={[styles.confirmBtn, loading && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={loading}
          activeOpacity={0.85}
          // @ts-ignore
          onClick={handleConfirm}
        >
          <Text style={styles.confirmText}>
            {loading ? 'Booking…' : `Pay R${grandTotal} & confirm`}
          </Text>
        </TouchableOpacity>
      </View>

      <DatePickerModal
        visible={showDatePicker}
        selected={bookingDate}
        onSelect={setBookingDate}
        onClose={() => setShowDatePicker(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { padding: 20, paddingTop: 60 },
  back: { marginBottom: 16 },
  backText: { fontSize: 16, color: Colors.primary, fontWeight: '600' },
  heading: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, marginBottom: 20 },
  errorBanner: { backgroundColor: Colors.errorBg, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#FECACA' },
  errorBannerText: { fontSize: 14, color: Colors.error, fontWeight: '600' },
  hostCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: Colors.border },
  hostCardEmoji: { fontSize: 32 },
  hostCardName: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  hostCardLocation: { fontSize: 13, color: Colors.textSecondary },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, marginBottom: 10, marginTop: 16 },
  dateBox: { backgroundColor: Colors.white, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateText: { fontSize: 14, color: Colors.textPrimary },
  dateChangeHint: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  noSlotsBox: { backgroundColor: Colors.warningBg, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#FDE68A' },
  noSlotsText: { fontSize: 13, color: Colors.warningText },
  timeRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  timeChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border },
  timeChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  timeText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  timeTextActive: { color: Colors.white },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: Colors.white, borderRadius: 12, padding: 14, marginTop: 16, borderWidth: 1, borderColor: Colors.border },
  summaryLabel: { fontSize: 15, color: Colors.textPrimary },
  summaryValue: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  priceBox: { backgroundColor: Colors.white, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 10 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  priceLabel: { fontSize: 15, color: Colors.textSecondary },
  priceValue: { fontSize: 15, color: Colors.textPrimary },
  priceDivider: { height: 1, backgroundColor: Colors.border },
  priceTotalLabel: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  priceTotalValue: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  trustNote: { flexDirection: 'row', gap: 10, backgroundColor: Colors.trustBg, borderRadius: 12, padding: 14, marginTop: 20 },
  trustIcon: { fontSize: 18 },
  trustText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  confirmBar: { padding: 20, paddingBottom: 34, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border },
  confirmBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmText: { fontSize: 16, fontWeight: '700', color: Colors.white },
});
