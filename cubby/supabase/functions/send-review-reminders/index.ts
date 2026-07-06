// ─── send-review-reminders Edge Function ──────────────────────────────────────
//
// Sends 24h and 72h review reminder notifications to parties who haven't yet
// reviewed after a booking completes. The 7-day window is enforced here.
//
// Call via cron or manual HTTP POST with x-admin-secret.
// Idempotent — safe to call multiple times for the same booking.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL       = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ADMIN_SECRET       = Deno.env.get('ADMIN_SECRET');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-secret',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const secret = req.headers.get('x-admin-secret');
  if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const now = new Date();

    // Find bookings completed 23–25h ago (24h reminder window) or 71–73h ago (72h reminder)
    const window24hStart = new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString();
    const window24hEnd   = new Date(now.getTime() - 23 * 60 * 60 * 1000).toISOString();
    const window72hStart = new Date(now.getTime() - 73 * 60 * 60 * 1000).toISOString();
    const window72hEnd   = new Date(now.getTime() - 71 * 60 * 60 * 1000).toISOString();
    const cutoff7d       = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Get completed bookings in either reminder window (still within 7-day window)
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, host_id, traveller_id, completed_at')
      .eq('status', 'completed')
      .gte('completed_at', cutoff7d)
      .or(`completed_at.gte.${window24hStart},completed_at.gte.${window72hStart}`)
      .not('completed_at', 'is', null);

    if (!bookings?.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), { status: 200, headers: corsHeaders });
    }

    let sent = 0;

    for (const booking of bookings) {
      const completedAt = new Date(booking.completed_at);
      const hoursAgo = (now.getTime() - completedAt.getTime()) / (60 * 60 * 1000);

      const is24h = hoursAgo >= 23 && hoursAgo <= 25;
      const is72h = hoursAgo >= 71 && hoursAgo <= 73;
      if (!is24h && !is72h) continue;

      const reminderLabel = is24h ? '24h' : '72h';

      // Check if traveller has reviewed
      const [{ data: travReview }, { data: hostReview }] = await Promise.all([
        supabase.from('reviews').select('id').eq('booking_id', booking.id).maybeSingle(),
        supabase.from('traveller_reviews').select('id').eq('booking_id', booking.id).maybeSingle(),
      ]);

      // Get host assigned_user_id
      const { data: host } = await supabase
        .from('hosts').select('display_name, assigned_user_id').eq('id', booking.host_id).single();
      const { data: traveller } = await supabase
        .from('profiles').select('full_name').eq('id', booking.traveller_id).single();

      const hostName = host?.display_name ?? 'your host';
      const travellerName = traveller?.full_name ?? 'your traveller';

      // Notify traveller if they haven't reviewed yet
      if (!travReview && booking.traveller_id) {
        const prefKey = 'review_reminders';
        const { data: prefs } = await supabase
          .from('notification_preferences')
          .select(prefKey)
          .eq('user_id', booking.traveller_id)
          .single();
        const allowed = !prefs || (prefs as any)[prefKey] !== false;

        if (allowed) {
          await supabase.from('notifications').insert({
            user_id: booking.traveller_id,
            type: 'review_reminder',
            title: `Reminder: Review ${hostName}`,
            body: is72h
              ? 'Only a few days left to share your experience.'
              : 'How was your storage experience yesterday?',
            data: { bookingId: booking.id, hostId: booking.host_id, hostName, reminder: reminderLabel },
            related_booking_id: booking.id,
          });
          sent++;
        }
      }

      // Notify host if they haven't reviewed traveller yet
      if (!hostReview && host?.assigned_user_id) {
        const hostUserId = host.assigned_user_id;
        const prefKey = 'review_reminders';
        const { data: prefs } = await supabase
          .from('notification_preferences')
          .select(prefKey)
          .eq('user_id', hostUserId)
          .single();
        const allowed = !prefs || (prefs as any)[prefKey] !== false;

        if (allowed) {
          await supabase.from('notifications').insert({
            user_id: hostUserId,
            type: 'review_reminder',
            title: `Reminder: Review ${travellerName}`,
            body: is72h
              ? 'Last chance to review this traveller before the window closes.'
              : 'How was your traveller?',
            data: { bookingId: booking.id, travellerId: booking.traveller_id, travellerName, reminder: reminderLabel },
            related_booking_id: booking.id,
          });
          sent++;
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, sent }), { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error('[send-review-reminders] Error:', err);
    return new Response(JSON.stringify({ ok: true, warning: String(err) }), { status: 200, headers: corsHeaders });
  }
});
