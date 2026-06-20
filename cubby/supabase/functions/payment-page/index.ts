import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const PEACH_BASE = 'https://eu-prod.oppwa.com';
const SUPABASE_FUNCTIONS_URL = Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.supabase.co/functions/v1') ?? '';

serve(async (req) => {
  const url = new URL(req.url);
  const checkoutId = url.searchParams.get('checkoutId');
  const bookingId = url.searchParams.get('bookingId');

  if (!checkoutId || !bookingId) {
    return new Response('Missing checkoutId or bookingId', { status: 400 });
  }

  const shopperResultUrl = `${SUPABASE_FUNCTIONS_URL}/payment-result?bookingId=${encodeURIComponent(bookingId)}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <title>Cubby — Secure Payment</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #FAFAFA;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .header {
      width: 100%;
      background: #FF5C5C;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .logo { font-size: 24px; }
    .header-text { color: white; font-weight: 700; font-size: 18px; }
    .card {
      background: white;
      border-radius: 16px;
      padding: 24px;
      margin: 20px 16px;
      width: calc(100% - 32px);
      max-width: 480px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.06);
    }
    .lock-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid #F0F0F0;
    }
    .lock-icon { font-size: 18px; }
    .lock-text { font-size: 13px; color: #6B7280; }
    wpwl-form { margin-top: 0 !important; }
  </style>
</head>
<body>
  <div class="header">
    <span class="logo">🧳</span>
    <span class="header-text">Cubby Secure Payment</span>
  </div>
  <div class="card">
    <div class="lock-row">
      <span class="lock-icon">🔒</span>
      <span class="lock-text">Secured by Peach Payments · 256-bit SSL</span>
    </div>
    <form action="${shopperResultUrl}" class="paymentWidgets" data-brands="VISA MASTER AMEX"></form>
  </div>
  <script src="${PEACH_BASE}/v1/paymentWidgets.js?checkoutId=${checkoutId}"></script>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
});
