// ─── Shared: awaiting-host notifications ──────────────────────────────────────
//
// Used by every payment-success path (payfast-itn, payment-webhook,
// payment-result) after a fresh confirm_booking_payment RPC success — never
// on already_resolved or reference_reused. Living in one place is the whole
// point: multiple payment providers exist, but there is exactly one shared
// authoritative transition (confirm_booking_payment) and exactly one shared
// notification for what it produces. A second, drifted copy of this logic
// per provider is exactly the problem this file exists to prevent.
//
// `booking` is the full row confirm_booking_payment returns
// (to_jsonb(v_booking)), so no separate fetch is needed for the drop-off/
// pick-up/bag-count fields the host email uses.
//
// Deliberately does NOT send a PIN-revealing confirmation email at this
// point: the booking is awaiting_host_confirmation, not confirmed, and the
// host hasn't accepted yet — sending the PIN now would let a traveller use
// it before the host ever agreed to the booking, defeating the entire point
// of the host-confirmation gate. A real confirmation email (with PIN)
// belongs at accept time instead, tracked as a follow-up in
// PROJECT_MASTER_PLAN.md (extending send-email's existing bookings
// Database Webhook handler).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ADMIN_SECRET = Deno.env.get('ADMIN_SECRET') ?? '';

export async function sendAwaitingHostNotifications(
  supabase: ReturnType<typeof createClient>,
  booking: any,
): Promise<void> {
  const { data: traveller } = await supabase
    .from('profiles').select('full_name, email').eq('id', booking.traveller_id).single();
  const { data: host } = await supabase
    .from('hosts').select('display_name, location_name, user_id, assigned_user_id').eq('id', booking.host_id).single();

  // Resolve via assigned_user_id first, falling back to user_id, so a
  // self-service host (no assigned_user_id) still gets notified.
  const hostOwnerId = host?.assigned_user_id ?? host?.user_id;
  const { data: hostOwner } = hostOwnerId
    ? await supabase.from('profiles').select('full_name, email').eq('id', hostOwnerId).single()
    : { data: null };

  // In-app + push: traveller. Same authoritative-status branch as the host
  // block below — 'confirmed' means Instant Book, where there is no host
  // step to wait on, so the copy must not tell the traveller they're
  // waiting for a response that will never come. Title reuses the exact
  // "Booking confirmed ✅" wording requests.tsx already sends when a host
  // accepts a Request to Book booking, for consistency; the body differs
  // since no host action actually happened here.
  if (booking.traveller_id) {
    const isInstantBook = booking.status === 'confirmed';
    const travellerTitle = isInstantBook ? 'Booking confirmed ✅' : 'Payment received — waiting on host';
    const travellerBody = isInstantBook
      ? 'Your booking is confirmed automatically — no host approval needed. Check your bookings for the drop-off PIN.'
      : "Your payment went through. We're waiting for the host to confirm your booking.";
    const travellerPushBody = isInstantBook
      ? 'No approval needed — your bags are booked in. Check your bookings for the drop-off PIN.'
      : "We're waiting for your host to confirm. You'll be notified as soon as they respond.";

    await supabase.from('notifications').insert({
      user_id: booking.traveller_id,
      type: 'booking_submitted',
      title: travellerTitle,
      body: travellerBody,
      related_booking_id: booking.id,
    }).catch(() => {});

    fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
      body: JSON.stringify({
        user_id: booking.traveller_id,
        title: travellerTitle,
        body: travellerPushBody,
        data: { type: 'booking_submitted', booking_id: booking.id },
      }),
    }).catch(() => {});
  }

  // In-app + push: host. `booking.status` here is whatever
  // confirm_booking_payment actually decided (see schema.sql) — this file
  // never re-derives or re-checks the host's instant_booking flag itself,
  // it only reads the outcome. 'confirmed' means Instant Book: the booking
  // needs no host action at all, so the copy must not say "accept or
  // decline" or reference a deadline that was never set. Anything else
  // (awaiting_host_confirmation) is today's unchanged Request to Book copy.
  if (hostOwnerId) {
    const isInstantBook = booking.status === 'confirmed';
    const hostTitle = isInstantBook ? 'New Cubby booking 🧳' : 'New booking request ⏳';
    const bagLabel = `${booking.bag_count} bag${booking.bag_count === 1 ? '' : 's'}`;
    const hostBody = isInstantBook
      ? `${bagLabel} booked for ${booking.drop_off_date} at ${booking.drop_off_time}. No action needed.`
      : 'A traveller has paid and is waiting on your response. Accept or decline before the deadline, or it will expire automatically.';
    const hostPushBody = isInstantBook
      ? 'No action needed — the booking is already confirmed.'
      : 'Respond before the deadline or it will expire automatically.';

    await supabase.from('notifications').insert({
      user_id: hostOwnerId,
      type: 'booking_submitted',
      title: hostTitle,
      body: hostBody,
      related_booking_id: booking.id,
    }).catch(() => {});

    fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
      body: JSON.stringify({
        user_id: hostOwnerId,
        title: hostTitle,
        body: hostPushBody,
        data: { type: 'booking_submitted', booking_id: booking.id },
      }),
    }).catch(() => {});
  }

  // Email host — unchanged content, still accurate at this stage.
  if (hostOwner?.email) {
    fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
      body: JSON.stringify({
        emailType: 'new_booking_request',
        data: {
          hostEmail: hostOwner.email,
          hostName: host?.display_name ?? 'Host',
          travellerName: traveller?.full_name ?? 'A traveller',
          dropOffDate: booking.drop_off_date,
          dropOffTime: booking.drop_off_time,
          pickUpDate: booking.pick_up_date,
          pickUpTime: booking.pick_up_time,
          bagCount: booking.bag_count,
          totalPrice: booking.total_price,
        },
      }),
    }).catch(() => {});
  }
}
