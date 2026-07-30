// ─── paygate-notify Edge Function ───────────────────────────────────────────
//
// PayGate's server-to-server webhook — the authoritative payment-status
// signal, delivered independently of whether the traveller's browser ever
// makes it back to the not-yet-built paygate-return. Validates the
// payload, verifies its checksum against OUR OWN known PAYGATE_ID (never
// the payload's own claim of it), confirms the notified AMOUNT matches
// the booking's own expected price, and — only once all of that holds —
// resolves the booking via the now-trusted REFERENCE and calls
// confirm_booking_payment when TRANSACTION_STATUS is exactly '1'.
//
// POST /functions/v1/paygate-notify
// Public, unauthenticated — PayGate has no way to attach a Supabase JWT to
// this call, and doesn't need to: the checksum is the authentication.
//
// Response policy — "OK" acknowledges RECEIPT, not success:
// PayGate's own docs say the plain-text "OK" response is required "to
// acknowledge receipt", and retries up to twice at 30-minute intervals if
// it isn't returned. That distinction matters: OK is reserved for the
// three cases where retrying would genuinely be pointless (a fully
// verified, successfully processed payment; a fully verified non-approved
// status with nothing to do; a fully verified duplicate that
// confirm_booking_payment's own idempotency already resolved safely).
// Every other outcome — a malformed/untrusted payload, an amount
// mismatch, a transient RPC/DB failure, or an unexpected RPC result like
// reference_reused — returns a non-2xx, non-"OK" response instead, so a
// genuinely transient failure on OUR side gets PayGate's automatic retry
// rather than being silently and permanently lost. PayGate's retry policy
// is bounded (2 extra attempts, then it gives up), so there is no
// unbounded retry-storm risk in choosing not to acknowledge an ambiguous
// or failed case.
//
// Deliberately narrow scope: no redirect, no query.trans, no refund
// logic, and no action at all for any TRANSACTION_STATUS other than '1' —
// a declined/failed/pending notification is logged and acknowledged
// (with OK, since there's nothing to retry), not acted on, in this PR.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  PAYGATE_ID, PAYGATE_ENCRYPTION_KEY, NOTIFY_FIELD_ORDER,
  verifyChecksum, parseFormEncoded,
} from '../_shared/paygate.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';

