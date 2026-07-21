// ─── payfast-page Edge Function ───────────────────────────────────────────────
//
// GET /functions/v1/payfast-page?bookingId=...
//
// Fetches booking + traveller details, generates a signed PayFast payment form,
// and returns an HTML page that auto-submits to PayFast checkout.
//
// All merchant credentials stay server-side — the client only receives HTML.
// The signature is computed fresh each request (deterministic for same bookingId).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHash } from 'https://deno.land/std@0.168.0/node/crypto.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const PAYFAST_MERCHANT_ID = Deno.env.get('PAYFAST_MERCHANT_ID') ?? '';
const PAYFAST_MERCHANT_KEY = Deno.env.get('PAYFAST_MERCHANT_KEY') ?? '';
const PAYFAST_PASSPHRASE = Deno.env.get('PAYFAST_PASSPHRASE') ?? '';
const PAYFAST_SANDBOX = Deno.env.get('PAYFAST_SANDBOX') !== 'false'; // default sandbox=true for safety

const PAYFAST_URL = PAYFAST_SANDBOX
  ? 'https://sandbox.payfast.co.za/eng/process'
  : 'https://www.payfast.co.za/eng/process';

// ─── Signature ────────────────────────────────────────────────────────────────

function buildSignature(params: Record<string, string>): string {
  // Sort keys alphabetically, skip empty values and 'signature' field
  const pairs = Object.keys(params)
    .filter(k => k !== 'signature' && params[k] !== '' && params[k] != null)
    .sort()
    .map(k => `${k}=${encodeURIComponent(params[k]).replace(/%20/g, '+')}`);

  let paramString = pairs.join('&');

  if (PAYFAST_PASSPHRASE) {
    paramString += `&passphrase=${encodeURIComponent(PAYFAST_PASSPHRASE).replace(/%20/g, '+')}`;
  }

  return createHash('md5').update(paramString).digest('hex');
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const bookingId = url.searchParams.get('bookingId');

  const errHtml = (msg: string) => new Response(`
    <!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:40px;">
    <h2>❌ Payment error</h2><p>${msg}</p>
    <p><a href="cubby://payment-result?status=failed&bookingId=${encodeURIComponent(bookingId ?? '')}">Return to Cubby</a></p>
    </body></html>`, { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } });

  if (!bookingId) return errHtml('Missing booking reference.');

  if (!PAYFAST_MERCHANT_ID || !PAYFAST_MERCHANT_KEY) {
    return errHtml('Payment provider not configured. Please contact support.');
  }

  // Fetch booking + traveller
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: booking, error: bErr } = await supabase
    .from('bookings')
    .select('id, total_price, status, traveller_id, host_id')
    .eq('id', bookingId)
    .single();

  if (bErr || !booking) return errHtml('Booking not found.');

  // A successful payment moves the booking to awaiting_host_confirmation,
  // not straight to confirmed (see confirm_booking_payment in
  // supabase/schema.sql), so "already paid, don't re-show the form" now
  // means "anything past pending_payment" rather than "status is exactly
  // confirmed" — otherwise a traveller who already paid and is merely
  // awaiting host confirmation would incorrectly fall through to the
  // payable-status check below and see "this booking cannot be paid".
  if (booking.status !== 'pending_payment' && booking.status !== 'pending') {
    if (booking.status === 'cancelled') {
      return errHtml('This booking cannot be paid at this time.');
    }
    // awaiting_host_confirmation, confirmed, declined, expired, completed, ...
    const deepLink = `cubby://payment-result?status=success&bookingId=${encodeURIComponent(bookingId)}`;
    return new Response(null, { status: 302, headers: { Location: deepLink } });
  }

  const [{ data: traveller }, { data: host }] = await Promise.all([
    supabase.from('profiles').select('full_name, email').eq('id', booking.traveller_id).single(),
    supabase.from('hosts').select('display_name').eq('id', booking.host_id).single(),
  ]);

  if (!traveller?.email) return errHtml('Traveller email not found.');

  const nameParts = (traveller.full_name ?? '').trim().split(' ');
  const firstName = nameParts[0] ?? 'Traveller';
  const lastName = nameParts.slice(1).join(' ') || '-';
  const amountStr = (Number(booking.total_price)).toFixed(2); // total_price stored in ZAR
  const itemName = `Cubby Storage - ${host?.display_name ?? 'Host'}`;

  const functionsBase = `${SUPABASE_URL}/functions/v1`;

  const params: Record<string, string> = {
    merchant_id: PAYFAST_MERCHANT_ID,
    merchant_key: PAYFAST_MERCHANT_KEY,
    return_url: `${functionsBase}/payfast-return?bookingId=${encodeURIComponent(bookingId)}`,
    cancel_url: `${functionsBase}/payfast-cancel?bookingId=${encodeURIComponent(bookingId)}`,
    notify_url: `${functionsBase}/payfast-itn`,
    name_first: firstName,
    name_last: lastName,
    email_address: traveller.email,
    m_payment_id: bookingId,
    amount: amountStr,
    item_name: itemName,
  };

  // Compute signature (merchant_key is included in params for signature but NOT in the form)
  const signature = buildSignature(params);

  // Remove merchant_key from form fields (it's never sent to PayFast in the form)
  const formParams = { ...params };
  delete formParams.merchant_key;
  formParams.signature = signature;

  const hiddenInputs = Object.entries(formParams)
    .map(([k, v]) => `<input type="hidden" name="${k}" value="${v.replace(/"/g, '&quot;')}" />`)
    .join('\n    ');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Redirecting to PayFast…</title>
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
    .amount { font-size: 24px; font-weight: 800; color: #FF5C5C; margin: 0 0 24px; }
    .badge { font-size: 12px; color: #9CA3AF; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="logo">📦</div>
  <h2>Redirecting to PayFast…</h2>
  <p>You're being securely redirected to complete your payment.</p>
  <div class="amount">R${amountStr}</div>
  <div class="spinner"></div>
  <p class="badge">🔒 Secured by PayFast · PCI-DSS Level 1</p>

  <form id="pf" method="POST" action="${PAYFAST_URL}">
    ${hiddenInputs}
  </form>
  <script>document.getElementById('pf').submit();</script>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
});
