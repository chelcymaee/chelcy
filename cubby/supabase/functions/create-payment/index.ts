import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { bookingId, amount, bagCount, hostName, travellerId, travellerEmail } = await req.json();

    if (!bookingId || !amount || !travellerEmail) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: bookingId, amount, travellerEmail' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const peachToken = Deno.env.get('PEACH_PAYMENTS_TOKEN');
    const entityId = Deno.env.get('PEACH_PAYMENTS_ENTITY_ID');

    if (!peachToken || !entityId) {
      return new Response(
        JSON.stringify({ error: 'Peach Payments credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Format amount as "150.00"
    const formattedAmount = (Number(amount) / 100).toFixed(2);

    const body = new URLSearchParams({
      entityId,
      amount: formattedAmount,
      currency: 'ZAR',
      paymentType: 'DB',
      merchantTransactionId: bookingId,
      'customer.email': travellerEmail,
      descriptor: `Cubby Storage - ${hostName}`,
    });

    const peachRes = await fetch('https://eu-prod.oppwa.com/v1/checkouts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${peachToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const peachData = await peachRes.json();

    if (!peachRes.ok || !peachData.id) {
      console.error('Peach Payments error:', peachData);
      return new Response(
        JSON.stringify({ error: 'Failed to create payment session', details: peachData }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const checkoutId = peachData.id;
    const redirectUrl = `https://eu-prod.oppwa.com/v1/paymentWidgets.js?checkoutId=${checkoutId}`;

    // Save checkout ID to Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { error: dbError } = await supabase
      .from('bookings')
      .update({ checkout_id: checkoutId })
      .eq('id', bookingId);

    if (dbError) {
      console.error('Supabase update error:', dbError);
      // Non-fatal — still return the checkout ID
    }

    return new Response(
      JSON.stringify({ checkoutId, redirectUrl }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
