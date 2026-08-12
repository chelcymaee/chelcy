import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { Radius, CardShadow } from '../../src/constants/theme';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';
import NotificationBell from '../../src/components/NotificationBell';
import Avatar from '../../src/components/Avatar';
import { recalculateHostResponseRate } from '../../src/lib/response-rate';
import { sendNotification } from '../../src/lib/notification-service';
import { useSelectedHost } from '../../src/lib/host-context';

// Booking statuses used across Cubby:
//   pending_payment            — created, awaiting traveller payment via PayFast
//   pending                    — legacy status (pre-PayFast) / fallback
//   awaiting_host_confirmation — payment received; host must accept/decline before host_response_deadline
//                                (Phase 2: display-only in this file — see booking lifecycle Phase 4 for the
//                                 trusted server-side functions that will actually perform this transition)
//   confirmed                  — payment received; bags may be dropped off
//   active                     — bags physically dropped off (future use)
//   completed                  — bags collected, split recorded for manual payout
//   cancelled                  — payment failed or traveller cancelled
//   declined                   — host declined within the response window
//   expired                    — host did not respond before host_response_deadline

type BookingStatus =
  | 'pending_payment' | 'pending' | 'awaiting_host_confirmation' | 'confirmed'
  | 'active' | 'completed' | 'cancelled' | 'declined' | 'expired';

interface HostBooking {
  id: string;
  traveller_id: string;
  traveller_name: string;
  traveller_email: string;
  traveller_avatar_url: string | null;
  bag_count: number;
  drop_off_date: string;
  drop_off_time: string;
  pick_up_time: string;
  total_price: number;
  status: BookingStatus;
  pin_code: string;
  created_at: string;
  host_id: string;
  host_response_deadline: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending_payment: { label: '💳 Awaiting payment', color: '#6B7280', bg: '#F3F4F6' },
  pending:   { label: '⏳ Pending',   color: '#D97706', bg: '#FEF3C7' },
  awaiting_host_confirmation: { label: '🕒 Awaiting your response', color: '#D97706', bg: '#FEF3C7' },
  confirmed: { label: '✓ Confirmed', color: '#059669', bg: '#D1FAE5' },
  active:    { label: '📦 Active',    color: '#2563EB', bg: '#DBEAFE' },
  completed: { label: '✔ Completed', color: '#6B7280', bg: '#F3F4F6' },
  cancelled: { label: '✕ Declined',  color: '#DC2626', bg: '#FEE2E2' },
  declined:  { label: '✕ Declined',  color: '#DC2626', bg: '#FEE2E2' },
  expired:   { label: '⌛ Expired',   color: '#6B7280', bg: '#F3F4F6' },
};

// ─── Response countdown — DISPLAY ONLY ──────────────────────────────────────
// This is never authoritative. It renders a live countdown to
// `host_response_deadline` purely for the host's benefit. When the deadline
// passes it shows "Response window ended" — it must NOT change the booking's
// status, write to the database, or trigger a refund. Enforcing the deadline
// is the `booking-check-expiry` server-side function's job (Phase 4), which
// uses the database's own clock so it can't be fooled by client clock skew.
// 'unknown' = no usable deadline data (missing or invalid) — rendered as a
// neutral fallback, distinct from an active countdown or an ended one.
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
    ? `${hours}:${pad(minutes)}:${pad(seconds)} left to respond`
    : `${minutes}:${pad(seconds)} left to respond`;
  return { text, state: 'active' };
}

// ─── Notification copy — used by respondToRequest() below (Phase 5) ─────────
// hostNewRequest/travellerAwaitingHost moved to payfast-itn/index.ts, since
// payment confirmation (not accept/decline) is what triggers those now.
// travellerExpired lives in booking-expiry-sweep/index.ts, next to the
// transition that actually produces it. This file only needs the two
// outcomes a host's own Accept/Decline tap can cause.
const NOTIFICATION_COPY = {
  travellerAccepted: {
    title: 'Booking confirmed ✅',
    body: 'Your host accepted your booking. Check your bookings for the drop-off PIN.',
  },
  travellerDeclined: {
    title: 'Booking declined',
    body: "Your host wasn't able to accept this booking. Your refund has been queued for processing — try another host nearby!",
  },
} as const;

