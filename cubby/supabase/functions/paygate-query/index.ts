// ─── paygate-query Edge Function ────────────────────────────────────────────
//
// query.trans reconciliation fallback — used when neither paygate-notify's
// webhook nor the traveller's browser return (paygate-return) ever
// happened (dropped webhook, closed browser tab, network failure, etc.).
// Asks PayGate directly "what actually happened to this payment?" and,
// only if the answer is a verified, matched, approved response, confirms
// the booking through the same confirm_booking_payment RPC every other
// paygate-* function uses.
//
// POST /functions/v1/paygate-query
// Body: { bookingId }
// Auth: EITHER a Supabase JWT belonging to the booking's own traveller, OR
// the x-admin-secret header (server-to-server, no end-user JWT to present
// — same pattern booking-expiry-sweep already uses for a scheduled/system
// caller).
//
// Deliberately narrow scope: reconciliation only. Does not touch
// paygate-return, paygate-notify, redirect logic, refunds, or any other
// booking lifecycle transition.
//
// ── Known limitation ──
// This can only reconcile the booking's MOST RECENTLY STORED
// paygate_pay_request_id. bookings.paygate_pay_request_id has no UNIQUE
// constraint and is overwritten by every retried paygate-initiate call —
// see PROJECT_MASTER_PLAN.md. An older, retry-superseded initiate attempt
// is not reconcilable via this path; only the latest one is. This is the
// same limitation already documented for paygate-return, for the same
// underlying reason: both key off this one column, which only ever holds
// the latest attempt. paygate-notify is unaffected, since it resolves via
// checksum-verified REFERENCE (always booking.id), never this column.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  PAYGATE_ID, PAYGATE_ENCRYPTION_KEY, PAYGATE_QUERY_URL,
  RESPONSE_FIELD_ORDER, NOTIFY_FIELD_ORDER,
  buildChecksum, verifyChecksum, parseFormEncoded,
} from '../_shared/paygate.ts';
import { sendAwaitingHostNotifications } from '../_shared/awaiting-host-notifications.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ADMIN_SECRET = Deno.env.get('ADMIN_SECRET') ?? '';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Same set paygate-initiate treats as payable — reconciliation only makes
// sense for a booking still genuinely waiting on a payment outcome.
// Anything else (already confirmed, cancelled, expired, ...) is treated
// as a cheap, no-PayGate-call no-op below.
const RECONCILABLE_STATUSES = ['pending_payment', 'pending'];

