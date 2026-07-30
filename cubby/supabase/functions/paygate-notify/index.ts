// ─── paygate-notify Edge Function ───────────────────────────────────────────
//
// PayGate's server-to-server webhook — the authoritative payment-status
// signal, delivered independently of whether the traveller's browser ever
// makes it back to the not-yet-built paygate-return. Validates the
// payload, verifies its checksum against OUR OWN known PAYGATE_ID (never
// the payload's own claim of it), and — only once verified — resolves the
// booking via the now-trusted REFERENCE and calls confirm_booking_payment
// when TRANSACTION_STATUS is exactly '1'.
//
// POST /functions/v1/paygate-notify
// Public, unauthenticated — PayGate has no way to attach a Supabase JWT to
// this call, and doesn't need to: the checksum is the authentication.
//
// Always responds with the literal plain-text "OK", on every path,
// including rejected/malformed payloads — same precedent as payfast-itn's
// "always 200, log errors, never block". PayGate retries up to 2 more
// times at 30-minute intervals if it doesn't see "OK"; retrying a payload
// that's simply invalid will never make it valid, so responding anything
// else here would only cause pointless retry storms without changing the
// outcome. "OK" is purely PayGate's own retry-suppression signal — it
// says nothing about whether we actually trusted or acted on the payload.
//
// Deliberately narrow scope: no redirect, no query.trans, no refund
// logic, and no action at all for any TRANSACTION_STATUS other than '1' —
// a declined/failed/pending notification is logged and acknowledged, not
// acted on, in this PR.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  PAYGATE_ID, PAYGATE_ENCRYPTION_KEY, NOTIFY_FIELD_ORDER,
  verifyChecksum, parseFormEncoded,
} from '../_shared/paygate.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';

const ok = () => new Response('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } });

// Fields this function cannot proceed without. The rest that PayGate sends
// (RESULT_CODE, AUTH_CODE, CURRENCY, RESULT_DESC, RISK_INDICATOR,
// PAY_METHOD, PAY_METHOD_DETAIL, USER1-3, VAULT_ID, PAYVAULT_DATA_1-2) are
// part of the checksum if present, but not required for this function's
// narrow job of verifying + confirming payment.
const REQUIRED_FIELDS = ['PAYGATE_ID', 'PAY_REQUEST_ID', 'REFERENCE', 'TRANSACTION_STATUS', 'CHECKSUM'];

Deno.serve(async (req) => {
  // Matches payfast-itn's own precedent: always "OK", even for a stray
  // non-POST request — there's no useful alternative response to give a
  // caller that isn't actually PayGate.
  if (req.method !== 'POST') return ok();

  try {
    const rawBody = await req.text();
    const payload = parseFormEncoded(rawBody);

    const missing = REQUIRED_FIELDS.filter((f) => !payload[f]);
    if (missing.length > 0) {
      console.warn('[paygate-notify] Missing required field(s):', missing.join(', '));
      return ok();
    }

    if (!PAYGATE_ID || !PAYGATE_ENCRYPTION_KEY) {
      console.error('[paygate-notify] PayGate credentials not configured — cannot verify notify payload');
      return ok();
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
      console.error('[paygate-notify] Checksum verification failed — payload rejected, no booking updated. REFERENCE:', payload.REFERENCE);
      return ok();
    }

    // Only now — after a verified checksum — is REFERENCE trusted enough
    // to use as a lookup key. Before this point it was just an unverified
    // claim inside the payload.
    const bookingId = payload.REFERENCE;

    if (payload.TRANSACTION_STATUS !== '1') {
      // Any other status (0 = unprocessed, 2 = declined, etc.) is
      // acknowledged and logged, not acted on — no cancel/refund logic in
      // this function, by design.
      console.log('[paygate-notify] Non-success TRANSACTION_STATUS, no action taken:', bookingId, payload.TRANSACTION_STATUS);
      return ok();
    }

    const supabase = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
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
      console.error('[paygate-notify] confirm_booking_payment RPC error:', bookingId, error);
      return ok();
    }

    if (result?.ok) {
      console.log('[paygate-notify] Booking confirmed, now awaiting host confirmation:', bookingId);
    } else if (result?.reason === 'already_resolved') {
      // Duplicate or retried notify — benign, PayGate legitimately retries
      // up to twice on anything but a prompt "OK", and a genuinely
      // duplicate real-world delivery is possible too. confirm_booking_
      // payment's own guarded UPDATE already makes this a safe no-op;
      // nothing here needs its own dedup logic layered on top of that.
      console.log('[paygate-notify] Duplicate/stale notify, already resolved:', bookingId, result.status);
    } else if (result?.reason === 'reference_reused') {
      console.error('[paygate-notify] SECURITY: payment_reference already attached to a different booking:', bookingId, paymentReference);
    } else {
      console.warn('[paygate-notify] confirm_booking_payment did not confirm:', bookingId, result);
    }

    return ok();
  } catch (err) {
    console.error('[paygate-notify] Unexpected error:', err);
    return ok();
  }
});
