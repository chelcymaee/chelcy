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
const ADMIN_SECRET = Deno.env.get('ADMIN_SECRET') ?? 'cubby-admin-secret-2025';

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
      // Idempotent: only update if not already confirmed
      const { error: updateErr } = await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          payment_provider: 'payfast',
          payment_reference: pfPaymentId ?? null,
          paid_at: new Date().toISOString(),
        })
        .eq('id', bookingId)
        .in('status', ['pending', 'pending_payment']);

      if (updateErr) {
        console.error('[payfast-itn] DB update error:', updateErr);
        return ok();
      }

      console.log('[payfast-itn] Booking confirmed:', bookingId);

      // Send notifications + emails (fire-and-forget)
      sendConfirmationNotifications(supabase, booking).catch(e =>
        console.error('[payfast-itn] Notification error:', e)
      );

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

async function sendConfirmationNotifications(supabase: any, booking: any): Promise<void> {
  const { data: traveller } = await supabase
    .from('profiles').select('full_name, email').eq('id', booking.traveller_id).single();
  const { data: host } = await supabase
    .from('hosts').select('display_name, location_name, assigned_user_id').eq('id', booking.host_id).single();

  const hostOwnerId = host?.assigned_user_id;
  const { data: hostOwner } = hostOwnerId
    ? await supabase.from('profiles').select('full_name, email').eq('id', hostOwnerId).single()
    : { data: null };

  const { data: fullBooking } = await supabase
    .from('bookings').select('drop_off_date, drop_off_time, pick_up_date, pick_up_time, bag_count, total_price, pin_code')
    .eq('id', booking.id).single();

  // In-app notification for traveller
  if (booking.traveller_id) {
    await supabase.from('notifications').insert({
      user_id: booking.traveller_id,
      type: 'booking_confirmed',
      title: 'Payment confirmed ✅',
      body: 'Your payment was successful. Check your bookings for your drop-off PIN.',
      related_booking_id: booking.id,
    }).catch(() => {});

    // Push
    fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
      body: JSON.stringify({
        user_id: booking.traveller_id,
        title: 'Payment confirmed ✅',
        body: 'Your bags are booked! Check the Cubby app for your PIN.',
        data: { type: 'booking_confirmed', booking_id: booking.id },
      }),
    }).catch(() => {});
  }

  const emailBase = `${SUPABASE_URL}/functions/v1/send-email`;

  // Email traveller
  if (traveller?.email && fullBooking) {
    fetch(emailBase, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
      body: JSON.stringify({
        emailType: 'booking_confirmed',
        data: {
          travellerEmail: traveller.email,
          travellerName: traveller.full_name ?? 'Traveller',
          hostName: host?.display_name ?? 'your host',
          location: host?.location_name ?? '',
          dropOffDate: fullBooking.drop_off_date,
          dropOffTime: fullBooking.drop_off_time,
          pickUpDate: fullBooking.pick_up_date,
          pickUpTime: fullBooking.pick_up_time,
          bagCount: fullBooking.bag_count,
          totalPrice: fullBooking.total_price,
          pinCode: fullBooking.pin_code,
        },
      }),
    }).catch(() => {});
  }

  // Email host
  if (hostOwner?.email && fullBooking) {
    fetch(emailBase, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
      body: JSON.stringify({
        emailType: 'new_booking_request',
        data: {
          hostEmail: hostOwner.email,
          hostName: host?.display_name ?? 'Host',
          travellerName: traveller?.full_name ?? 'A traveller',
          dropOffDate: fullBooking.drop_off_date,
          dropOffTime: fullBooking.drop_off_time,
          pickUpDate: fullBooking.pick_up_date,
          pickUpTime: fullBooking.pick_up_time,
          bagCount: fullBooking.bag_count,
          totalPrice: fullBooking.total_price,
        },
      }),
    }).catch(() => {});
  }
}
