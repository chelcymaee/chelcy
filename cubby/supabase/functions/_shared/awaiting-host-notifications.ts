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

  // In-app + push: traveller — payment received, waiting on host.
  if (booking.traveller_id) {
    await supabase.from('notifications').insert({
      user_id: booking.traveller_id,
      type: 'booking_submitted',
      title: 'Payment received — waiting on host',
      body: "Your payment went through. We're waiting for the host to confirm your booking.",
      related_booking_id: booking.id,
    }).catch(() => {});

    fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
      body: JSON.stringify({
        user_id: booking.traveller_id,
        title: 'Payment received — waiting on host',
        body: "We're waiting for your host to confirm. You'll be notified as soon as they respond.",
        data: { type: 'booking_submitted', booking_id: booking.id },
      }),
    }).catch(() => {});
  }

  // In-app + push: host — new request needs a response before the deadline.
  if (hostOwnerId) {
    await supabase.from('notifications').insert({
      user_id: hostOwnerId,
      type: 'booking_submitted',
      title: 'New booking request ⏳',
      body: 'A traveller has paid and is waiting on your response. Accept or decline before the deadline, or it will expire automatically.',
      related_booking_id: booking.id,
    }).catch(() => {});

    fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
      body: JSON.stringify({
        user_id: hostOwnerId,
        title: 'New booking request ⏳',
        body: 'Respond before the deadline or it will expire automatically.',
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