// Demo fallback when Supabase is not configured
const DEMO_REQUESTS: HostBooking[] = [
  {
    id: 'demo-1', traveller_id: 'demo', traveller_name: 'Sarah T.', traveller_email: 'sarah@example.com',
    bag_count: 2, drop_off_date: 'Today', drop_off_time: '09:00', pick_up_time: '15:00',
    total_price: 160, status: 'pending', pin_code: '4821', created_at: new Date().toISOString(), host_id: '',
    host_response_deadline: null, traveller_avatar_url: null,
  },
  {
    id: 'demo-2', traveller_id: 'demo', traveller_name: 'Luca B.', traveller_email: 'luca@example.com',
    bag_count: 3, drop_off_date: 'Today', drop_off_time: '11:00', pick_up_time: '19:00',
    total_price: 240, status: 'pending', pin_code: '7203', created_at: new Date().toISOString(), host_id: '',
    host_response_deadline: null, traveller_avatar_url: null,
  },
  {
    id: 'demo-3', traveller_id: 'demo', traveller_name: 'Anika R.', traveller_email: 'anika@example.com',
    bag_count: 1, drop_off_date: 'Yesterday', drop_off_time: '08:30', pick_up_time: '14:00',
    total_price: 80, status: 'confirmed', pin_code: '3391', created_at: new Date().toISOString(), host_id: '',
    host_response_deadline: null, traveller_avatar_url: null,
  },
];

