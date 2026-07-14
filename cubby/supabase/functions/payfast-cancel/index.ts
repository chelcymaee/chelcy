// ─── payfast-cancel Edge Function ─────────────────────────────────────────────
//
// GET /functions/v1/payfast-cancel?bookingId=...
//
// PayFast redirects here when the user cancels payment.
// We update the booking to 'cancelled' and deep-link back to app.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const bookingId = url.searchParams.get('bookingId') ?? '';

  if (bookingId && SERVICE_ROLE_KEY) {
    try {
      const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
      await supabase
        .from('bookings')
        .update({ status: 'cancelled', failure_reason: 'PayFast: user cancelled' })
        .eq('id', bookingId)
        .in('status', ['pending', 'pending_payment']);
    } catch (e) {
      console.error('[payfast-cancel] DB update error:', e);
    }
  }

  const deepLink = `cubby://payment-result?status=cancelled&bookingId=${encodeURIComponent(bookingId)}`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payment cancelled</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex;
           flex-direction: column; align-items: center; justify-content: center;
           min-height: 100vh; background: #FAF9F6; padding: 24px; margin: 0; }
    .icon { font-size: 56px; margin-bottom: 16px; }
    h2 { font-size: 22px; font-weight: 800; color: #1A1A1A; margin-bottom: 8px; text-align: center; }
    p { font-size: 15px; color: #6B7280; text-align: center; margin-bottom: 28px; line-height: 1.5; }
    a { background: #FF5C5C; color: white; font-weight: 700; font-size: 16px;
        padding: 16px 32px; border-radius: 14px; text-decoration: none; display: inline-block; }
  </style>
  <script>setTimeout(() => { window.location.href = '${deepLink}'; }, 1500);</script>
</head>
<body>
  <div class="icon">❌</div>
  <h2>Payment cancelled</h2>
  <p>Your payment was cancelled. No charge was made.<br/>You can try again from the Cubby app.</p>
  <a href="${deepLink}">Return to Cubby</a>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
});
