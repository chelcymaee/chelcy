import { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';
import { Colors } from '../../src/constants/colors';
import NotificationBell from '../../src/components/NotificationBell';
import { BookingCardSkeleton } from '../../src/components/Skeleton';
import { sendNotification } from '../../src/lib/notification-service';
import { promptGuestSignIn } from '../../src/lib/guest-prompt';

const STATUS_COLOR: Record<string, string> = {
  pending_payment: '#9CA3AF',
  pending: '#F59E0B',
  awaiting_host_confirmation: '#F59E0B',
  confirmed: '#3B82F6',
  active: '#10B981',
  completed: '#6B7280',
  cancelled: '#EF4444',
  declined: '#EF4444',
  expired: '#9CA3AF',
};

const STATUS_LABEL: Record<string, string> = {
  pending_payment: '⏳ Awaiting payment',
  pending: 'Pending',
  awaiting_host_confirmation: '🕒 Awaiting host confirmation',
  confirmed: 'Confirmed',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
  declined: 'Declined',
  expired: 'Expired',
};

// ─── Response countdown — DISPLAY ONLY, duplicated from the host Requests
// screen (app/(host)/requests.tsx) rather than shared. Founder-flagged
// follow-up: extract formatResponseCountdown and the deadline-state helpers
// into a shared utility module once the full booking lifecycle is
// implemented — not a Phase 3 change.
//
// Never authoritative. Renders a live countdown to `host_response_deadline`
// purely so the traveller knows roughly how long the host has left to
// respond. When the deadline passes it shows "Response window ended"
// locally — it must NOT change the booking's status or trigger a refund.
// That stays the `booking-check-expiry` server-side function's job (Phase 4),
// which uses the database's own clock.
type CountdownState = 'active' | 'ended' | 'unknown';

function formatResponseCountdown(
  deadlineIso: string | null | undefined,
  nowMs: number,
): { text: string; state: CountdownState } {
  if (!deadlineIso) return { text: 'No response deadline set', state: 'unknown' };
  const deadlineMs = new Date(deadlineIso).getTime();
  if (Number.isNaN(deadlineMs)) return { text: 'No response deadline set', state: 'unknown' };

  const diffMs = deadlineMs - nowMs;
  if (diffMs <= 0) return { text: 'Response window ended', state: 'ended' };

  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  const text = hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)} left for host to respond`
    : `${minutes}:${pad(seconds)} left for host to respond`;
  return { text, state: 'active' };
}

export default function Bookings() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [reviewedBookingIds, setReviewedBookingIds] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  // Apple Guideline 5.1.1(v): this tab is reachable now that guest browsing
  // exists (same Tabs layout as Explore), but bookings are inherently
  // account-based — show a sign-in CTA instead of an authenticated query.
  const [isGuest, setIsGuest] = useState(false);
  // Ticks once a second so the awaiting_host_confirmation countdowns stay
  // live. Display only — see formatResponseCountdown above.
  const [nowTick, setNowTick] = useState(() => Date.now());

  useFocusEffect(useCallback(() => {
    loadBookings();
  }, []));

  useEffect(() => {
    const interval = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function loadBookings() {
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setIsGuest(false);
          const { data } = await supabase
            .from('bookings')
            .select('*, hosts(display_name, location_name, user_id, assigned_user_id)')
            .eq('traveller_id', user.id)
            .order('created_at', { ascending: false });
          if (data) {
            setBookings(data);
            // Check which completed bookings have already been reviewed
            const completedIds = data.filter((b: any) => b.status === 'completed').map((b: any) => b.id);
            if (completedIds.length > 0) {
              const { data: reviewed } = await supabase
                .from('reviews').select('booking_id').in('booking_id', completedIds);
              setReviewedBookingIds(new Set((reviewed ?? []).map((r: any) => r.booking_id)));
            }
            return;
          }
        } else {
          // No session — guest browsing (Apple Guideline 5.1.1(v)). Don't
          // fall through to the AsyncStorage demo-mode path below; that's
          // for isSupabaseConfigured === false, a different scenario.
          setIsGuest(true);
          setBookings([]);
          return;
        }
      }
      const raw = await AsyncStorage.getItem('cubby_bookings');
      setBookings(raw ? JSON.parse(raw) : []);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }

  // Legacy direct-write path for pending/confirmed bookings, converted to
  // the cancel_own_booking RPC — see PR notes: a raw `.update()` here had
  // no current-status guard at all (could "cancel" an already-completed
  // booking), and financial-integrity hardening removed the client's
  // direct UPDATE grant on bookings entirely.
  async function cancelBooking(bookingId: string) {
    setCancellingId(bookingId);
    try {
      let rpcSucceeded = true;
      if (isSupabaseConfigured) {
        const { data: result, error } = await supabase.rpc('cancel_own_booking', { p_booking_id: bookingId });

        if (error) {
          showToast("Couldn't reach the server — please try again.");
          rpcSucceeded = false;
        } else if (result?.ok) {
          // Notify the host that the traveller cancelled
          const booking = bookings.find(b => b.id === bookingId);
          const hostUserId = booking?.hosts?.assigned_user_id ?? booking?.hosts?.user_id;
          if (hostUserId) {
            sendNotification({
              userId: hostUserId,
              type: 'booking_cancelled',
              title: 'Booking cancelled',
              body: 'A traveller cancelled their upcoming booking with you.',
              relatedBookingId: bookingId,
            }).catch(() => {});
          }
        } else {
          showToast(
            result?.reason === 'not_found_or_not_cancellable'
              ? 'This booking can no longer be cancelled.'
              : 'Could not cancel this booking. Please try again.'
          );
          rpcSucceeded = false;
        }
      }
      // Update AsyncStorage too — only once the real cancellation (if any) succeeded
      if (rpcSucceeded) {
        const raw = await AsyncStorage.getItem('cubby_bookings');
        if (raw) {
          const all = JSON.parse(raw).map((b: any) =>
            b.id === bookingId ? { ...b, status: 'cancelled' } : b
          );
          await AsyncStorage.setItem('cubby_bookings', JSON.stringify(all));
        }
      }
    } finally {
      // Always refetch — never assume the requested transition succeeded
      // (or failed) from the client's own guess about what happened.
      await loadBookings();
      setCancellingId(null);
      setConfirmCancelId(null);
    }
  }

  // ─── Phase 5: trusted server-side cancel for awaiting_host_confirmation ──
  // Unlike cancelBooking() above (the legacy direct-write path for
  // pending/confirmed bookings), this calls the Phase 4 RPC
  // cancel_awaiting_booking, which independently re-validates ownership and
  // status server-side. Every structured outcome gets its own message, and
  // the screen always refetches afterward rather than assuming the tap
  // succeeded.
  const [checkedExpiryIds, setCheckedExpiryIds] = useState<Set<string>>(new Set());

  async function cancelAwaitingBooking(bookingId: string) {
    setCancellingId(bookingId);
    try {
      const { data: result, error } = await supabase.rpc('cancel_awaiting_booking', { p_booking_id: bookingId });

      if (error) {
        showToast("Couldn't reach the server — please try again.");
        return;
      }

      if (result?.ok) {
        if (result.reason === 'already_resolved') {
          showToast('This booking was already handled.');
        } else {
          showToast('Booking cancelled');
          // Notify the host — only for a fresh cancellation, not a no-op.
          const booking = bookings.find(b => b.id === bookingId);
          const hostUserId = booking?.hosts?.assigned_user_id ?? booking?.hosts?.user_id;
          if (hostUserId) {
            sendNotification({
              userId: hostUserId,
              type: 'booking_cancelled',
              title: 'Booking cancelled',
              body: 'A traveller cancelled their upcoming booking with you.',
              relatedBookingId: bookingId,
            }).catch(e => console.error('[bookings] notification send failed:', bookingId, e));
          }
        }
      } else {
        switch (result?.reason) {
          case 'refused_confirmed':
            showToast('This booking is already confirmed — use the cancel option below instead.');
            break;
          case 'not_owner':
            showToast("You don't have permission to do this.");
            break;
          case 'not_found':
            showToast('This booking could not be found.');
            break;
          default:
            showToast('Could not cancel this booking. Please try again.');
        }
      }
    } finally {
      // Always refetch — never assume the requested transition succeeded (or
      // failed) from the client's own guess about what happened.
      await loadBookings();
      setCancellingId(null);
      setConfirmCancelId(null);
    }
  }

  // Defensive expiry check: if a countdown reaches 'ended' while this screen
  // is open, ask the server once whether it's actually expired yet, rather
  // than waiting on the scheduled sweep. check_booking_expiry re-validates
  // everything server-side regardless of what the client's own countdown
  // showed — this is purely an opportunistic nudge, never authoritative.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const overdue = bookings.filter(b =>
      b.status === 'awaiting_host_confirmation' &&
      !checkedExpiryIds.has(b.id) &&
      formatResponseCountdown(b.host_response_deadline, nowTick).state === 'ended'
    );
    if (overdue.length === 0) return;

    setCheckedExpiryIds(prev => {
      const next = new Set(prev);
      overdue.forEach(b => next.add(b.id));
      return next;
    });

    (async () => {
      let anyExpired = false;
      for (const b of overdue) {
        const { data: result } = await supabase.rpc('check_booking_expiry', { p_booking_id: b.id });
        if (result?.expired) anyExpired = true;
      }
      if (anyExpired) await loadBookings();
    })();
  }, [bookings, nowTick, checkedExpiryIds]);

  const upcoming = bookings.filter(b => ['pending', 'awaiting_host_confirmation', 'confirmed', 'active'].includes(b.status ?? 'confirmed'));
  const past = bookings.filter(b => ['completed', 'cancelled', 'declined', 'expired'].includes(b.status ?? ''));
  const shown = tab === 'upcoming' ? upcoming : past;

  if (isGuest) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.heading}>My Bookings</Text>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🎟️</Text>
          <Text style={styles.emptyTitle}>Sign in to see your bookings</Text>
          <Text style={styles.emptySub}>Create an account or sign in to book storage and track your bookings here.</Text>
          <TouchableOpacity
            style={styles.exploreBtn}
            onPress={() => promptGuestSignIn()}
            // @ts-ignore
            onClick={() => promptGuestSignIn()}
          >
            <Text style={styles.exploreBtnText}>Sign in →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {toast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      <View style={[styles.header, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
        <Text style={styles.heading}>My Bookings</Text>
        <NotificationBell variant="traveller" />
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
        {loading ? (
          [1, 2, 3].map(i => <BookingCardSkeleton key={i} />)
        ) : shown.length === 0 ? (
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
            const countdown = status === 'awaiting_host_confirmation'
              ? formatResponseCountdown(booking.host_response_deadline, nowTick)
              : null;

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

                {status === 'pending' && (
                  <View style={styles.pendingCard}>
                    <Text style={styles.pendingText}>⏳ Payment pending — your PIN will appear once payment is confirmed</Text>
                  </View>
                )}

                {/* Waiting-state card for awaiting_host_confirmation — Phase 3 dormant UI.
                    The countdown is display only (see formatResponseCountdown above) and
                    the PIN is deliberately withheld here: it's only ever shown once the
                    booking reaches 'confirmed' below, never while still awaiting the host. */}
                {status === 'awaiting_host_confirmation' && countdown && (
                  <View style={[styles.awaitingCard, countdown.state !== 'active' && styles.awaitingCardEnded]}>
                    <Text style={styles.awaitingText}>
                      {countdown.state === 'ended'
                        ? "Your host didn't respond in time. Your refund has been queued for processing."
                        : "Payment received — we're waiting for your host to confirm this booking."}
                    </Text>
                    <Text style={[styles.awaitingCountdown, countdown.state !== 'active' && styles.awaitingCountdownEnded]}>
                      {countdown.text}
                    </Text>
                  </View>
                )}

                {/* PIN is only ever shown once payment AND host confirmation are both done
                    (status === 'confirmed') — never while pending payment or awaiting host
                    confirmation. */}
                {!!pinCode && status === 'confirmed' && (
                  <View style={styles.pinCard}>
                    <Text style={styles.pinLabel}>Your drop-off PIN</Text>
                    <Text style={styles.pinCode}>{pinCode}</Text>
                    <Text style={styles.pinHint}>Show this to your host on arrival</Text>
                  </View>
                )}

                {['pending', 'confirmed', 'active'].includes(status) && (
                  <TouchableOpacity
                    style={styles.messageBtn}
                    onPress={() => router.push({ pathname: '/(traveller)/chat', params: { bookingId: booking.id, hostName } })}
                    // @ts-ignore
                    onClick={() => router.push({ pathname: '/(traveller)/chat', params: { bookingId: booking.id, hostName } })}
                  >
                    <Text style={styles.messageBtnText}>💬 Message host</Text>
                  </TouchableOpacity>
                )}

                {status === 'completed' && (
                  reviewedBookingIds.has(booking.id)
                    ? <View style={styles.reviewedBadge}><Text style={styles.reviewedBadgeText}>✓ Reviewed</Text></View>
                    : (
                      <TouchableOpacity
                        style={styles.reviewBtn}
                        onPress={() => router.push({ pathname: '/(traveller)/review', params: { hostId: booking.hostId ?? booking.host_id, hostName, bookingId: booking.id } })}
                        // @ts-ignore
                        onClick={() => router.push({ pathname: '/(traveller)/review', params: { hostId: booking.hostId ?? booking.host_id, hostName, bookingId: booking.id } })}
                      >
                        <Text style={styles.reviewBtnText}>✏️ Leave a review</Text>
                      </TouchableOpacity>
                    )
                )}

                {/* Cancel for awaiting_host_confirmation — wired to cancel_awaiting_booking
                    (Phase 5). Kept as its own block rather than joining the live
                    ['pending', 'confirmed'] array below: this RPC only ever transitions a
                    booking that's still awaiting_host_confirmation, and refuses (rather than
                    silently handling) a booking that's already confirmed — that stays on the
                    existing cancelBooking() path below. */}
                {status === 'awaiting_host_confirmation' && (
                  confirmCancelId === booking.id ? (
                    <View style={{ gap: 8 }}>
                      <Text style={{ fontSize: 13, color: Colors.error, fontWeight: '600', textAlign: 'center' }}>
                        Cancel this booking? Your refund will be queued for processing.
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          style={{ flex: 1, backgroundColor: Colors.error, borderRadius: 10, padding: 10, alignItems: 'center', opacity: cancellingId === booking.id ? 0.6 : 1 }}
                          onPress={() => cancelAwaitingBooking(booking.id)}
                          // @ts-ignore
                          onClick={() => cancelAwaitingBooking(booking.id)}
                          disabled={cancellingId === booking.id}
                        >
                          <Text style={{ color: Colors.white, fontWeight: '700', fontSize: 13 }}>{cancellingId === booking.id ? 'Cancelling…' : 'Yes, cancel'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{ flex: 1, backgroundColor: Colors.white, borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: Colors.border }}
                          onPress={() => setConfirmCancelId(null)}
                          // @ts-ignore
                          onClick={() => setConfirmCancelId(null)}
                        >
                          <Text style={{ color: Colors.textSecondary, fontWeight: '700', fontSize: 13 }}>Keep</Text>
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

                {['pending', 'confirmed'].includes(status) && (
                  confirmCancelId === booking.id ? (
                    <View style={{ gap: 8 }}>
                      <Text style={{ fontSize: 13, color: Colors.error, fontWeight: '600', textAlign: 'center' }}>Cancel this booking?</Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          style={{ flex: 1, backgroundColor: Colors.error, borderRadius: 10, padding: 10, alignItems: 'center', opacity: cancellingId === booking.id ? 0.6 : 1 }}
                          onPress={() => cancelBooking(booking.id)}
                          // @ts-ignore
                          onClick={() => cancelBooking(booking.id)}
                          disabled={cancellingId === booking.id}
                        >
                          <Text style={{ color: Colors.white, fontWeight: '700', fontSize: 13 }}>{cancellingId === booking.id ? 'Cancelling…' : 'Yes, cancel'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{ flex: 1, backgroundColor: Colors.white, borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: Colors.border }}
                          onPress={() => setConfirmCancelId(null)}
                          // @ts-ignore
                          onClick={() => setConfirmCancelId(null)}
                        >
                          <Text style={{ color: Colors.textSecondary, fontWeight: '700', fontSize: 13 }}>Keep</Text>
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
  toast: {
    position: 'absolute', top: 16, left: 24, right: 24,
    backgroundColor: Colors.textPrimary, borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 20, zIndex: 100, alignItems: 'center',
  },
  toastText: { color: '#fff', fontSize: 15, fontWeight: '700' },
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
  tabActive: { borderBottomColor: Colors.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: Colors.primary, fontWeight: '800' },
  list: { padding: 16, gap: 16 },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 20 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8, textAlign: 'center' },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  exploreBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28 },
  exploreBtnText: { fontSize: 15, fontWeight: '700', color: Colors.white },
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
  pendingCard: { backgroundColor: Colors.warningBg, borderRadius: 14, padding: 14 },
  pendingText: { fontSize: 13, color: Colors.warningText, fontWeight: '600', textAlign: 'center' },
  awaitingCard: { backgroundColor: Colors.warningBg, borderRadius: 14, padding: 14, gap: 6 },
  awaitingCardEnded: { backgroundColor: '#F3F4F6' },
  awaitingText: { fontSize: 13, color: Colors.warningText, fontWeight: '600', textAlign: 'center' },
  awaitingCountdown: { fontSize: 13, color: Colors.warningText, fontWeight: '800', textAlign: 'center' },
  awaitingCountdownEnded: { color: Colors.textSecondary },
  pinCard: { backgroundColor: Colors.primary, borderRadius: 14, padding: 14, alignItems: 'center' },
  pinLabel: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginBottom: 4 },
  pinCode: { fontSize: 36, fontWeight: '900', color: '#fff', letterSpacing: 8, marginBottom: 4 },
  pinHint: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  messageBtn: { borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  messageBtnText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  reviewBtn: { borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  reviewBtnText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  reviewedBadge: { backgroundColor: Colors.successBg, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  reviewedBadgeText: { fontSize: 14, fontWeight: '700', color: Colors.successText },
  cancelBtn: { borderWidth: 1.5, borderColor: Colors.error, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: Colors.error },
});