export default function Requests() {
  const { selectedHostId, loading: hostContextLoading } = useSelectedHost();
  const [bookings, setBookings] = useState<HostBooking[]>([]);
  const [reviewedBookingIds, setReviewedBookingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  // True only when the bookings query itself failed — kept separate from
  // bookings.length === 0 so a genuine failure shows a retry state instead
  // of looking identical to "no booking requests yet".
  const [loadError, setLoadError] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirmDeclineId, setConfirmDeclineId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);
  // Ticks once a second so the awaiting_host_confirmation countdowns stay
  // live. Display only — see formatResponseCountdown for why this can never
  // be used to change booking state.
  const [nowTick, setNowTick] = useState(() => Date.now());

  useFocusEffect(useCallback(() => {
    loadBookings();
    // Re-runs on focus AND whenever selectedHostId/hostContextLoading
    // change while this screen stays focused, same reasoning as Dashboard.
  }, [selectedHostId, hostContextLoading]));

  useEffect(() => {
    const interval = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  function showToast(msg: string, error = false) {
    setToast({ msg, error });
    setTimeout(() => setToast(null), 2500);
  }

  async function loadBookings() {
    // HostProvider itself still resolving — wait rather than briefly
    // treating "not loaded yet" as "no listing".
    if (hostContextLoading) return;

    // Clear all previous listing's state up front, before any fetch
    // starts, so switching listings can never show Listing A's bookings
    // under Listing B's context while the new data loads.
    setLoading(true);
    setLoadError(false);
    setBookings([]);
    setReviewedBookingIds(new Set());
    try {
      if (isSupabaseConfigured) {
        if (!selectedHostId) {
          // No hosts row owned by this account at all — legitimate empty
          // state, not a query failure.
          return;
        }

        // Fetch bookings for the selected listing, join traveller profile
        // for name/email. selectedHostId already comes from HostProvider's
        // verified owned-listings resolution — no separate ambiguous
        // .eq('assigned_user_id', user.id).single() lookup needed here
        // anymore (that could legitimately match more than one row for a
        // multi-listing account, and silently returned "no requests yet").
        const { data, error } = await supabase
            .from('bookings')
            .select(`
              id,
              host_id,
              traveller_id,
              bag_count,
              drop_off_date,
              drop_off_time,
              pick_up_time,
              total_price,
              status,
              pin_code,
              created_at,
              host_response_deadline
            `)
            .eq('host_id', selectedHostId)
            .in('status', ['pending_payment', 'pending', 'awaiting_host_confirmation', 'confirmed', 'active', 'completed', 'declined', 'expired'])
            .order('created_at', { ascending: false });

          if (error) {
            // A genuine query failure — never render as "No booking
            // requests yet".
            console.error('[requests] bookings query failed:', error);
            showToast('Could not load bookings.', true);
            setLoadError(true);
            return;
          }

          // Fetch traveller names separately (avoids RLS join issue on profiles)
          const travellerIds = [...new Set((data ?? []).map((b: any) => b.traveller_id).filter(Boolean))];
          let profileMap: Record<string, { full_name: string; email: string; avatar_url: string | null }> = {};
          if (travellerIds.length > 0) {
            const { data: profs } = await supabase
              .from('profiles')
              .select('id, full_name, email, avatar_url')
              .in('id', travellerIds);
            for (const p of profs ?? []) profileMap[p.id] = p;
          }

          const mapped: HostBooking[] = (data ?? []).map((b: any) => {
            const prof = profileMap[b.traveller_id];
            return {
            id: b.id,
            traveller_id: b.traveller_id ?? '',
            traveller_name: prof?.full_name?.trim() || prof?.email?.split('@')[0] || 'Traveller',
            traveller_email: prof?.email || '',
            traveller_avatar_url: prof?.avatar_url ?? null,
            bag_count: b.bag_count,
            drop_off_date: b.drop_off_date,
            drop_off_time: b.drop_off_time,
            pick_up_time: b.pick_up_time,
            total_price: b.total_price,
            status: b.status,
            pin_code: b.pin_code,
            created_at: b.created_at,
            host_id: b.host_id,
            host_response_deadline: b.host_response_deadline ?? null,
          };});
          setBookings(mapped);

          // Track which completed bookings the host has already reviewed
          const completedIds = mapped.filter(b => b.status === 'completed').map(b => b.id);
          if (completedIds.length > 0) {
            const { data: reviewed } = await supabase
              .from('traveller_reviews').select('booking_id').in('booking_id', completedIds);
            setReviewedBookingIds(new Set((reviewed ?? []).map((r: any) => r.booking_id)));
          }
          return;
      }
      // Demo fallback
      setBookings(DEMO_REQUESTS);
    } finally {
      setLoading(false);
    }
  }

  // Legacy direct-write path for the 'pending' flow, converted to the
  // respond_to_pending_booking RPC (distinct from respondToRequest below,
  // which already uses the 'awaiting_host_confirmation' RPCs) — a raw
  // `.update()` here could previously write any status value regardless of
  // the row's actual current status, and financial-integrity hardening
  // removed the client's direct UPDATE grant on bookings entirely. The RPC
  // computes host_responded_at/response_time_minutes server-side.
  async function updateStatus(bookingId: string, newStatus: BookingStatus) {
    setActionId(bookingId);
    try {
      // Looked up once, outside the isSupabaseConfigured block, so it's also
      // in scope for the notification send below (fixes a pre-existing bug
      // where `booking` was referenced outside the block it was declared in).
      const booking = bookings.find(b => b.id === bookingId);
      const isResponse = newStatus === 'confirmed' || newStatus === 'cancelled';

      if (isSupabaseConfigured) {
        const { data: result, error } = await supabase.rpc('respond_to_pending_booking', {
          p_booking_id: bookingId,
          p_decision: newStatus,
        });
        if (error || !result?.ok) { showToast('Could not update booking. Please try again.', true); return; }

        // Recalculate host response rate after responding
        if (isResponse && booking?.host_id) {
          recalculateHostResponseRate(supabase, booking.host_id).catch(() => {});
        }
      }

      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));

      if (newStatus === 'confirmed') showToast('Booking accepted ✓');
      if (newStatus === 'cancelled') showToast('Booking declined');

      // Notify the traveller of the host's decision
      if (booking?.traveller_id && isSupabaseConfigured) {
        sendNotification({
          userId: booking.traveller_id,
          type: newStatus === 'confirmed' ? 'booking_confirmed' : 'booking_declined',
          title: newStatus === 'confirmed' ? 'Booking confirmed ✅' : 'Booking declined',
          body: newStatus === 'confirmed'
            ? 'Your booking has been accepted. Check your bookings for the PIN.'
            : 'Your booking request was not accepted. Try another host nearby!',
          relatedBookingId: bookingId,
        }).catch(() => {});
      }
    } finally {
      setActionId(null);
      setConfirmDeclineId(null);
    }
  }

  // ─── Phase 5: trusted server-side transitions for awaiting_host_confirmation ──
  // Unlike updateStatus() above (the legacy direct-write path for the pending
  // status), these call the Phase 4 RPCs — accept_booking / decline_booking —
  // which independently re-validate ownership, status, and the deadline
  // server-side. The client never assumes a tap succeeded: every branch below
  // refetches from the database rather than optimistically mutating local
  // state, and every structured outcome gets its own message instead of one
  // generic failure.
  const [checkedExpiryIds, setCheckedExpiryIds] = useState<Set<string>>(new Set());

  async function respondToRequest(bookingId: string, action: 'accept' | 'decline') {
    setActionId(bookingId);
    try {
      const { data: result, error } = await supabase.rpc(
        action === 'accept' ? 'accept_booking' : 'decline_booking',
        { p_booking_id: bookingId }
      );

      if (error) {
        showToast("Couldn't reach the server — please try again.", true);
        return;
      }

      if (result?.ok) {
        showToast(action === 'accept' ? 'Booking accepted ✓' : 'Booking declined');
        const booking = bookings.find(b => b.id === bookingId);
        if (booking?.traveller_id) {
          const copy = action === 'accept' ? NOTIFICATION_COPY.travellerAccepted : NOTIFICATION_COPY.travellerDeclined;
          sendNotification({
            userId: booking.traveller_id,
            type: action === 'accept' ? 'booking_confirmed' : 'booking_declined',
            title: copy.title,
            body: copy.body,
            relatedBookingId: bookingId,
          }).catch(e => console.error('[requests] notification send failed:', bookingId, e));
        }
      } else {
        switch (result?.reason) {
          case 'already_resolved':
            showToast('This request was already handled.', true);
            break;
          case 'deadline_passed':
            showToast('The response window has closed.', true);
            break;
          case 'not_owner':
            showToast("You don't have permission to do this.", true);
            break;
          case 'not_found':
            showToast('This booking could not be found.', true);
            break;
          default:
            showToast('Could not complete this action. Please try again.', true);
        }
      }
    } finally {
      // Always refetch — never assume the requested transition succeeded (or
      // failed) from the client's own guess about what happened.
      await loadBookings();
      setActionId(null);
      setConfirmDeclineId(null);
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

  const pending = bookings.filter(b => b.status === 'pending' || b.status === 'awaiting_host_confirmation').length;

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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {pending > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pending} new</Text>
            </View>
          )}
          <NotificationBell variant="host" />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : loadError ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>⚠️</Text>
          <Text style={styles.emptyTitle}>Couldn't load requests</Text>
          <Text style={styles.emptySub}>
            Something went wrong loading your booking requests. Please try again.
          </Text>
          <TouchableOpacity
            onPress={loadBookings}
            // @ts-ignore
            onClick={loadBookings}
            style={{ marginTop: 14, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, backgroundColor: Colors.primary }}
          >
            <Text style={{ color: Colors.white, fontWeight: '700' }}>Try again</Text>
          </TouchableOpacity>
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
            const countdown = item.status === 'awaiting_host_confirmation'
              ? formatResponseCountdown(item.host_response_deadline, nowTick)
              : null;
            const responseWindowEnded = countdown?.state === 'ended';

            return (
              <View key={item.id} style={styles.card}>
                {/* Card header */}
                <View style={styles.cardTop}>
                  <Avatar uri={item.traveller_avatar_url} size={44} fallbackEmoji="👤" />
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

                {/* Response deadline — Phase 2 dormant UI, display only (see formatResponseCountdown) */}
                {item.status === 'awaiting_host_confirmation' && countdown && (
                  <View style={[styles.deadlineBox, countdown.state !== 'active' && styles.deadlineBoxEnded]}>
                    <Text style={[styles.deadlineText, countdown.state !== 'active' && styles.deadlineTextEnded]}>
                      {countdown.text}
                    </Text>
                    {countdown.state === 'active' && !!item.host_response_deadline && (
                      <Text style={styles.deadlineSub}>
                        Respond by {new Date(item.host_response_deadline).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })}
                      </Text>
                    )}
                  </View>
                )}

                {/* View Traveller Profile */}
                <TouchableOpacity
                  style={styles.viewProfileBtn}
                  onPress={() => router.push({ pathname: '/(host)/traveller-profile', params: { travellerId: item.traveller_id, bookingId: item.id } })}
                  // @ts-ignore
                  onClick={() => router.push({ pathname: '/(host)/traveller-profile', params: { travellerId: item.traveller_id, bookingId: item.id } })}
                >
                  <Text style={styles.viewProfileBtnText}>👤 View Traveller Profile</Text>
                </TouchableOpacity>

                {/* Review traveller for completed bookings */}
                {item.status === 'completed' && (
                  reviewedBookingIds.has(item.id)
                    ? <View style={styles.reviewedBadge}><Text style={styles.reviewedBadgeText}>✓ Traveller reviewed</Text></View>
                    : (
                      <TouchableOpacity
                        style={styles.reviewTravellerBtn}
                        onPress={() => router.push({ pathname: '/(host)/review-traveller', params: { travellerId: item.traveller_id, travellerName: item.traveller_name, bookingId: item.id } })}
                        // @ts-ignore
                        onClick={() => router.push({ pathname: '/(host)/review-traveller', params: { travellerId: item.traveller_id, travellerName: item.traveller_name, bookingId: item.id } })}
                      >
                        <Text style={styles.reviewTravellerBtnText}>✏️ Review traveller</Text>
                      </TouchableOpacity>
                    )
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

                {/* Accept / Decline for awaiting_host_confirmation — wired to the Phase 4 RPCs
                    (Phase 5). Neither the accept nor the decline path trusts the client: both
                    accept_booking and decline_booking re-validate ownership, status, and the
                    deadline server-side, and every outcome (success, already resolved, deadline
                    passed, forbidden, not found) is handled distinctly rather than assumed.
                    Disabled once the displayed countdown has ended — the countdown is still only
                    a display, but a live-looking button that can't do anything once the window
                    has closed would be misleading. */}
                {item.status === 'awaiting_host_confirmation' && (
                  confirmDeclineId === item.id ? (
                    <View style={styles.confirmRow}>
                      <Text style={styles.confirmText}>Decline this booking? The traveller's refund will be queued for processing.</Text>
                      <View style={styles.actions}>
                        <TouchableOpacity
                          style={[styles.declineConfirmBtn, isActioning && styles.btnDisabled]}
                          onPress={() => respondToRequest(item.id, 'decline')}
                          // @ts-ignore
                          onClick={() => respondToRequest(item.id, 'decline')}
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
                        style={[styles.acceptBtn, (responseWindowEnded || isActioning) && styles.btnDisabled]}
                        onPress={() => respondToRequest(item.id, 'accept')}
                        // @ts-ignore
                        onClick={() => respondToRequest(item.id, 'accept')}
                        disabled={responseWindowEnded || isActioning}
                      >
                        <Text style={styles.acceptText}>{isActioning ? 'Accepting…' : '✓ Accept'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.declineBtn, (responseWindowEnded || isActioning) && styles.btnDisabled]}
                        onPress={() => setConfirmDeclineId(item.id)}
                        // @ts-ignore
                        onClick={() => setConfirmDeclineId(item.id)}
                        disabled={responseWindowEnded || isActioning}
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
    backgroundColor: Colors.textPrimary, borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 20, zIndex: 100, alignItems: 'center',
  },
  toastError: { backgroundColor: Colors.error },
  toastText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 20, paddingTop: 8 },
  heading: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary },
  badge: { backgroundColor: Colors.accent, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#1A1A1A' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  reviewTravellerBtn: { borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 8 },
  reviewTravellerBtnText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  reviewedBadge: { backgroundColor: Colors.successBg, borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 8 },
  reviewedBadgeText: { fontSize: 14, fontWeight: '700', color: Colors.successText },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8, textAlign: 'center' },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  list: { padding: 20, gap: 14 },
  card: {
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
    ...CardShadow, gap: 12,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  name: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  viewProfileBtn: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  viewProfileBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  email: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  sub: { fontSize: 13, color: Colors.textSecondary, marginTop: 3 },
  date: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  amount: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  pinRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.successBg, borderRadius: 10, padding: 10,
  },
  pinLabel: { fontSize: 13, color: Colors.successText, fontWeight: '600' },
  pinCode: { fontSize: 22, fontWeight: '900', color: Colors.successText, letterSpacing: 4 },
  deadlineBox: {
    backgroundColor: '#FEF3C7', borderRadius: 10, padding: 10, gap: 2,
  },
  deadlineBoxEnded: { backgroundColor: '#F3F4F6' },
  deadlineText: { fontSize: 14, fontWeight: '700', color: '#D97706' },
  deadlineTextEnded: { color: Colors.textSecondary },
  deadlineSub: { fontSize: 12, color: '#92400E' },
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
  confirmText: { fontSize: 13, color: Colors.error, fontWeight: '600', textAlign: 'center' },
  declineConfirmBtn: {
    flex: 1, backgroundColor: Colors.error, borderRadius: 10,
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