const ok = () => new Response('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } });

// Deliberately NOT "OK" and NOT a 2xx status, so PayGate's retry fires
// regardless of whether it checks the status code, the body, or both.
// `status` distinguishes "your payload will never be valid, don't bother"
// (400) from "something is genuinely wrong on our end, please retry" (500)
// for anyone reading logs — PayGate itself only needs it to not read "OK".
function notOk(reason: string, status = 500) {
  return new Response(reason, { status, headers: { 'Content-Type': 'text/plain' } });
}

// Fields this function cannot proceed without. AMOUNT is required here
// (unlike a purely structural read of the field table) because this
// function's own amount-verification step depends on it. The rest PayGate
// sends (RESULT_CODE, AUTH_CODE, CURRENCY, RESULT_DESC, RISK_INDICATOR,
// PAY_METHOD, PAY_METHOD_DETAIL, USER1-3, VAULT_ID, PAYVAULT_DATA_1-2) are
// part of the checksum if present, but not otherwise required.
const REQUIRED_FIELDS = ['PAYGATE_ID', 'PAY_REQUEST_ID', 'REFERENCE', 'TRANSACTION_STATUS', 'AMOUNT', 'CHECKSUM'];

Deno.serve(async (req) => {
  // A stray non-POST request isn't a PayGate notification at all (health
  // check, misdirected request, manual visit) — OK here is harmless and
  // not one of the retry-relevant cases above.
  if (req.method !== 'POST') return ok();

  try {
    const rawBody = await req.text();
    const payload = parseFormEncoded(rawBody);

    const missing = REQUIRED_FIELDS.filter((f) => !payload[f]);
    if (missing.length > 0) {
      console.warn('[paygate-notify] Missing required field(s), no booking updated:', missing.join(', '));
      return notOk('MISSING_FIELDS', 400);
    }

    if (!PAYGATE_ID || !PAYGATE_ENCRYPTION_KEY) {
      // Infra/config failure on our side, not a payload-trust problem —
      // treated the same as a transient failure, not acknowledged.
      console.error('[paygate-notify] PayGate credentials not configured — cannot verify notify payload');
      return notOk('NOT_CONFIGURED', 500);
    }

    // Defensive, not the actual security boundary (that's the checksum
    // reconstruction below, which always substitutes OUR OWN PAYGATE_ID
    // regardless of what the payload claims) — but a payload claiming a
    // different merchant ID than ours is worth its own clear log line
    // rather than folding into a generic checksum-mismatch message.
    if (payload.PAYGATE_ID !== PAYGATE_ID) {
      console.warn('[paygate-notify] Payload PAYGATE_ID does not match configured PAYGATE_ID:', payload.PAYGATE_ID);
    }

    // Verify using OUR OWN known PAYGATE_ID, not the payload's claimed
    // value — same principle paygate-initiate's response verification
    // uses. The only way to produce a checksum that validates against OUR
    // PAYGATE_ID is to know PAYGATE_ENCRYPTION_KEY, regardless of what
    // PAYGATE_ID value the payload itself contains.
    const checksumFields = { ...payload, PAYGATE_ID };
    const checksumValid = verifyChecksum(checksumFields, NOTIFY_FIELD_ORDER, PAYGATE_ENCRYPTION_KEY, payload.CHECKSUM);

    if (!checksumValid) {
      console.error('[paygate-notify] Checksum verification failed, no booking updated. REFERENCE:', payload.REFERENCE);
      return notOk('CHECKSUM_INVALID', 400);
    }

    // Only now — after a verified checksum — is REFERENCE trusted enough
    // to use as a lookup key. Before this point it was just an unverified
    // claim inside the payload. Deliberately still just booking.id — this
    // does NOT need to match paygate_pay_request_id (an older, otherwise-
    // superseded initiate attempt is allowed to still complete; see the
    // known-limitation note in PROJECT_MASTER_PLAN.md), only REFERENCE.
    const bookingId = payload.REFERENCE;

    if (payload.TRANSACTION_STATUS !== '1') {
      // Any other status (0 = unprocessed, 2 = declined, etc.) is a fully
      // verified, trustworthy payload telling us "this didn't succeed" —
      // acknowledged with OK (nothing to retry), not acted on. No cancel/
      // refund logic in this function, by design.
      console.log('[paygate-notify] Non-success TRANSACTION_STATUS, no action taken:', bookingId, payload.TRANSACTION_STATUS);
      return ok();
    }

    const supabase = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    // Amount verification — a valid checksum proves this payload genuinely
    // came from PayGate unmodified, but says nothing about whether the
    // amount PayGate is reporting matches what THIS booking actually
    // costs. Fetch the expected amount ourselves rather than trusting
    // anything client- or payload-supplied, same principle paygate-
    // initiate already uses for AMOUNT/EMAIL. total_price is write-once
    // in this schema (nothing in the app ever updates it after booking
    // creation), so there's no meaningful TOCTOU window between this read
    // and confirm_booking_payment's own guarded UPDATE below.
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings').select('total_price').eq('id', bookingId).single();

    if (bookingErr || !booking) {
      console.error('[paygate-notify] Booking not found for verified REFERENCE:', bookingId, bookingErr);
      return notOk('BOOKING_NOT_FOUND', 500);
    }

    const expectedCents = Math.round(Number(booking.total_price) * 100);
    const notifiedCents = Math.round(Number(payload.AMOUNT));

    if (expectedCents !== notifiedCents) {
      console.error(
        '[paygate-notify] SECURITY: amount mismatch, booking NOT confirmed:',
        bookingId, 'expected(cents):', expectedCents, 'notified(cents):', notifiedCents,
      );
      return notOk('AMOUNT_MISMATCH', 500);
    }

    // TRANSACTION_ID is PayGate's own definitive per-transaction reference
    // (the PayFast-equivalent of pf_payment_id) — preferred over
    // PAY_REQUEST_ID, which identifies the initiate attempt rather than
    // the settled payment. Falls back to PAY_REQUEST_ID only if
    // TRANSACTION_ID is somehow absent.
    const paymentReference = payload.TRANSACTION_ID || payload.PAY_REQUEST_ID || null;

    const { data: result, error } = await supabase.rpc('confirm_booking_payment', {
      p_booking_id: bookingId,
      p_payment_reference: paymentReference,
      p_payment_provider: 'paygate',
    });

    if (error) {
      // A verified, amount-matched, approved payment that we failed to
      // record due to an RPC/DB-level error — exactly the case PayGate's
      // retry exists for. Must not be acknowledged as OK.
      console.error('[paygate-notify] confirm_booking_payment RPC error, NOT acknowledged:', bookingId, error);
      return notOk('RPC_ERROR', 500);
    }

    if (result?.ok) {
      console.log('[paygate-notify] Booking confirmed, now awaiting host confirmation:', bookingId);
      return ok();
    }

    if (result?.reason === 'already_resolved') {
      // Duplicate or retried notify — benign, PayGate legitimately retries
      // up to twice on anything but a prompt "OK", and a genuinely
      // duplicate real-world delivery is possible too. confirm_booking_
      // payment's own guarded UPDATE already makes this a safe no-op;
      // nothing here needs its own dedup logic layered on top of that.
      // Safe to acknowledge — there is nothing left to retry.
      console.log('[paygate-notify] Duplicate/stale notify, already resolved:', bookingId, result.status);
      return ok();
    }

    // Every other outcome — reference_reused, not_found, invalid_provider,
    // or any reason not explicitly recognised above — is unexpected for a
    // payload that already passed checksum and amount verification, and
    // must not be silently swallowed as OK. reference_reused specifically
    // is a security-relevant anomaly (this payment_reference is already
    // attached to a different booking); logged loudly on purpose, same as
    // payfast-itn's equivalent case.
    console.error('[paygate-notify] confirm_booking_payment did not confirm, NOT acknowledged:', bookingId, result);
    return notOk('CONFIRM_FAILED', 500);
  } catch (err) {
    // An unhandled exception is exactly the kind of thing that could be a
    // transient bug or environment issue — not acknowledged, so a
    // genuinely valid payload gets another chance via PayGate's retry.
    console.error('[paygate-notify] Unexpected error, NOT acknowledged:', err);
    return notOk('INTERNAL_ERROR', 500);
  }
});
