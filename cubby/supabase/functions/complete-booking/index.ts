// ─── complete-booking Edge Function ───────────────────────────────────────────
//
// Called by the host when traveller picks up their bags.
// Marks the booking as completed, records the revenue split, and sends
// review prompts to both parties.
//
// Host payout: PayFast settles to Cubby's merchant bank account on a rolling
// schedule. Cubby then manually pays the host's 70% share. The split is
// recorded here for the admin payout dashboard.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ADMIN_SECRET = Deno.env.get('ADMIN_SECRET') ?? '';

async function sendReviewPrompts(supabase: any, bookingId: string, booking: any): Promise<void> {
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

  const emailBase = `${SUPABASE_URL}/functions/v1/send-email`;
  const emailHeaders = { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET };
  const emails = [];
  if (traveller?.email) {
    emails.push(fetch(emailBase, {
      method: 'POST', headers: emailHeaders,
      body: JSON.stringify({ emailType: 'review_prompt', data: { recipientEmail: traveller.email, recipientName: travellerName, otherPartyName: hostName, role: 'traveller' } }),
    }).catch(() => {}));
  }
  if (hostProfile?.email) {
    emails.push(fetch(emailBase, {
      method: 'POST', headers: emailHeaders,
      body: JSON.stringify({ emailType: 'review_prompt', data: { recipientEmail: hostProfile.email, recipientName: hostProfile.full_name ?? hostName, otherPartyName: travellerName, role: 'host' } }),
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

    const supabase = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, total_price, host_id, traveller_id, status, payment_provider')
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

    // Calculate 70/30 split
    const totalPrice = Number(booking.total_price);
    const hostAmount = Math.round(totalPrice * 0.70 * 100) / 100;
    const cubbyAmount = Math.round(totalPrice * 0.30 * 100) / 100;

    // Mark booking completed. Payout to host is handled manually from Cubby's
    // PayFast merchant account. payout_status = 'pending_manual' signals the
    // admin dashboard that this booking needs a manual EFT to the host.
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        host_payout_amount: hostAmount,
        cubby_amount: cubbyAmount,
        payout_status: 'pending_manual',
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('[complete-booking] Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update booking', details: updateError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Send review prompts (fire-and-forget)
    sendReviewPrompts(supabase, bookingId, booking).catch(e =>
      console.error('[complete-booking] review prompt error:', e)
    );

    return new Response(
      JSON.stringify({ success: true, hostAmount, cubbyAmount }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[complete-booking] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
