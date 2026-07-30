// ─── paygate-redirect Edge Function ─────────────────────────────────────────
//
// The thin bridge between paygate-initiate and PayGate's hosted payment
// page. paygate-initiate already called initiate.trans and verified
// PayGate's response checksum server-to-server; this function's only job is
// to hand the browser an auto-submitting HTML form that POSTs the already-
// verified PAY_REQUEST_ID + CHECKSUM to process.trans, per PayGate's
// "Redirect to PayWeb" documentation.
//
// GET /functions/v1/paygate-redirect?payRequestId=...&checksum=...
// Public, unauthenticated — this is opened directly by WebBrowser /
// window.location, which cannot attach an Authorization header. That's
// fine: neither value is a secret (both are non-reversible/non-forgeable
// without PAYGATE_ENCRYPTION_KEY, which this function never touches), and
// ownership/eligibility were already enforced with a real JWT one step
// earlier, in paygate-initiate.
//
// Deliberately does nothing else: no Supabase client, no booking lookup,
// no RPC call, no checksum computation (the checksum was already computed
// and verified upstream — this function only ever re-emits it unchanged),
// no notify/return/query/refund logic. If either query param is missing or
// malformed, this returns a structured JSON error, never partial or
// malformed HTML.

import { PAYGATE_PROCESS_URL, isValidPayRequestId, isValidChecksumShape, escapeHtml } from '../_shared/paygate.ts';

function jsonError(message: string, code: string, status = 400) {
  return new Response(JSON.stringify({ error: message, code }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve((req) => {
  if (req.method !== 'GET') {
    return jsonError('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
  }

  const url = new URL(req.url);
  const payRequestId = url.searchParams.get('payRequestId') ?? '';
  const checksum = url.searchParams.get('checksum') ?? '';

  if (!payRequestId || !checksum) {
    return jsonError('Missing payRequestId or checksum', 'MISSING_PARAMS');
  }

  if (!isValidPayRequestId(payRequestId)) {
    return jsonError('Malformed payRequestId', 'INVALID_PAY_REQUEST_ID');
  }

  if (!isValidChecksumShape(checksum)) {
    return jsonError('Malformed checksum', 'INVALID_CHECKSUM_SHAPE');
  }

  // PAYGATE_PROCESS_URL is a fixed constant (no PAYGATE_SANDBOX flag) —
  // PayGate has no separate sandbox host, so "the current environment" is
  // entirely a function of which PAYGATE_ID/PAYGATE_ENCRYPTION_KEY were
  // configured back in paygate-initiate, not anything selected here.
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Redirecting to PayGate…</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex;
           flex-direction: column; align-items: center; justify-content: center;
           min-height: 100vh; background: #FAF9F6; padding: 24px; margin: 0; }
    .logo { font-size: 42px; margin-bottom: 16px; }
    h2 { font-size: 20px; font-weight: 700; color: #1A1A1A; margin: 0 0 8px; }
    p { font-size: 15px; color: #6B7280; margin: 0 0 24px; }
    .spinner { width: 32px; height: 32px; border: 3px solid #F3F4F6;
               border-top-color: #FF5C5C; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .badge { font-size: 12px; color: #9CA3AF; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="logo">📦</div>
  <h2>Redirecting to PayGate…</h2>
  <p>You're being securely redirected to complete your payment.</p>
  <div class="spinner"></div>
  <p class="badge">🔒 Secured by PayGate</p>

  <form id="pg" method="POST" action="${PAYGATE_PROCESS_URL}">
    <input type="hidden" name="PAY_REQUEST_ID" value="${escapeHtml(payRequestId)}" />
    <input type="hidden" name="CHECKSUM" value="${escapeHtml(checksum)}" />
    <input type="submit" value="Continue to PayGate" />
  </form>
  <script>document.getElementById('pg').submit();</script>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
});
