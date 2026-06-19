import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Peach result codes that indicate a successful payment
// https://developer.peachpayments.com/docs/checkout-response-codes
const SUCCESS_CODES = /^(000\.000\.|000\.100\.1|000\.[36])/;
const PENDING_CODES = /^(000\.200)/;

serve(async (req) => {
  const url = new URL(req.url);
  const bookingId = url.searchParams.get('bookingId');
  const resourcePath = url.searchParams.get('resourcePath');
  const id = url.searchParams.get('id');

  if (!bookingId) {
    return redirectToApp('failed', '', 'Missing booking reference');
  }

  // Verify payment status with Peach Payments
  const peachToken = Deno.env.get('PEACH_PAYMENTS_TOKEN');
  const entityId = Deno.env.get('PEACH_PAYMENTS_ENTITY_ID');

  let status: 'success' | 'pending' | 'failed' = 'failed';

  if (peachToken && entityId && resourcePath) {
    try {
      const verifyUrl = `https://eu-prod.oppwa.com${resourcePath}?entityId=${entityId}`;
      const verifyRes = await fetch(verifyUrl, {
        headers: { Authorization: `Bearer ${peachToken}` },
      });
      const data = await verifyRes.json();
      const code: string = data?.result?.code ?? '';

      if (SUCCESS_CODES.test(code)) {
        status = 'success';
      } else if (PENDING_CODES.test(code)) {
        status = 'pending';
      }
    } catch (err) {
      console.error('Peach verify error:', err);
    }
  } else if (!resourcePath && !id) {
    // No Peach params — could be a direct hit, treat as failed
    status = 'failed';
  }

  // If success, update booking status to confirmed (webhook may already have done this)
  if (status === 'success') {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      );
      await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', bookingId)
        .eq('status', 'pending'); // only update if still pending (idempotent)
    } catch (err) {
      console.error('Supabase update error:', err);
    }
  }

  return redirectToApp(status, bookingId);
});

function redirectToApp(
  status: 'success' | 'pending' | 'failed',
  bookingId: string,
  _error?: string,
): Response {
  const deepLink = `cubby://payment-result?status=${status}&bookingId=${encodeURIComponent(bookingId)}`;

  // HTML page with both JS redirect and a fallback button
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Returning to Cubby…</title>
  <style>
    body { font-family: -apple-system, sans-serif; display: flex; flex-direction: column;
           align-items: center; justify-content: center; min-height: 100vh; background: #FAFAFA; padding: 24px; }
    .icon { font-size: 56px; margin-bottom: 16px; }
    h2 { font-size: 22px; font-weight: 700; color: #1A1A1A; margin-bottom: 8px; text-align: center; }
    p { font-size: 15px; color: #6B7280; text-align: center; margin-bottom: 28px; }
    a { background: #FF5C5C; color: white; font-weight: 700; font-size: 16px;
        padding: 16px 32px; border-radius: 14px; text-decoration: none; }
  </style>
  <script>window.location.href = '${deepLink}';</script>
</head>
<body>
  <div class="icon">${status === 'success' ? '✅' : status === 'pending' ? '⏳' : '❌'}</div>
  <h2>${status === 'success' ? 'Payment successful!' : status === 'pending' ? 'Payment processing…' : 'Payment failed'}</h2>
  <p>${status === 'success' ? 'Tap below to return to the Cubby app and see your booking.' :
       status === 'pending' ? 'Your payment is being processed. Return to the app to check status.' :
       'Something went wrong with your payment. Tap below to try again.'}</p>
  <a href="${deepLink}">Return to Cubby</a>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
