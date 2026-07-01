import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from 'https://deno.land/std@0.168.0/node/crypto.ts';

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
      // Payment succeeded — confirm booking. pin_code was set at booking creation and is NOT
      // changed here; the traveller already has the correct PIN from booking-confirmation.
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          checkout_id: checkoutId || undefined,
        })
        .eq('id', bookingId)
        .eq('status', 'pending'); // idempotent: skip if already confirmed

      if (error) {
        console.error('Failed to confirm booking:', error);
        return new Response(
          JSON.stringify({ error: 'Database update failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      console.log(`Booking ${bookingId} confirmed`);

      // Insert in-app notification for the traveller (fire-and-forget)
      supabase.from('bookings')
        .select('traveller_id')
        .eq('id', bookingId)
        .single()
        .then(({ data: bk }) => {
          if (bk?.traveller_id) {
            supabase.from('notifications').insert({
              user_id: bk.traveller_id,
              type: 'booking_confirmed',
              title: 'Payment confirmed ✅',
              body: 'Your payment was successful. Check your bookings for the PIN.',
              related_booking_id: bookingId,
              read_at: null,
            }).catch(() => {});

            // Push notification
            const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
            const adminSecret = Deno.env.get('ADMIN_SECRET') ?? 'cubby-admin-secret-2025';
            fetch(`${supabaseUrl}/functions/v1/send-push`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-admin-secret': adminSecret },
              body: JSON.stringify({
                user_id: bk.traveller_id,
                title: 'Payment confirmed ✅',
                body: 'Your payment was successful. Check your bookings for the PIN.',
                data: { type: 'booking_confirmed', booking_id: bookingId },
              }),
            }).catch(() => {});
          }
        }).catch(() => {});

      // Send booking confirmation + new booking emails (fire-and-forget — never block)
      try {
        const { data: booking } = await supabase
          .from('bookings')
          .select('traveller_id, host_id, drop_off_date, drop_off_time, pick_up_date, pick_up_time, bag_count, total_price, pin_code')
          .eq('id', bookingId)
          .single();

        if (booking) {
          const [{ data: traveller }, { data: host }] = await Promise.all([
            supabase.from('profiles').select('full_name, email').eq('id', booking.traveller_id).single(),
            supabase.from('hosts').select('display_name, location_name, user_id, assigned_user_id').eq('id', booking.host_id).single(),
          ]);

          const hostOwnerId = host?.assigned_user_id ?? host?.user_id;
          const { data: hostOwner } = hostOwnerId
            ? await supabase.from('profiles').select('full_name, email').eq('id', hostOwnerId).single()
            : { data: null };

          const SUPABASE_URL_LOCAL = Deno.env.get('SUPABASE_URL') ?? '';
          const ADMIN_SECRET_LOCAL = Deno.env.get('ADMIN_SECRET') ?? 'cubby-admin-secret-2025';
          const emailBase = `${SUPABASE_URL_LOCAL}/functions/v1/send-email`;

          if (traveller?.email) {
            fetch(emailBase, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET_LOCAL },
              body: JSON.stringify({
                emailType: 'booking_confirmed',
                data: {
                  travellerEmail: traveller.email,
                  travellerName: traveller.full_name ?? 'Traveller',
                  hostName: host?.display_name ?? 'your host',
                  location: host?.location_name ?? '',
                  dropOffDate: booking.drop_off_date,
                  dropOffTime: booking.drop_off_time,
                  pickUpDate: booking.pick_up_date,
                  pickUpTime: booking.pick_up_time,
                  bagCount: booking.bag_count,
                  totalPrice: booking.total_price,
                  pinCode: booking.pin_code,
                },
              }),
            }).catch(e => console.error('Email (booking_confirmed) failed:', e));
          }

          if (hostOwner?.email) {
            fetch(emailBase, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET_LOCAL },
              body: JSON.stringify({
                emailType: 'new_booking_request',
                data: {
                  hostEmail: hostOwner.email,
                  hostName: host?.display_name ?? 'Host',
                  travellerName: traveller?.full_name ?? 'A traveller',
                  dropOffDate: booking.drop_off_date,
                  dropOffTime: booking.drop_off_time,
                  pickUpDate: booking.pick_up_date,
                  pickUpTime: booking.pick_up_time,
                  bagCount: booking.bag_count,
                  totalPrice: booking.total_price,
                },
              }),
            }).catch(e => console.error('Email (new_booking_request) failed:', e));
          }
        }
      } catch (emailErr) {
        console.error('Email dispatch error (non-fatal):', emailErr);
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
