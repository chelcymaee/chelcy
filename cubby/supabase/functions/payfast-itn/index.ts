// ─── payfast-itn Edge Function ────────────────────────────────────────────────
//
// PayFast Instant Transaction Notification (ITN) handler.
// PayFast POSTs form-encoded data here when a payment status changes.
//
// Security validation (in order):
//   1. Reconstruct signature from ITN data and compare to received signature
//   2. Validate payment_status === 'COMPLETE'
//   3. Validate amount_gross matches booking total_price
//   4. Validate merchant_id matches our config
//   5. Validate with PayFast server (optional but recommended for production)
//   6. Prevent duplicate processing via idempotent DB update
//
// Always returns 200 — PayFast retries on non-200. Log errors but never block.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHash } from 'https://deno.land/std@0.168.0/node/crypto.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const PAYFAST_MERCHANT_ID = Deno.env.get('PAYFAST_MERCHANT_ID') ?? '';
const PAYFAST_PASSPHRASE = Deno.env.get('PAYFAST_PASSPHRASE') ?? '';
const PAYFAST_SANDBOX = Deno.env.get('PAYFAST_SANDBOX') !== 'false';
const ADMIN_SECRET = Deno.env.get('ADMIN_SECRET') ?? '';

// PayFast production server IPs (skip validation in sandbox)
const PAYFAST_IPS = ['41.74.179.194', '41.74.179.195', '41.74.179.196', '41.74.179.197'];

// ─── Signature validation ──────────────────────────────────────────────────────

