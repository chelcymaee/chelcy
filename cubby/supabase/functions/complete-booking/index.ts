import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ADMIN_SECRET = Deno.env.get('ADMIN_SECRET') ?? 'cubby-admin-secret-2025';

async function sendReviewPrompts(supabase: any, bookingId: string, booking: any): Promise<void> {
  // Fetch host + traveller details
  const [{ data: host }, { data: traveller }] = await Promise.all([
    supabase.from('hosts').select('display_name, assigned_user_id').eq('id', booking.host_id).single(),
    supabase.from('profiles').select('full_name, email').eq('id', booking.traveller_id).single(),
  ]);

  const hostUserId = host?.assigned_user_id;
  const hostProfile = hostUserId
    ? (await supabase.from('profiles').select('full_name, email').eq('id', hostUserId).single()).data
    : null;

  const hostName = host?.display_name ?? 'your host';
  const travellerName = traveller?.full_name ?? 'your traveller';

  // In-app notifications
  const notifications = [];
  if (booking.traveller_id) {
    notifications.push(
      supabase.from('notifications').insert({
        user_id: booking.traveller_id,
        type: 'review_request',
        title: `How was ${hostName}?`,
        body: 'Take 30 seconds to rate your storage experience.',
        data: { bookingId, hostId: booking.host_id, hostName },
        related_booking_id: bookingId,
      })
    );
  }
  if (hostUserId) {
    notifications.push(
      supabase.from('notifications').insert({
        user_id: hostUserId,
        type: 'review_request',
        title: `How was ${travellerName}?`,
        body: 'Let other hosts know about this traveller.',
        data: { bookingId, travellerId: booking.traveller_id, travellerName },
        related_booking_id: bookingId,
      })
    );
  }
  await Promise.all(notifications);

  // Emails (fire-and-forget, never throws)
  const emailBase = `${SUPABASE_URL}/functions/v1/send-email`;
  const emailHeaders = { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET };

  const emails = [];
  if (traveller?.email) {
    emails.push(fetch(emailBase, {
      method: 'POST',
      headers: emailHeaders,
      body: JSON.stringify({
        emailType: 'review_prompt',
        data: {
          recipientEmail: traveller.email,
          recipientName: travellerName,
          otherPartyName: hostName,
          role: 'traveller',
        },
      }),
    }).catch(() => {}));
  }
  if (hostProfile?.email) {
    emails.push(fetch(emailBase, {
      method: 'POST',
      headers: emailHeaders,
      body: JSON.stringify({
        emailType: 'review_prompt',
        data: {
          recipientEmail: hostProfile.email,
          recipientName: hostProfile.full_name ?? hostName,
          otherPartyName: travellerName,
          role: 'host',
        },
      }),
    }).catch(() => {}));
  }
  await Promise.all(emails);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { bookingId } = await req.json();

    if (!bookingId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: bookingId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Look up booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, total_price, host_id, traveller_id, status')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: 'Booking not found', details: bookingError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (booking.status === 'completed') {
      return new Response(
        JSON.stringify({ error: 'Booking is already completed' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Look up host bank details
    const { data: bankDetails, error: bankError } = await supabase
      .from('bank_details')
      .select('*')
      .eq('user_id', booking.host_id)
      .single();

    if (bankError || !bankDetails) {
      return new Response(
        JSON.stringify({ error: 'Host bank details not found', details: bankError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Calculate split — 70% host, 30% Cubby
    const totalPrice = Number(booking.total_price);
    const hostAmount = Math.round(totalPrice * 0.70 * 100) / 100;
    const cubbyAmount = Math.round(totalPrice * 0.30 * 100) / 100;

    const peachToken = Deno.env.get('PEACH_PAYMENTS_TOKEN');
    const entityId = Deno.env.get('PEACH_PAYMENTS_ENTITY_ID');

    if (!peachToken || !entityId) {
      return new Response(
        JSON.stringify({ error: 'Peach Payments credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const formattedAmount = hostAmount.toFixed(2);

    const body = new URLSearchParams({
      entityId,
      amount: formattedAmount,
      currency: 'ZAR',
      paymentType: 'CT',
      'bankAccount.holder': bankDetails.account_holder,
      'bankAccount.number': bankDetails.account_number,
      'bankAccount.bankCode': bankDetails.branch_code,
      'bankAccount.country': 'ZA',
      'bankAccount.type': bankDetails.account_type ?? 'CHECKING',
      merchantTransactionId: `payout-${bookingId}`,
    });

    const peachRes = await fetch('https://eu-prod.oppwa.com/v1/payouts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${peachToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const peachData = await peachRes.json();

    if (!peachRes.ok) {
      console.error('Peach payout error:', peachData);
      return new Response(
        JSON.stringify({ error: 'Payout request failed', details: peachData }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const payoutId = peachData.id ?? null;

    // Update booking in Supabase
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        host_payout_amount: hostAmount,
        cubby_amount: cubbyAmount,
        payout_status: 'processing',
        payout_id: payoutId,
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('Supabase update error:', updateError);
      // Non-fatal — payout was initiated, log and continue
    }

    // Send review prompt notifications to both parties (fire-and-forget)
    sendReviewPrompts(supabase, bookingId, booking).catch(e =>
      console.error('[complete-booking] review prompt error:', e)
    );

    return new Response(
      JSON.stringify({
        success: true,
        payoutId,
        hostAmount,
        cubbyAmount,
        bankName: bankDetails.bank,
      }),
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
