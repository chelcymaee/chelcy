import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendAwaitingHostNotifications } from '../_shared/awaiting-host-notifications.ts';

// ─── Legacy Peach Payments return-URL handler — defensive hardening ───────────
//
// A second, independent legacy Peach payment-success path (the first is
// payment-webhook — a server-to-server call, generally the more reliable of
// the two; this one is a browser redirect the user's device hits). Its live
// external registration cannot be verified from this development
// environment, so it is kept working rather than deleted, but a successful
// payment here now routes through the same authoritative
// confirm_booking_payment RPC every other payment path uses, rather than
// writing `status: 'confirmed'` directly — the same reasoning as
// payment-webhook's fix applies (see that file's header comment).
//
// Because payment-webhook and payment-result can both fire for the same
// booking in either order, notifications are sent here too, on the same
// ok === true condition — never on already_resolved. Whichever of the two
// calls actually performs the transition is the one whose branch runs;
// the other resolves to already_resolved and stays silent. This avoids a
// race where the webhook is dropped (e.g. Peach never calls it, or it's
// misconfigured) and this redirect is the only signal that ever arrives,
// yet nothing gets notified.

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

  // If success, confirm payment via the shared RPC (payment-webhook, hitting
  // the same booking via the actual Peach webhook, may already have done
  // this — confirm_booking_payment's guarded UPDATE makes either order
  // safe and idempotent; whichever call arrives second just resolves to
  // already_resolved with no second transition or reset deadline).
  if (status === 'success') {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      );
      const { data: rpcResult, error: rpcErr } = await supabase.rpc('confirm_booking_payment', {
        p_booking_id: bookingId,
        p_payment_reference: id || null,
        p_payment_provider: 'peach',
      });

      if (rpcErr) {
        console.error('confirm_booking_payment RPC error:', rpcErr);
      } else if (rpcResult?.ok) {
        sendAwaitingHostNotifications(supabase, rpcResult.booking).catch(e =>
          console.error('Notification error:', e)
        );
      } else if (rpcResult?.reason !== 'already_resolved') {
        console.warn('confirm_booking_payment did not confirm:', bookingId, rpcResult);
      }
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
