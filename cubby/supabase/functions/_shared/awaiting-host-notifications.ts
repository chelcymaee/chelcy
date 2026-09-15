// ─── Shared: awaiting-host notifications ──────────────────────────────────────
//
// Used by every payment-success path (payfast-itn, paygate-notify,
// paygate-query, payment-webhook, payment-result) after a fresh
// confirm_booking_payment RPC success — never on already_resolved or
// reference_reused. Living in one place is the whole point: multiple
// payment providers exist, but there is exactly one shared authoritative
// transition (confirm_booking_payment) and exactly one shared notification
// for what it produces. A second, drifted copy of this logic per provider
// is exactly the problem this file exists to prevent.
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
//
// ─── Reliability (2026-09-15) ───────────────────────────────────────────────
// Every caller now `await`s this function instead of firing it and moving
// on — the payment webhook's own response is only returned once every
// notification attempt below has genuinely finished (success or logged
// failure), so nothing here can be silently abandoned when the Edge
// Function's execution ends. That guarantee only holds if this function
// itself also awaits every operation it starts — previously the two
// `fetch()` calls (push, email) were fired without `await` even inside this
// function, so a caller awaiting the outer call still wouldn't have waited
// for those. All five operations below (traveller insert, traveller push,
// host insert, host push, host email) are now run through Promise.allSettled
// so they're isolated from each other AND all genuinely awaited before this
// function resolves.
//
// This function can never throw or reject — every operation is wrapped in
// its own try/catch that only logs. That's deliberate: confirm_booking_payment
// has already committed the booking's real status by the time this function
// is ever called, so a notification failure must never be able to make an
// already-successful payment-confirmation response look like a failure.
// Callers can safely `await` this without a try/catch of their own.
//
// Each failure is logged with the booking id and exactly which operation/
// recipient failed — replacing the previous `.catch(() => {})` pattern,
// which for the two `notifications` inserts specifically was closer to a
// no-op than real error handling: supabase-js resolves with `{ error }` on
// a genuine Postgres-level failure rather than rejecting the promise, so a
// bare `.catch()` never even saw that class of error. The helpers below
// check `{ error }` explicitly, not just catch a thrown exception.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ADMIN_SECRET = Deno.env.get('ADMIN_SECRET') ?? '';

// Same AbortSignal.timeout(...) idiom already used for the actual PayGate
// query.trans call (paygate-query) — shorter here (5s vs. that call's 15s)
// since push/email are our own Edge Functions, not a third-party gateway,
// and this bounds the worst-case latency added to a payment webhook's own
// response.
const INTERNAL_CALL_TIMEOUT_MS = 5_000;

async function insertNotification(
  supabase: ReturnType<typeof createClient>,
  bookingId: string,
  recipient: 'traveller' | 'host',
  row: Record<string, unknown>,
): Promise<void> {
  try {
    const { error } = await supabase.from('notifications').insert(row);
    if (error) {
      console.error(`[awaiting-host-notifications] ${recipient} notification insert failed:`, bookingId, error);
    }
  } catch (e) {
    console.error(`[awaiting-host-notifications] ${recipient} notification insert threw:`, bookingId, e);
  }
}

async function sendPush(
  bookingId: string,
  recipient: 'traveller' | 'host',
  body: Record<string, unknown>,
): Promise<void> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(INTERNAL_CALL_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`[awaiting-host-notifications] ${recipient} push non-OK response:`, bookingId, res.status);
    }
  } catch (e) {
    console.error(`[awaiting-host-notifications] ${recipient} push failed:`, bookingId, e);
  }
}

async function sendHostEmail(bookingId: string, body: Record<string, unknown>): Promise<void> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(INTERNAL_CALL_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error('[awaiting-host-notifications] host email non-OK response:', bookingId, res.status);
    }
  } catch (e) {
    console.error('[awaiting-host-notifications] host email failed:', bookingId, e);
  }
}

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

  const tasks: Promise<void>[] = [];

  // Traveller. `booking.status` is whatever confirm_booking_payment already
  // decided (see schema.sql) — 'confirmed' means Instant Book, where there
  // is no host step to wait on, so the copy must not tell the traveller
  // they're waiting for a response that will never come. Title reuses the
  // exact "Booking confirmed ✅" wording requests.tsx already sends when a
  // host accepts a Request to Book booking, for consistency; the body
  // differs since no host action actually happened here.
  if (booking.traveller_id) {
    const isInstantBook = booking.status === 'confirmed';
    const travellerTitle = isInstantBook ? 'Booking confirmed ✅' : 'Payment received — waiting on host';
    const travellerBody = isInstantBook
      ? 'Your booking is confirmed automatically — no host approval needed. Check your bookings for the drop-off PIN.'
      : "Your payment went through. We're waiting for the host to confirm your booking.";
    const travellerPushBody = isInstantBook
      ? 'No approval needed — your bags are booked in. Check your bookings for the drop-off PIN.'
      : "We're waiting for your host to confirm. You'll be notified as soon as they respond.";

    tasks.push(insertNotification(supabase, booking.id, 'traveller', {
      user_id: booking.traveller_id,
      type: 'booking_submitted',
      title: travellerTitle,
      body: travellerBody,
      related_booking_id: booking.id,
    }));

    tasks.push(sendPush(booking.id, 'traveller', {
      user_id: booking.traveller_id,
      title: travellerTitle,
      body: travellerPushBody,
      data: { type: 'booking_submitted', booking_id: booking.id },
    }));
  }

  // Host. Same isInstantBook branch — 'confirmed' means no accept/decline,
  // no deadline, so the copy must not say either of those things. Anything
  // else (awaiting_host_confirmation) is today's unchanged Request to Book
  // copy.
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

    tasks.push(insertNotification(supabase, booking.id, 'host', {
      user_id: hostOwnerId,
      type: 'booking_submitted',
      title: hostTitle,
      body: hostBody,
      related_booking_id: booking.id,
    }));

    tasks.push(sendPush(booking.id, 'host', {
      user_id: hostOwnerId,
      title: hostTitle,
      body: hostPushBody,
      data: { type: 'booking_submitted', booking_id: booking.id },
    }));
  }

  // Email host — unchanged content, still accurate at this stage.
  if (hostOwner?.email) {
    tasks.push(sendHostEmail(booking.id, {
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
    }));
  }

  // allSettled, not all — belt-and-braces: every task above already catches
  // internally and never rejects, but this makes the isolation explicit
  // rather than relying solely on that internal discipline. Awaited here so
  // every caller's own `await sendAwaitingHostNotifications(...)` genuinely
  // waits for all of this to finish before the payment webhook's response
  // is returned.
  await Promise.allSettled(tasks);
}
