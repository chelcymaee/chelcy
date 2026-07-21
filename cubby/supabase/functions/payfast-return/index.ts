// ─── payfast-return Edge Function ─────────────────────────────────────────────
//
// GET /functions/v1/payfast-return?bookingId=...
//
// PayFast redirects the user here after a successful payment.
// Note: This is NOT authoritative — the ITN is authoritative.
// We check DB status (which ITN should have set) then deep-link back to app.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const bookingId = url.searchParams.get('bookingId') ?? '';

  // Check current booking status
  let status: 'success' | 'pending' | 'failed' = 'pending';

  if (bookingId && SERVICE_ROLE_KEY) {
    try {
      const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
      const { data: booking } = await supabase
        .from('bookings').select('status').eq('id', bookingId).single();

      // A successful ITN moves the booking to awaiting_host_confirmation,
      // not straight to confirmed (see confirm_booking_payment in
      // supabase/schema.sql) — so "payment succeeded" here means "no
      // longer pending_payment and not cancelled", not "status is exactly
      // confirmed". Anything the booking does after that (accepted,
      // declined, expired) is a separate lifecycle stage this return page
      // isn't reporting on; it only answers "did the payment go through".
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
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
});
