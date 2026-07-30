// ─── paygate-return Edge Function ───────────────────────────────────────────
//
// GET /functions/v1/paygate-return?bookingId=...
// (PayGate appends its own PAY_REQUEST_ID, TRANSACTION_STATUS, CHECKSUM
// query params to this — the RETURN_URL we gave it in paygate-initiate.)
//
// PayGate redirects the traveller's browser here after checkout. Per
// PayGate's own documentation: "this return is client-initiated. It
// should not be trusted for final reconciliation. Always use the Notify
// or Query for confirmation." So — same principle payfast-return already
// uses — this function is pure READ-ONLY reporting: it never writes to
// the booking, never calls confirm_booking_payment, and never trusts
// PayGate's own claimed TRANSACTION_STATUS for its decision.
//
// query.trans reconciliation is deliberately NOT included in this PR — a
// dedicated follow-up, kept separate so this stays a small, reviewable,
// read-only function.
//
// ── Identity binding (fixed after a real IDOR was found in review) ──
// This is a PUBLIC, unauthenticated endpoint by necessity — PayGate's
// browser redirect can't carry a Supabase JWT. That means the checksum is
// the *only* possible authorization mechanism here, and it must actually
// gate disclosure, not just be logged. The query string's own `bookingId`
// param is never trustworthy on its own: it's fully attacker-controlled
// (the browser can rewrite any part of this URL), so it is NEVER used to
// look up or disclose a specific booking's status. Instead:
//
//   1. The booking is looked up by the PayGate-issued PAY_REQUEST_ID
//      (bookings.paygate_pay_request_id) — a value only PayGate and our
//      own paygate-initiate ever see, never exposed in any client UI.
//   2. The checksum is then verified using REFERENCE = that DB row's own
//      `id` (never the URL's bookingId param) + the received
//      PAY_REQUEST_ID/TRANSACTION_STATUS + our own known PAYGATE_ID.
//   3. Only if that checksum verifies is that booking's real status ever
//      disclosed, using its own DB-verified id for the deep link.
//
// Any failure at any step (missing params, unknown PAY_REQUEST_ID, or a
// checksum that doesn't verify) falls through to one single generic
// response — status "pending", no bookingId, nothing looked up or
// disclosed. This means the URL's bookingId param is now provably
// irrelevant to what this endpoint discloses: changing it, removing all
// PayGate params, or supplying someone else's UUID with no valid
// PayGate params attached all produce the exact same generic, non-
// disclosing response — there is no code path where an arbitrary or
// guessed bookingId alone yields another traveller's real status.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PAYGATE_ID, PAYGATE_ENCRYPTION_KEY, RETURN_FIELD_ORDER, verifyChecksum, escapeHtml } from '../_shared/paygate.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// Same rationale as paygate-redirect: this page can report one specific
// booking's payment status — a cached or replayed copy could show stale
// or (before this fix) wrong information — plus standard hardening for
// an auto-redirecting page whose only external destination is a fixed
// cubby:// deep link, never an arbitrary one (no open-redirect surface:
// nothing here reads a caller-supplied redirect target).
const securityHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'",
};

// Escapes a value for safe interpolation inside a single-quoted JS string
// literal — deliberately NOT the same escaping as escapeHtml (which
// targets HTML attribute/text context and would turn '&' into the
// *literal 5 characters* "&amp;" inside a JS string, corrupting the URL
// rather than protecting it — caught in review by actually testing this
// path, not just assuming one escape function covers both contexts).
function escapeJsString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
}

