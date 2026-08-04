// ─── paygate-initiate Edge Function ─────────────────────────────────────────
//
// Starts a PayGate PayWeb3 payment: validates the caller and the booking,
// calls PayGate's initiate.trans, independently verifies PayGate's own
// response checksum, and stores the resulting PAY_REQUEST_ID against the
// booking.
//
// Deliberately narrow scope — this function does NOT redirect the browser
// to PayWeb (see the not-yet-built paygate-redirect), does NOT mark the
// booking as paid (that's confirm_booking_payment, called later by the
// not-yet-built paygate-notify/paygate-return), and never touches
// booking.status at all. It only proves the initiate step end-to-end and
// leaves the booking in whatever payable status it was already in.
//
// POST /functions/v1/paygate-initiate
// Auth: Supabase JWT (traveller must be signed in and own the booking)
// Body: { bookingId }
//
// AMOUNT, EMAIL, and every other sensitive field are re-derived server-side
// from the booking/profile record — never trusted from the request body,
// same principle payfast-page already uses for PayFast.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  PAYGATE_ID, PAYGATE_ENCRYPTION_KEY, PAYGATE_INITIATE_URL,
  INITIATE_FIELD_ORDER, RESPONSE_FIELD_ORDER,
  buildChecksum, verifyChecksum, parseFormEncoded,
} from '../_shared/paygate.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';

