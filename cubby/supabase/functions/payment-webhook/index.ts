import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from 'https://deno.land/std@0.168.0/node/crypto.ts';
import { sendAwaitingHostNotifications } from '../_shared/awaiting-host-notifications.ts';

// ─── Legacy Peach Payments webhook — defensive hardening ──────────────────────
//
// This predates the PayFast migration. Its live external registration with
// Peach cannot be verified from this development environment, so it is kept
// working rather than deleted, but it must not diverge from the booking
// lifecycle every other payment path now honours. A successful payment no
// longer writes `status: 'confirmed'` (and the PIN-revealing email that used
// to go with it) directly — it routes through the same
// confirm_booking_payment RPC payfast-itn uses, so the lifecycle, deadline,
// idempotency and payment-reference protections can't drift between
// providers. The guard stays `pending_payment`-only (via the RPC): the only
// live booking-creation path (app/(traveller)/booking.tsx) has only ever
// been observed to create `pending_payment` bookings, never legacy
// `pending` ones, and nothing in the app invokes create-payment (the
// Peach-side booking creator) anymore.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-initialization-vector, x-authentication-tag',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Peach Payments result codes that indicate success
const SUCCESS_CODES = /^(000\.000\.|000\.100\.1|000\.[36])/;
const MANUAL_REVIEW_CODES = /^(000\.400\.0[^3]|000\.400\.100)/;

function isSuccessCode(code: string): boolean {
  return SUCCESS_CODES.test(code) || MANUAL_REVIEW_CODES.test(code);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get('PEACH_WEBHOOK_SECRET');
    const rawBody = await req.text();

    // Validate webhook signature if secret is configured
    if (webhookSecret) {
      const signature = req.headers.get('x-signature') ?? req.headers.get('x-peach-signature') ?? '';
      const expectedSig = createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (signature && signature !== expectedSig) {
        console.warn('Webhook signature mismatch');
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      // Peach may send form-encoded data
      const params = new URLSearchParams(rawBody);
      payload = Object.fromEntries(params.entries());
    }

    const resultCode = String(payload['result.code'] ?? payload['resultCode'] ?? '');
    const bookingId = String(payload['merchantTransactionId'] ?? payload['customParameters[bookingId]'] ?? '');
    const checkoutId = String(payload['id'] ?? payload['checkoutId'] ?? '');

    if (!bookingId) {
      console.warn('Webhook received without merchantTransactionId', payload);
      return new Response(
        JSON.stringify({ received: true, warning: 'No bookingId in payload' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    if (isSuccessCode(resultCode)) {
      // The one authoritative payment-confirmation transition — see
      // confirm_booking_payment in supabase/schema.sql. Same RPC payfast-itn
      // uses: this booking moves to awaiting_host_confirmation (never
      // straight to confirmed), and no PIN-revealing email fires here — the
      // host hasn't accepted yet. p_payment_provider is 'peach' so this
      // never gets mislabeled as a PayFast payment. The guard inside the
      // RPC (status = 'pending_payment') is intentionally not widened to
      // also accept legacy 'pending': the only live booking-creation path
      // (app/(traveller)/booking.tsx) has only ever been observed to create
      // 'pending_payment' bookings.
      const { data: rpcResult, error: rpcErr } = await supabase.rpc('confirm_booking_payment', {
        p_booking_id: bookingId,
        p_payment_reference: checkoutId || null,
        p_payment_provider: 'peach',
      });

      if (rpcErr) {
        console.error('confirm_booking_payment RPC error:', rpcErr);
        return new Response(
          JSON.stringify({ error: 'Database update failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      if (rpcResult?.ok) {
        console.log(`Booking ${bookingId} now awaiting host confirmation`);
        sendAwaitingHostNotifications(supabase, rpcResult.booking).catch(e =>
          console.error('Notification error:', e)
        );
      } else if (rpcResult?.reason === 'already_resolved') {
        // Duplicate or stale webhook call — benign, no re-notify, no reset.
        console.log('Duplicate/stale webhook call, already resolved:', bookingId, rpcResult.status);
      } else if (rpcResult?.reason === 'reference_reused') {
        console.error('SECURITY: payment_reference already attached to another booking:', bookingId, checkoutId);
      } else {
        console.warn('confirm_booking_payment did not confirm:', bookingId, rpcResult);
      }
    } else {
      // Payment failed or declined
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (error) {
        console.error('Failed to cancel booking:', error);
      }

      console.log(`Booking ${bookingId} cancelled, result code: ${resultCode}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('Webhook error:', err);
    // Always return 200 to Peach so they don't retry indefinitely
    return new Response(
      JSON.stringify({ received: true, error: String(err) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