function renderPage(status: 'success' | 'pending' | 'failed', bookingId: string) {
  // bookingId is always either '' or a real gen_random_uuid() value read
  // back from our own database by this point — never raw user input — so
  // neither escape below actually changes anything in practice today.
  // Both are kept anyway as a safety net: escaping costs nothing, and this
  // is exactly the kind of place a future change could otherwise silently
  // reintroduce an injection. Two DIFFERENT escapes are required because
  // the same string is embedded in two different contexts below — an HTML
  // attribute (href) and a JS string literal (<script>) — and conflating
  // them is itself a bug (see escapeJsString's comment).
  const rawDeepLink = `cubby://payment-result?status=${status}&bookingId=${encodeURIComponent(bookingId)}`;
  const deepLinkForHref = escapeHtml(rawDeepLink);
  const deepLinkForScript = escapeJsString(rawDeepLink);

  const icon = status === 'success' ? '✅' : status === 'pending' ? '⏳' : '❌';
  const heading = status === 'success' ? 'Payment successful!' : status === 'pending' ? 'Processing payment…' : 'Payment failed';
  const body = status === 'success'
    ? "Your bags are booked. We're waiting for your host to confirm — you'll be notified as soon as they respond."
    : status === 'pending'
    ? 'Your payment is being confirmed. Return to the Cubby app to check status.'
    : 'Something went wrong. Tap below to try again.';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Returning to Cubby…</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex;
           flex-direction: column; align-items: center; justify-content: center;
           min-height: 100vh; background: #FAF9F6; padding: 24px; margin: 0; }
    .icon { font-size: 56px; margin-bottom: 16px; }
    h2 { font-size: 22px; font-weight: 800; color: #1A1A1A; margin-bottom: 8px; text-align: center; }
    p { font-size: 15px; color: #6B7280; text-align: center; margin-bottom: 28px; line-height: 1.5; }
    a { background: #FF5C5C; color: white; font-weight: 700; font-size: 16px;
        padding: 16px 32px; border-radius: 14px; text-decoration: none; display: inline-block; }
    .logo { font-size: 14px; color: #9CA3AF; margin-top: 32px; }
  </style>
  <script>
    // Auto-redirect after 1.5s so the user sees the status
    setTimeout(() => { window.location.href = '${deepLinkForScript}'; }, 1500);
  </script>
</head>
<body>
  <div class="icon">${icon}</div>
  <h2>${heading}</h2>
  <p>${body}</p>
  <a href="${deepLinkForHref}">Return to Cubby</a>
  <div class="logo">📦 Cubby</div>
</body>
</html>`;

  return new Response(html, {
    headers: { ...securityHeaders, 'Content-Type': 'text/html; charset=utf-8' },
  });
}

// The one non-disclosing response for every failure path below — never
// looks anything up, never includes a bookingId, identical regardless of
// *why* verification failed (missing params, unknown PAY_REQUEST_ID, bad
// checksum). Logged with a specific reason server-side only.
function genericResponse() {
  return renderPage('pending', '');
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const payRequestId = url.searchParams.get('PAY_REQUEST_ID') ?? '';
  const transactionStatus = url.searchParams.get('TRANSACTION_STATUS') ?? '';
  const checksum = url.searchParams.get('CHECKSUM') ?? '';

  if (!payRequestId || !transactionStatus || !checksum) {
    console.warn('[paygate-return] Missing PayGate return params — nothing disclosed');
    return genericResponse();
  }

  if (!PAYGATE_ID || !PAYGATE_ENCRYPTION_KEY || !SERVICE_ROLE_KEY) {
    console.error('[paygate-return] Not configured — nothing disclosed');
    return genericResponse();
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Step 1: look up by the PayGate-issued identifier — never by the URL's
  // own (fully attacker-controllable) bookingId query param. Filtered on
  // payment_provider = 'paygate' too: paygate_pay_request_id is currently
  // only ever written by paygate-initiate (which always sets both fields
  // together), so this is redundant *today* — but that's an invariant
  // enforced by convention across other files, not by any DB constraint,
  // and this filter costs nothing to make it explicit rather than assumed.
  //
  // Uses a plain array-returning select + an explicit length check rather
  // than .single()/.maybeSingle(). paygate_pay_request_id deliberately has
  // no UNIQUE constraint (retries are meant to overwrite it — see the
  // known-limitation note in PROJECT_MASTER_PLAN.md), so more than one row
  // COULD in principle match. Rather than relying on exactly how the
  // Supabase client/PostgREST happen to handle that multi-row case
  // internally — behavior this environment has no way to execute and
  // observe directly (no local PostgREST/Docker) — this fails closed on
  // our own explicit, directly-testable condition: anything other than
  // exactly one match discloses nothing.
  const { data: matches, error: lookupErr } = await supabase
    .from('bookings').select('id, status')
    .eq('paygate_pay_request_id', payRequestId)
    .eq('payment_provider', 'paygate');

  if (lookupErr) {
    // Logged without the raw error object — avoids echoing driver/schema
    // internals into logs for what's ultimately just "lookup didn't work".
    console.error('[paygate-return] Booking lookup error for PAY_REQUEST_ID — nothing disclosed:', payRequestId);
    return genericResponse();
  }

  if (!matches || matches.length === 0) {
    console.warn('[paygate-return] No booking found for PAY_REQUEST_ID — nothing disclosed:', payRequestId);
    return genericResponse();
  }

  if (matches.length > 1) {
    // Should be structurally impossible (see comment above), but this is
    // exactly the scenario that must fail closed rather than guess — never
    // disclose any of the ambiguous candidates.
    console.error('[paygate-return] SECURITY: multiple bookings matched one PAY_REQUEST_ID — nothing disclosed:', payRequestId, matches.length);
    return genericResponse();
  }

  const booking = matches[0];

  // Step 2: verify the checksum using REFERENCE = the DB row's OWN id,
  // never the URL's bookingId. This is what actually authorizes
  // disclosure — the only way to produce a checksum that validates
  // against a specific booking.id is to have received it from PayGate's
  // real initiate.trans response for that exact booking, i.e. to know
  // PAYGATE_ENCRYPTION_KEY.
  const fields = {
    PAYGATE_ID, PAY_REQUEST_ID: payRequestId,
    TRANSACTION_STATUS: transactionStatus, REFERENCE: booking.id,
  };
  const checksumValid = verifyChecksum(fields, RETURN_FIELD_ORDER, PAYGATE_ENCRYPTION_KEY, checksum);

  if (!checksumValid) {
    // Deliberately does not log the booking id or status here — an
    // invalid checksum on a real PAY_REQUEST_ID lookup hit is exactly the
    // scenario worth NOT echoing details for.
    console.warn('[paygate-return] Checksum verification failed for a matched PAY_REQUEST_ID — nothing disclosed');
    return genericResponse();
  }

  // Only now — PayGate-issued identifier matched AND checksum verified
  // against that row's own id — is this specific booking's real status
  // disclosed. Same non-authoritative status mapping payfast-return uses:
  // a successful notify moves the booking to awaiting_host_confirmation,
  // not straight to confirmed, so "succeeded" means "no longer
  // pending_payment and not cancelled", not "status is exactly confirmed".
  let status: 'success' | 'pending' | 'failed' = 'pending';
  if (!booking.status || booking.status === 'pending_payment') status = 'pending';
  else if (booking.status === 'cancelled') status = 'failed';
  else status = 'success';

  return renderPage(status, booking.id);
});