// Response fields this function cannot proceed without. Unlike
// paygate-notify's REQUIRED_FIELDS, PAYGATE_ID/PAY_REQUEST_ID/REFERENCE
// are deliberately NOT required here from the parsed response — the
// checksum verification below always substitutes OUR OWN known values for
// those three, so their presence or absence in the raw response text
// doesn't change what gets verified.
const REQUIRED_RESPONSE_FIELDS = ['TRANSACTION_STATUS', 'AMOUNT', 'CHECKSUM'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const { bookingId } = await req.json().catch(() => ({}));
    if (!bookingId) {
      return json({ error: 'Missing required field: bookingId' }, 400);
    }

    if (!PAYGATE_ID || !PAYGATE_ENCRYPTION_KEY) {
      return json({ error: 'PayGate credentials not configured', code: 'PAYGATE_NOT_CONFIGURED' }, 503);
    }

    const supabase = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    // Auth — two independent ways to be authorized, either is sufficient:
    //   1. x-admin-secret: a trusted server-to-server caller with no
    //      end-user JWT to present (e.g. a future scheduled sweep) — same
    //      pattern booking-expiry-sweep already uses.
    //   2. a Supabase JWT whose user.id matches the booking's own
    //      traveller_id — the traveller checking on their own payment.
    // An admin-secret match short-circuits the JWT check entirely; any
    // caller without it falls through to the JWT path and its explicit
    // ownership check below.
    const adminSecretHeader = req.headers.get('x-admin-secret');
    const isAdminCaller = !!ADMIN_SECRET && adminSecretHeader === ADMIN_SECRET;

    let callerUserId: string | null = null;
    if (!isAdminCaller) {
      const authHeader = req.headers.get('Authorization') ?? '';
      const token = authHeader.replace(/^Bearer\s+/i, '');
      const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
      if (authErr || !user) {
        return json({ error: 'Unauthorized' }, 401);
      }
      callerUserId = user.id;
    }

    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select('id, total_price, status, traveller_id, payment_provider, paygate_pay_request_id')
      .eq('id', bookingId)
      .single();

    if (bookingErr || !booking) {
      return json({ error: 'Booking not found' }, 404);
    }

    if (!isAdminCaller && booking.traveller_id !== callerUserId) {
      return json({ error: 'Not authorized for this booking' }, 403);
    }

    // No stored PayGate request to reconcile — either this booking never
    // went through paygate-initiate, or it used a different provider.
    // Never accept a PAY_REQUEST_ID from the client; only this server-side
    // stored value is ever used below.
    if (booking.payment_provider !== 'paygate' || !booking.paygate_pay_request_id) {
      return json(
        { error: 'Booking has no PayGate payment request to reconcile', code: 'NO_PAY_REQUEST_ID' },
        400,
      );
    }

    if (!RECONCILABLE_STATUSES.includes(booking.status)) {
      // Already resolved — by notify, by a previous query call, or by an
      // unrelated lifecycle transition (e.g. expiry). Safe, cheap no-op:
      // no PayGate call, no RPC call, nothing marked paid twice.
      return json({ ok: true, alreadyResolved: true, status: booking.status });
    }

    // Request built entirely from server-controlled values: PAYGATE_ID
    // (env), PAY_REQUEST_ID (the booking's own stored value), REFERENCE
    // (booking.id). RESPONSE_FIELD_ORDER is the same formula the initiate
    // response and the redirect checksum use, and per PayGate's own docs
    // is also the correct formula for this exact request (see
    // _shared/paygate.ts).
    const requestFields: Record<string, string> = {
      PAYGATE_ID,
      PAY_REQUEST_ID: booking.paygate_pay_request_id,
      REFERENCE: booking.id,
    };
    const requestChecksum = buildChecksum(requestFields, RESPONSE_FIELD_ORDER, PAYGATE_ENCRYPTION_KEY);
    const requestBody = new URLSearchParams({ ...requestFields, CHECKSUM: requestChecksum });

    let payGateRes: Response;
    try {
      payGateRes = await fetch(PAYGATE_QUERY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: requestBody.toString(),
        // Same rationale as paygate-initiate: Deno's fetch has no default
        // timeout, so a PayGate server that accepts the connection but
        // never responds would otherwise hang until the platform's own
        // execution ceiling kills it ungracefully.
        signal: AbortSignal.timeout(15_000),
      });
    } catch (fetchErr) {
      const isTimeout = fetchErr instanceof Error
        && (fetchErr.name === 'TimeoutError' || fetchErr.name === 'AbortError');
      console.error(
        `[paygate-query] ${isTimeout ? 'Timed out calling' : 'Network error calling'} query.trans:`,
        bookingId, fetchErr,
      );
      return json(
        { error: 'Could not reach PayGate', code: isTimeout ? 'PAYGATE_TIMEOUT' : 'PAYGATE_UNREACHABLE' },
        502,
      );
    }

    const responseText = await payGateRes.text();
    if (!payGateRes.ok) {
      console.error('[paygate-query] query.trans returned non-OK status:', bookingId, payGateRes.status);
      return json({ error: 'PayGate rejected the request', code: 'PAYGATE_REJECTED' }, 502);
    }

    const parsed = parseFormEncoded(responseText);

    if (parsed.ERROR) {
      console.error('[paygate-query] PayGate returned an error:', bookingId, parsed.ERROR);
      return json({ error: 'PayGate returned an error', code: 'PAYGATE_ERROR', detail: parsed.ERROR }, 502);
    }

    const missingResponseFields = REQUIRED_RESPONSE_FIELDS.filter((f) => !parsed[f]);
    if (missingResponseFields.length > 0) {
      console.error('[paygate-query] Malformed query response, no booking updated:', bookingId, missingResponseFields.join(', '));
      return json({ error: 'Malformed response from PayGate', code: 'PAYGATE_MALFORMED_RESPONSE' }, 502);
    }

    // Verify the response checksum using OUR OWN known PAYGATE_ID and OUR
    // OWN stored PAY_REQUEST_ID/REFERENCE — never the response's own echo
    // of them — same "never trust echoed identity fields" principle every
    // other paygate-* function applies. The only way to produce a checksum
    // that validates against these substituted values is to know
    // PAYGATE_ENCRYPTION_KEY, regardless of what those fields say in the
    // raw response. NOTIFY_FIELD_ORDER is used here per the docs' explicit
    // statement that the query response's field structure is identical to
    // the Notify URL Response's (see _shared/paygate.ts) — this inherits
    // that constant's not-yet-worked-example-confirmed, blocking-pre-
    // launch caveat.
    const responseFieldsForChecksum = {
      ...parsed,
      PAYGATE_ID,
      PAY_REQUEST_ID: booking.paygate_pay_request_id,
      REFERENCE: booking.id,
    };
    const checksumValid = verifyChecksum(
      responseFieldsForChecksum, NOTIFY_FIELD_ORDER, PAYGATE_ENCRYPTION_KEY, parsed.CHECKSUM,
    );

    if (!checksumValid) {
      console.error('[paygate-query] Response checksum verification failed, nothing confirmed:', bookingId);
      return json({ error: 'Could not verify PayGate response', code: 'CHECKSUM_INVALID' }, 502);
    }

    // Merchant ID, REFERENCE, and amount are each explicitly compared
    // below, even though the checksum verification above already
    // cryptographically binds PAYGATE_ID and REFERENCE to our own known
    // values via substitution (so these three are structurally guaranteed
    // to already match, the same way paygate-initiate's REFERENCE
    // belt-and-braces check works) — kept explicit rather than assumed, so
    // a future change to the substitution logic can't silently weaken this
    // without also breaking an explicit, readable check.
    if (parsed.PAYGATE_ID !== PAYGATE_ID) {
      console.error('[paygate-query] Merchant ID mismatch despite valid checksum, nothing confirmed:', bookingId, parsed.PAYGATE_ID);
      return json({ error: 'Unexpected response from PayGate', code: 'MERCHANT_ID_MISMATCH' }, 502);
    }

    if (parsed.REFERENCE !== booking.id) {
      console.error('[paygate-query] REFERENCE mismatch despite valid checksum, nothing confirmed:', bookingId, parsed.REFERENCE);
      return json({ error: 'Unexpected response from PayGate', code: 'REFERENCE_MISMATCH' }, 502);
    }

    // Amount verification — mirrors paygate-notify: a valid checksum only
    // proves this response genuinely came from PayGate unmodified, not
    // that its AMOUNT matches what this specific booking actually costs.
    const expectedCents = Math.round(Number(booking.total_price) * 100);
    const queriedCents = Math.round(Number(parsed.AMOUNT));

    if (expectedCents !== queriedCents) {
      console.error(
        '[paygate-query] SECURITY: amount mismatch, booking NOT confirmed:',
        bookingId, 'expected(cents):', expectedCents, 'queried(cents):', queriedCents,
      );
      return json({ error: 'Amount mismatch', code: 'AMOUNT_MISMATCH' }, 502);
    }

    if (parsed.TRANSACTION_STATUS !== '1') {
      // A fully verified, trustworthy "not approved" answer — declined,
      // pending, unprocessed, etc. Nothing to confirm; not an error, just
      // not a payment to act on. No RPC call.
      console.log('[paygate-query] Non-success TRANSACTION_STATUS, no action taken:', bookingId, parsed.TRANSACTION_STATUS);
      return json({ ok: true, confirmed: false, transactionStatus: parsed.TRANSACTION_STATUS });
    }

    // TRANSACTION_ID is PayGate's own definitive per-transaction reference
    // (same precedence paygate-notify uses), falling back to the stored
    // PAY_REQUEST_ID only if TRANSACTION_ID is somehow absent.
    const paymentReference = parsed.TRANSACTION_ID || booking.paygate_pay_request_id;

    const { data: result, error: rpcErr } = await supabase.rpc('confirm_booking_payment', {
      p_booking_id: booking.id,
      p_payment_reference: paymentReference,
      p_payment_provider: 'paygate',
    });

    if (rpcErr) {
      console.error('[paygate-query] confirm_booking_payment RPC error:', bookingId, rpcErr);
      return json({ error: 'Could not confirm booking', code: 'RPC_ERROR' }, 500);
    }

    if (result?.ok) {
      console.log('[paygate-query] Booking confirmed via reconciliation:', bookingId);
      // Fire-and-forget, same pattern payfast-itn/paygate-notify already
      // use — reuses the one shared notification helper rather than a
      // second implementation. Only reachable on a FRESH
      // confirm_booking_payment success (never on the already_resolved
      // no-op below, and never before the eligibility/checksum/merchant-
      // ID/REFERENCE/amount checks above have all passed). The RPC's own
      // guarded UPDATE means result.ok is true at most once per booking,
      // so this can't double-notify even if paygate-notify and this
      // reconciliation call race for the same booking — whichever loses
      // the race gets already_resolved here, never a second notification.
      sendAwaitingHostNotifications(supabase, result.booking).catch((e) =>
        console.error('[paygate-query] Notification error:', e)
      );
      return json({ ok: true, confirmed: true });
    }

    if (result?.reason === 'already_resolved') {
      // A race with notify/return/a concurrent query call resolved it in
      // the meantime — safe no-op, the same idempotency guarantee every
      // other paygate-* caller of this RPC relies on.
      console.log('[paygate-query] Already resolved by the time reconciliation ran:', bookingId, result.status);
      return json({ ok: true, confirmed: false, alreadyResolved: true, status: result.status });
    }

    // Every other outcome (reference_reused, not_found, invalid_provider,
    // or any unrecognised reason) is unexpected for a payload that already
    // passed checksum, merchant ID, REFERENCE, and amount verification —
    // logged loudly, same as paygate-notify's equivalent case.
    console.error('[paygate-query] confirm_booking_payment did not confirm:', bookingId, result);
    return json({ error: 'Could not confirm booking', code: 'CONFIRM_FAILED', detail: result?.reason }, 500);
  } catch (err) {
    console.error('[paygate-query] Unexpected error:', err);
    return json({ error: 'Internal server error' }, 500);
  }
});
