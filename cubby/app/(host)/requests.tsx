import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';

// Booking statuses used across Cubby:
//   pending   — created by traveller, awaiting host acknowledgement
//   confirmed — host accepted; bags may be dropped off
//   active    — bags physically dropped off (future use)
//   completed — bags collected, payout triggered
//   cancelled — host declined or traveller cancelled

type BookingStatus = 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';

interface HostBooking {
  id: string;
  traveller_name: string;
  traveller_email: string;
  bag_count: number;
  drop_off_date: string;
  drop_off_time: string;
  pick_up_time: string;
  total_price: number;
  status: BookingStatus;
  pin_code: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: '⏳ Pending',   color: '#D97706', bg: '#FEF3C7' },
  confirmed: { label: '✓ Confirmed', color: '#059669', bg: '#D1FAE5' },
  active:    { label: '📦 Active',    color: '#2563EB', bg: '#DBEAFE' },
  completed: { label: '✔ Completed', color: '#6B7280', bg: '#F3F4F6' },
  cancelled: { label: '✕ Declined',  color: '#DC2626', bg: '#FEE2E2' },
};

// Demo fallback when Supabase is not configured
const DEMO_REQUESTS: HostBooking[] = [
  {
    id: 'demo-1', traveller_name: 'Sarah T.', traveller_email: 'sarah@example.com',
    bag_count: 2, drop_off_date: 'Today', drop_off_time: '09:00', pick_up_time: '15:00',
    total_price: 160, status: 'pending', pin_code: '4821',
  },
  {
    id: 'demo-2', traveller_name: 'Luca B.', traveller_email: 'luca@example.com',
    bag_count: 3, drop_off_date: 'Today', drop_off_time: '11:00', pick_up_time: '19:00',
    total_price: 240, status: 'pending', pin_code: '7203',
  },
  {
    id: 'demo-3', traveller_name: 'Anika R.', traveller_email: 'anika@example.com',
    bag_count: 1, drop_off_date: 'Yesterday', drop_off_time: '08:30', pick_up_time: '14:00',
    total_price: 80, status: 'confirmed', pin_code: '3391',
  },
];

