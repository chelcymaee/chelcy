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
// PayGate's own claimed TRANSACTION_STATUS for its decision. It only
// reports whatever our own database already says (which paygate-notify,
// the actually authoritative signal, should already have set), then
// deep-links back into the app.
//
// query.trans reconciliation (asking PayGate directly when our own DB
// state is still ambiguous — e.g. notify hasn't landed yet) is
// deliberately NOT included in this PR — a dedicated follow-up, kept
// separate so this stays a small, reviewable, read-only function.
//
// Checksum handling: verified (using OUR OWN known PAYGATE_ID, same
// principle as paygate-initiate/paygate-notify) and logged if invalid,
// but a failure does NOT block the response. This isn't a gap — because
// this function never acts on PAY_REQUEST_ID or TRANSACTION_STATUS (the
// only fields the checksum protects here), a tampered/corrupted return
// URL literally cannot change this function's output: bookingId comes
// from our own RETURN_URL construction, and the reported status comes
// entirely from our own DB read. The checksum check exists for tamper
// *detection* and to follow PayGate's documented validation guidance,
// not because an invalid one would let an attacker influence anything.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PAYGATE_ID, PAYGATE_ENCRYPTION_KEY, RETURN_FIELD_ORDER, verifyChecksum } from '../_shared/paygate.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// Same rationale as paygate-redirect: this page reports one specific
// booking's payment status at one point in time — a cached or replayed
// copy could show stale information — plus standard hardening for an
// auto-redirecting page whose only external destination is a fixed
// cubby:// deep link, not an arbitrary one.
const securityHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'",
};

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const bookingId = url.searchParams.get('bookingId') ?? '';
  const payRequestId = url.searchParams.get('PAY_REQUEST_ID') ?? '';
  const transactionStatus = url.searchParams.get('TRANSACTION_STATUS') ?? '';
  const checksum = url.searchParams.get('CHECKSUM') ?? '';

  if (payRequestId && transactionStatus && checksum) {
    if (!PAYGATE_ID || !PAYGATE_ENCRYPTION_KEY) {
      console.warn('[paygate-return] PayGate credentials not configured — skipping checksum check');
    } else {
      const fields = {
        PAYGATE_ID, PAY_REQUEST_ID: payRequestId,
        TRANSACTION_STATUS: transactionStatus, REFERENCE: bookingId,
      };
      const valid = verifyChecksum(fields, RETURN_FIELD_ORDER, PAYGATE_ENCRYPTION_KEY, checksum);
      if (!valid) {
        // Logged, not blocking — see file header for why this is safe.
        console.warn('[paygate-return] Checksum verification failed for return callback:', bookingId, payRequestId);
      }
    }
  } else {
    console.warn('[paygate-return] Missing expected PayGate return params:', bookingId);
  }

  // Check current booking status — our own DB is the source of truth
  // here, never the (unverified-for-decisions) TRANSACTION_STATUS above.
  let status: 'success' | 'pending' | 'failed' = 'pending';

  if (bookingId && SERVICE_ROLE_KEY) {
    try {
      const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
      const { data: booking } = await supabase
        .from('bookings').select('status').eq('id', bookingId).single();

      // A successful notify moves the booking to awaiting_host_confirmation,
      // not straight to confirmed (see confirm_booking_payment in
      // supabase/schema.sql) — so "payment succeeded" here means "no
      // longer pending_payment and not cancelled", not "status is exactly
      // confirmed". Same logic payfast-return already uses.
      if (!booking?.status || booking.status === 'pending_payment') status = 'pending';
      else if (booking.status === 'cancelled') status = 'failed';
      else status = 'success';
    } catch {
      status = 'pending';
    }
  }

  const deepLink = `cubby://payment-result?status=${status}&bookingId=${encodeURIComponent(bookingId)}`;

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
    setTimeout(() => { window.location.href = '${deepLink}'; }, 1500);
  </script>
</head>
<body>
  <div class="icon">${icon}</div>
  <h2>${heading}</h2>
  <p>${body}</p>
  <a href="${deepLink}">Return to Cubby</a>
  <div class="logo">📦 Cubby</div>
</body>
</html>`;

  return new Response(html, {
    headers: { ...securityHeaders, 'Content-Type': 'text/html; charset=utf-8' },
  });
});