function validateSignature(params: Record<string, string>): boolean {
  const { signature, ...rest } = params;
  if (!signature) return false;

  const pairs = Object.keys(rest)
    .filter(k => rest[k] !== '' && rest[k] != null)
    .sort()
    .map(k => `${k}=${encodeURIComponent(rest[k]).replace(/%20/g, '+')}`);

  let paramString = pairs.join('&');
  if (PAYFAST_PASSPHRASE) {
    paramString += `&passphrase=${encodeURIComponent(PAYFAST_PASSPHRASE).replace(/%20/g, '+')}`;
  }

  const expected = createHash('md5').update(paramString).digest('hex');
  return expected === signature;
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const ok = () => new Response('OK', { status: 200 });

  try {
    if (req.method !== 'POST') return ok();

    const rawBody = await req.text();
    const params: Record<string, string> = {};
    for (const [k, v] of new URLSearchParams(rawBody)) {
      params[k] = v;
    }

    const {
      m_payment_id: bookingId,
      payment_status: paymentStatus,
      amount_gross: amountGross,
      pf_payment_id: pfPaymentId,
      merchant_id: itnMerchantId,
      signature,
    } = params;

    console.log('[payfast-itn] Received:', { bookingId, paymentStatus, amountGross, pfPaymentId });

    if (!bookingId) {
      console.warn('[payfast-itn] No m_payment_id in payload');
      return ok();
    }

    // ── 1. Validate source IP (production only) ──
    if (!PAYFAST_SANDBOX) {
      const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        ?? req.headers.get('cf-connecting-ip')
        ?? '';
      if (!PAYFAST_IPS.includes(clientIp)) {
        console.warn('[payfast-itn] Unexpected source IP:', clientIp);
        return ok(); // Still 200 — don't reveal rejection
      }
    }

    // ── 2. Validate merchant_id ──
    if (PAYFAST_MERCHANT_ID && itnMerchantId !== PAYFAST_MERCHANT_ID) {
      console.warn('[payfast-itn] Merchant ID mismatch:', itnMerchantId);
      return ok();
    }

    // ── 3. Validate signature ──
    if (!validateSignature(params)) {
      console.warn('[payfast-itn] Signature mismatch for booking:', bookingId);
      return ok();
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // ── 4. Fetch booking to validate amount ──
    const { data: booking } = await supabase
      .from('bookings')
      .select('id, total_price, status, traveller_id, host_id')
      .eq('id', bookingId)
      .single();

    if (!booking) {
      console.warn('[payfast-itn] Booking not found:', bookingId);
      return ok();
    }

    // ── 5. Validate amount (within R0.01 tolerance for floating point) ──
    const expectedAmount = Number(booking.total_price).toFixed(2);
    const receivedAmount = parseFloat(amountGross ?? '0').toFixed(2);
    if (expectedAmount !== receivedAmount) {
      console.error('[payfast-itn] Amount mismatch! expected:', expectedAmount, 'got:', receivedAmount);
      return ok();
    }

    // ── 6. Optional: server-side validation with PayFast ──
    if (!PAYFAST_SANDBOX) {
      try {
        const validateUrl = 'https://www.payfast.co.za/eng/query/validate';
        const validateRes = await fetch(validateUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: rawBody,
        });
        const validateText = await validateRes.text();
        if (validateText !== 'VALID') {
          console.warn('[payfast-itn] PayFast server validation failed:', validateText);
          return ok();
        }
      } catch (e) {
        console.error('[payfast-itn] Validation request failed (proceeding):', e);
      }
    }

    // ── 7. Process payment result ──
    if (paymentStatus === 'COMPLETE') {
      // The one authoritative payment-confirmation transition — see
      // confirm_booking_payment in supabase/schema.sql. This function does
      // not write to bookings itself; the RPC owns the guarded UPDATE
      // (status, payment fields, and host_response_deadline set together
      // atomically) and is idempotent by construction, so a duplicate or
      // stale ITN naturally resolves to already_resolved rather than a
      // second transition or a reset deadline.
      const { data: rpcResult, error: rpcErr } = await supabase.rpc('confirm_booking_payment', {
        p_booking_id: bookingId,
        p_payment_reference: pfPaymentId ?? null,
      });

      if (rpcErr) {
        console.error('[payfast-itn] confirm_booking_payment RPC error:', rpcErr);
        return ok();
      }

      if (rpcResult?.ok) {
        console.log('[payfast-itn] Booking now awaiting host confirmation:', bookingId);
        // Send notifications + emails (fire-and-forget)
        sendAwaitingHostNotifications(supabase, rpcResult.booking).catch(e =>
          console.error('[payfast-itn] Notification error:', e)
        );
      } else if (rpcResult?.reason === 'already_resolved') {
        // Duplicate or stale ITN — benign, PayFast retries legitimately.
        console.log('[payfast-itn] Duplicate/stale ITN, already resolved:', bookingId, rpcResult.status);
      } else if (rpcResult?.reason === 'reference_reused') {
        // This payment_reference is already attached to a different
        // booking — either a data anomaly or a replay attempt. Neither
        // booking is touched by this call. Logged loudly on purpose.
        console.error('[payfast-itn] SECURITY: payment_reference already attached to another booking:', bookingId, pfPaymentId);
      } else {
        console.warn('[payfast-itn] confirm_booking_payment did not confirm:', bookingId, rpcResult);
      }

    } else if (paymentStatus === 'CANCELLED' || paymentStatus === 'FAILED') {
      await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          failure_reason: `PayFast: ${paymentStatus}`,
        })
        .eq('id', bookingId)
        .in('status', ['pending', 'pending_payment']);

      console.log('[payfast-itn] Booking cancelled:', bookingId, paymentStatus);
    } else {
      // PENDING or other status — do nothing yet
      console.log('[payfast-itn] Payment status not final:', paymentStatus, bookingId);
    }

    return ok();
  } catch (err) {
    console.error('[payfast-itn] Unhandled error:', err);
    return ok(); // Always 200 so PayFast does not retry indefinitely
  }
});

// ─── Notifications ────────────────────────────────────────────────────────────
//
// Fired only when confirm_booking_payment returns a fresh ok:true transition
// — never on already_resolved or reference_reused. `booking` is the full row
// the RPC returned (to_jsonb(v_booking)), so no separate fetch is needed for
// the drop-off/pick-up/bag-count fields the host email uses.
//
// Deliberately does NOT send the old PIN-revealing traveller confirmation
// email at this point: the booking is awaiting_host_confirmation, not
// confirmed, and the host hasn't accepted yet — sending the PIN now would
// let a traveller use it before the host ever agreed to the booking,
// defeating the entire point of the host-confirmation gate. A real
// confirmation email (with PIN) belongs at accept time instead. That needs
// its own small server-side trigger, the same way the expiry sweep needed
// one — deliberately left out of this phase to keep the diff scoped, not
// silently dropped. Tracked as a follow-up in PROJECT_MASTER_PLAN.md.

async function sendAwaitingHostNotifications(supabase: any, booking: any): Promise<void> {
  const { data: traveller } = await supabase
    .from('profiles').select('full_name, email').eq('id', booking.traveller_id).single();
  const { data: host } = await supabase
    .from('hosts').select('display_name, location_name, user_id, assigned_user_id').eq('id', booking.host_id).single();

  // Found and fixed alongside this change: the old version resolved the
  // host's owner via assigned_user_id only, so a self-service host
  // (user_id set, assigned_user_id null) never got this email at all.
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
