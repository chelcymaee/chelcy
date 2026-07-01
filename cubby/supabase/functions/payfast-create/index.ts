// ─── payfast-create Edge Function ─────────────────────────────────────────────
//
// Creates a booking record with status 'pending_payment' and returns a redirect
// URL pointing to payfast-page, which serves the signed auto-submit form.
//
// Called by the client during checkout. No payment credentials are returned
// to the client — all signing happens in payfast-page.
//
// POST /functions/v1/payfast-create
// Auth: Supabase JWT (traveller must be signed in)
// Body: { bookingId, amount (cents), bagCount, hostName, travellerId, travellerEmail }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      bookingId, amount, bagCount, hostName, travellerId, travellerEmail,
    } = await req.json();

    if (!bookingId || !amount || !travellerEmail) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: bookingId, amount, travellerEmail' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const merchantId = Deno.env.get('PAYFAST_MERCHANT_ID');
    const merchantKey = Deno.env.get('PAYFAST_MERCHANT_KEY');

    if (!merchantId || !merchantKey) {
      // Graceful fallback when PayFast is not configured
      return new Response(
        JSON.stringify({ error: 'PayFast credentials not configured', code: 'PAYFAST_NOT_CONFIGURED' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    // Mark the booking with PayFast as the provider
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ payment_provider: 'payfast', status: 'pending_payment' })
      .eq('id', bookingId);

    if (updateError) {
      console.error('[payfast-create] DB update error:', updateError);
      // Non-fatal — proceed to redirect
    }

    // payfast-page is a GET endpoint that generates the signed form HTML
    const pageUrl = `${SUPABASE_URL}/functions/v1/payfast-page?bookingId=${encodeURIComponent(bookingId)}`;

    return new Response(
      JSON.stringify({ redirectUrl: pageUrl }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[payfast-create] Error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