export default function Requests() {
  const [bookings, setBookings] = useState<HostBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirmDeclineId, setConfirmDeclineId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);

  useFocusEffect(useCallback(() => {
    loadBookings();
  }, []));

  function showToast(msg: string, error = false) {
    setToast({ msg, error });
    setTimeout(() => setToast(null), 2500);
  }

  async function loadBookings() {
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Get this host's listing id
          const { data: hostRow } = await supabase
            .from('hosts')
            .select('id')
            .eq('user_id', user.id)
            .single();

          if (!hostRow) {
            // Host profile not set up yet — show empty state
            setBookings([]);
            return;
          }

          // Fetch bookings for this host, join traveller profile for name/email
          const { data, error } = await supabase
            .from('bookings')
            .select(`
              id,
              bag_count,
              drop_off_date,
              drop_off_time,
              pick_up_time,
              total_price,
              status,
              pin_code,
              profiles:traveller_id ( full_name, email )
            `)
            .eq('host_id', hostRow.id)
            .in('status', ['pending', 'confirmed', 'active'])
            .order('created_at', { ascending: false });

          if (error) { showToast('Could not load bookings.', true); return; }

          const mapped: HostBooking[] = (data ?? []).map((b: any) => ({
            id: b.id,
            traveller_name: b.profiles?.full_name?.trim() || b.profiles?.email?.split('@')[0] || 'Traveller',
            traveller_email: b.profiles?.email || '',
            bag_count: b.bag_count,
            drop_off_date: b.drop_off_date,
            drop_off_time: b.drop_off_time,
            pick_up_time: b.pick_up_time,
            total_price: b.total_price,
            status: b.status,
            pin_code: b.pin_code,
          }));
          setBookings(mapped);
          return;
        }
      }
      // Demo fallback
      setBookings(DEMO_REQUESTS);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(bookingId: string, newStatus: BookingStatus) {
    setActionId(bookingId);
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('bookings')
          .update({ status: newStatus })
          .eq('id', bookingId);

        if (error) { showToast('Could not update booking. Please try again.', true); return; }
      }

      // Update local state immediately for snappy UI
      setBookings(prev =>
        prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b)
      );

      if (newStatus === 'confirmed') showToast('Booking accepted ✓');
      if (newStatus === 'cancelled') showToast('Booking declined');
    } finally {
      setActionId(null);
      setConfirmDeclineId(null);
    }
  }

  const pending = bookings.filter(b => b.status === 'pending').length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Toast */}
      {toast && (
        <View style={[styles.toast, toast.error && styles.toastError]}>
          <Text style={styles.toastText}>{toast.msg}</Text>
        </View>
      )}

      <View style={styles.header}>
        <Text style={styles.heading}>Booking Requests</Text>
        {pending > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{pending} new</Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : bookings.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>📭</Text>
          <Text style={styles.emptyTitle}>No booking requests yet</Text>
          <Text style={styles.emptySub}>
            When travellers book your storage spot, their requests will appear here.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {bookings.map(item => {
            const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;
            const isActioning = actionId === item.id;

            return (
              <View key={item.id} style={styles.card}>
                {/* Card header */}
                <View style={styles.cardTop}>
                  <View style={styles.avatar}>
                    <Text style={{ fontSize: 22 }}>👤</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.traveller_name}</Text>
                    {!!item.traveller_email && (
                      <Text style={styles.email}>{item.traveller_email}</Text>
                    )}
                    <Text style={styles.sub}>
                      {item.bag_count} bag{item.bag_count !== 1 ? 's' : ''} · {item.drop_off_time} – {item.pick_up_time}
                    </Text>
                    {!!item.drop_off_date && (
                      <Text style={styles.date}>{item.drop_off_date}</Text>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.amount}>R{item.total_price}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                      <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                  </View>
                </View>

                {/* PIN for confirmed/active bookings */}
                {(item.status === 'confirmed' || item.status === 'active') && !!item.pin_code && (
                  <View style={styles.pinRow}>
                    <Text style={styles.pinLabel}>Traveller PIN:</Text>
                    <Text style={styles.pinCode}>{item.pin_code}</Text>
                  </View>
                )}

                {/* Accept / Decline for pending */}
                {item.status === 'pending' && (
                  confirmDeclineId === item.id ? (
                    <View style={styles.confirmRow}>
                      <Text style={styles.confirmText}>Decline this booking?</Text>
                      <View style={styles.actions}>
                        <TouchableOpacity
                          style={[styles.declineConfirmBtn, isActioning && styles.btnDisabled]}
                          onPress={() => updateStatus(item.id, 'cancelled')}
                          // @ts-ignore
                          onClick={() => updateStatus(item.id, 'cancelled')}
                          disabled={isActioning}
                        >
                          <Text style={styles.declineConfirmText}>{isActioning ? 'Declining…' : 'Yes, decline'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.keepBtn}
                          onPress={() => setConfirmDeclineId(null)}
                          // @ts-ignore
                          onClick={() => setConfirmDeclineId(null)}
                        >
                          <Text style={styles.keepText}>Keep</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.actions}>
                      <TouchableOpacity
                        style={[styles.acceptBtn, isActioning && styles.btnDisabled]}
                        onPress={() => updateStatus(item.id, 'confirmed')}
                        // @ts-ignore
                        onClick={() => updateStatus(item.id, 'confirmed')}
                        disabled={isActioning}
                      >
                        <Text style={styles.acceptText}>{isActioning ? 'Accepting…' : '✓ Accept'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.declineBtn}
                        onPress={() => setConfirmDeclineId(item.id)}
                        // @ts-ignore
                        onClick={() => setConfirmDeclineId(item.id)}
                        disabled={isActioning}
                      >
                        <Text style={styles.declineText}>✕ Decline</Text>
                      </TouchableOpacity>
                    </View>
                  )
                )}
              </View>
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  toast: {
    position: 'absolute', top: 16, left: 24, right: 24,
    backgroundColor: '#1A1A1A', borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 20, zIndex: 100, alignItems: 'center',
  },
  toastError: { backgroundColor: '#DC2626' },
  toastText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 20, paddingTop: 8 },
  heading: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary },
  badge: { backgroundColor: Colors.accent, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#1A1A1A' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8, textAlign: 'center' },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  list: { padding: 20, gap: 14 },
  card: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, gap: 12,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center',
  },
  name: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  email: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  sub: { fontSize: 13, color: Colors.textSecondary, marginTop: 3 },
  date: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  amount: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  pinRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F0FDF4', borderRadius: 10, padding: 10,
  },
  pinLabel: { fontSize: 13, color: '#059669', fontWeight: '600' },
  pinCode: { fontSize: 22, fontWeight: '900', color: '#059669', letterSpacing: 4 },
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
  confirmRow: { gap: 8 },
  confirmText: { fontSize: 13, color: '#DC2626', fontWeight: '600', textAlign: 'center' },
  declineConfirmBtn: {
    flex: 1, backgroundColor: '#DC2626', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  declineConfirmText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  keepBtn: {
    flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  keepText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 14 },
  btnDisabled: { opacity: 0.6 },
});
