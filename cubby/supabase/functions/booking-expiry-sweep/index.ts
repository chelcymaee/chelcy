// ─── booking-expiry-sweep Edge Function ───────────────────────────────────────
//
// Scheduled orchestrator for expiring overdue awaiting_host_confirmation
// bookings. This function does NOT contain any transition logic itself —
// it calls the single shared expire_overdue_booking() Postgres function
// (see supabase/schema.sql, Phase 4 section) and, for whatever it returns,
// sends best-effort notifications. The guarded UPDATE, the deadline
// eligibility rule, and the idempotency all live in that one SQL function;
// this file only exists because the scheduled sweep has no end-user client
// present to fire a notification the way accept/decline/cancel/refund do.
//
// Auth: x-admin-secret header, server-to-server only (cron -> this
// function). Never embedded in the mobile client — distinct from the
// EXPO_PUBLIC_ADMIN_SECRET client-exposure issue flagged during Phase 1;
// this is the same pattern send-push already uses for scheduled/system
// callers.
//
// Deploy: npx supabase functions deploy booking-expiry-sweep
// Schedule: configure via Supabase Dashboard -> Database -> Cron Jobs to
// invoke this function every few minutes (see PR description for the
// exact steps — deliberately not hardcoded here since it depends on the
// project's cron/pg_net setup).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ADMIN_SECRET = Deno.env.get('ADMIN_SECRET') ?? '';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ExpiredBooking {
  id: string;
  traveller_id: string;
  host_id: string;
  drop_off_date: string;
  drop_off_time: string;
}

async function notifyOneExpiredBooking(supabase: any, booking: ExpiredBooking): Promise<void> {
  // Best-effort, isolated per booking — a failure here must never affect
  // any other row's notification or the transition that already committed.
  try {
    const { data: host } = await supabase
      .from('hosts')
      .select('user_id, assigned_user_id, display_name')
      .eq('id', booking.host_id)
      .single();

    const hostUserId = host?.assigned_user_id ?? host?.user_id ?? null;

    const inserts = [
      supabase.from('notifications').insert({
        user_id: booking.traveller_id,
        type: 'booking_declined',
        title: 'Response window ended',
        body: "Your host didn't respond in time, so this booking has expired. You'll be refunded — try another host nearby!",
        data: { bookingId: booking.id },
        related_booking_id: booking.id,
      }),
    ];

    if (hostUserId) {
      inserts.push(
        supabase.from('notifications').insert({
          user_id: hostUserId,
          type: 'booking_declined',
          title: 'Response window closed',
          body: 'A booking request expired because it was not accepted or declined in time.',
          data: { bookingId: booking.id },
          related_booking_id: booking.id,
        })
      );
    }

    await Promise.all(inserts);
  } catch (e) {
    console.error(`booking-expiry-sweep: notification failed for booking ${booking.id}:`, e);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const adminSecret = req.headers.get('x-admin-secret');
  if (!ADMIN_SECRET || adminSecret !== ADMIN_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // The one shared expiry implementation — see schema.sql. No id passed
    // means "sweep every eligible row", using the database's own now().
    const { data: expired, error } = await supabase.rpc('expire_overdue_booking');

    if (error) {
      console.error('booking-expiry-sweep: expire_overdue_booking RPC failed:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const rows: ExpiredBooking[] = expired ?? [];

    // Isolated per row so one bad notification can't block the rest.
    for (const booking of rows) {
      await notifyOneExpiredBooking(supabase, booking);
    }

    console.log(`booking-expiry-sweep: expired ${rows.length} booking(s)`);

    return new Response(JSON.stringify({ expired: rows.length, bookingIds: rows.map(r => r.id) }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('booking-expiry-sweep error:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