// Base URL for browser-facing PayGate callbacks (currently just RETURN_URL —
// the page PayGate redirects the user's browser to, which has to render as
// real HTML, not JSON). Supabase's default *.supabase.co domain rewrites
// text/html Edge Function responses to text/plain — a documented anti-abuse
// restriction, confirmed by a Supabase maintainer:
// https://github.com/orgs/supabase/discussions/29633 — so this points at the
// project's custom domain instead. NOTIFY_URL deliberately keeps using the
// default domain below: it's a server-to-server webhook that only ever
// returns text/plain, so it was never affected by this restriction, and
// moving it isn't necessary. Falls back to the default functions base if the
// secret isn't set, so nothing breaks before the custom domain is configured
// or if it's ever rolled back — trailing slash stripped so callers can
// safely append `/function-name` without risking a doubled slash.
const rawPublicFunctionsUrl = Deno.env.get('PUBLIC_FUNCTIONS_URL') ?? `${SUPABASE_URL}/functions/v1`;
const PUBLIC_FUNCTIONS_URL = rawPublicFunctionsUrl.replace(/\/+$/, '');

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Bookings a payment can legitimately be initiated against — the same set
// payfast-page already treats as payable.
const PAYABLE_STATUSES = ['pending_payment', 'pending'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const { bookingId } = await req.json().catch(() => ({}));
    if (!bookingId) {
      return json({ error: 'Missing required field: bookingId' }, 400);
    }

    if (!PAYGATE_ID || !PAYGATE_ENCRYPTION_KEY) {
      // Graceful fallback when PayGate is not configured, same pattern as
      // payfast-create's PAYFAST_NOT_CONFIGURED response.
      return json({ error: 'PayGate credentials not configured', code: 'PAYGATE_NOT_CONFIGURED' }, 503);
    }

    const supabase = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    // Auth — validated manually (this function is deployed with
    // --no-verify-jwt, same as payfast-create), not just trusted from the
    // gateway.
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select('id, total_price, status, traveller_id, host_id, payment_provider')
      .eq('id', bookingId)
      .single();

    if (bookingErr || !booking) {
      return json({ error: 'Booking not found' }, 404);
    }

    // Ownership check — without this, any signed-in traveller who knows a
    // bookingId could initiate a payment attempt against someone else's
    // booking.
    if (booking.traveller_id !== user.id) {
      return json({ error: 'Not authorized for this booking' }, 403);
    }

    if (!PAYABLE_STATUSES.includes(booking.status)) {
      return json(
        { error: 'Booking is not eligible for payment', code: 'NOT_PAYABLE', status: booking.status },
        409,
      );
    }

    const { data: traveller } = await supabase
      .from('profiles').select('email').eq('id', user.id).single();

    if (!traveller?.email) {
      return json({ error: 'Traveller email not found' }, 400);
    }

    const functionsBase = `${SUPABASE_URL}/functions/v1`;
    // total_price is stored as whole Rand (see bookings table); PayWeb3
    // requires AMOUNT in cents.
    const amountCents = Math.round(Number(booking.total_price) * 100);
    // PayGate requires 'YYYY-MM-DD HH:MM:SS', UTC — not ISO 8601.
    const transactionDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const fields: Record<string, string> = {
      PAYGATE_ID,
      REFERENCE: booking.id,
      AMOUNT: String(amountCents),
      CURRENCY: 'ZAR',
      RETURN_URL: `${PUBLIC_FUNCTIONS_URL}/paygate-return?bookingId=${encodeURIComponent(booking.id)}`,
      TRANSACTION_DATE: transactionDate,
      LOCALE: 'en-za',
      COUNTRY: 'ZAF',
      EMAIL: traveller.email,
      NOTIFY_URL: `${functionsBase}/paygate-notify`,
    };

    const checksum = buildChecksum(fields, INITIATE_FIELD_ORDER, PAYGATE_ENCRYPTION_KEY);
    const requestBody = new URLSearchParams({ ...fields, CHECKSUM: checksum });

    let payGateRes: Response;
    try {
      payGateRes = await fetch(PAYGATE_INITIATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: requestBody.toString(),
        // Deno's fetch has no default timeout — without this, a PayGate
        // server that accepts the connection but never responds would hang
        // the function until the platform's own execution ceiling kills it
        // ungracefully, instead of returning our structured error. 15s is
        // generous for a payment-gateway API call.
        signal: AbortSignal.timeout(15_000),
      });
    } catch (fetchErr) {
      const isTimeout = fetchErr instanceof Error
        && (fetchErr.name === 'TimeoutError' || fetchErr.name === 'AbortError');
      console.error(
        `[paygate-initiate] ${isTimeout ? 'Timed out calling' : 'Network error calling'} initiate.trans:`,
        bookingId, fetchErr,
      );
      return json(
        { error: 'Could not reach PayGate', code: isTimeout ? 'PAYGATE_TIMEOUT' : 'PAYGATE_UNREACHABLE' },
        502,
      );
    }

    const responseText = await payGateRes.text();
    if (!payGateRes.ok) {
      console.error('[paygate-initiate] initiate.trans returned non-OK status:', bookingId, payGateRes.status);
      return json({ error: 'PayGate rejected the request', code: 'PAYGATE_REJECTED' }, 502);
    }

    const parsed = parseFormEncoded(responseText);
    const { PAY_REQUEST_ID, REFERENCE, CHECKSUM, ERROR } = parsed;

    if (ERROR) {
      console.error('[paygate-initiate] PayGate returned an error:', bookingId, ERROR);
      return json({ error: 'PayGate returned an error', code: 'PAYGATE_ERROR', detail: ERROR }, 502);
    }

    if (!PAY_REQUEST_ID || !CHECKSUM) {
      console.error('[paygate-initiate] Malformed initiate response (missing fields):', bookingId);
      return json({ error: 'Malformed response from PayGate', code: 'PAYGATE_MALFORMED_RESPONSE' }, 502);
    }

    // Independently verify PayGate's own response checksum before trusting
    // PAY_REQUEST_ID for anything — built from OUR known PAYGATE_ID and
    // OUR own booking.id, not values merely echoed back in the response,
    // so a tampered/forged response can't validate itself.
    const responseFields = { PAYGATE_ID, PAY_REQUEST_ID, REFERENCE: booking.id };
    const checksumValid = verifyChecksum(responseFields, RESPONSE_FIELD_ORDER, PAYGATE_ENCRYPTION_KEY, CHECKSUM);

    if (!checksumValid) {
      console.error('[paygate-initiate] Response checksum mismatch:', bookingId);
      return json({ error: 'Could not verify PayGate response', code: 'CHECKSUM_MISMATCH' }, 502);
    }

    if (REFERENCE !== booking.id) {
      // Belt-and-braces: the checksum we just verified is already tied to
      // our own booking.id, so this should be unreachable — but refuse
      // rather than store a mismatched PAY_REQUEST_ID if it somehow isn't.
      console.error('[paygate-initiate] REFERENCE mismatch despite valid checksum:', bookingId, REFERENCE);
      return json({ error: 'Unexpected response from PayGate', code: 'REFERENCE_MISMATCH' }, 502);
    }

    // Only now — after a verified, genuine PayGate response — do we write
    // anything. Deliberately does not touch status: this function never
    // marks a booking as paid. Guarded on PAYABLE_STATUSES for the same
    // defense-in-depth reason payfast-cancel guards its UPDATE.
    const { error: updateErr } = await supabase
      .from('bookings')
      .update({ payment_provider: 'paygate', paygate_pay_request_id: PAY_REQUEST_ID })
      .eq('id', booking.id)
      .in('status', PAYABLE_STATUSES);

    if (updateErr) {
      console.error('[paygate-initiate] DB update error:', bookingId, updateErr);
      return json({ error: 'Could not save payment request', code: 'DB_UPDATE_FAILED' }, 500);
    }

    return json({ ok: true, payRequestId: PAY_REQUEST_ID, checksum: CHECKSUM });
  } catch (err) {
    console.error('[paygate-initiate] Unexpected error:', err);
    return json({ error: 'Internal server error' }, 500);
  }
});
