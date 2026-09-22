// ─── pickup-reminder-sweep Edge Function ──────────────────────────────────────
//
// Scheduled orchestrator for the 30-minute-before-pickup traveller push
// reminder (PR #168). This function does NOT contain any eligibility or
// dedup logic itself — it calls the single shared claim_pickup_reminders()
// Postgres function (see supabase/schema.sql) and, for whatever it returns,
// sends best-effort notifications. The guarded UPDATE, the 30-minute
// window, and the once-only claim all live in that one SQL function; this
// file only exists because the scheduled sweep has no end-user client
// present to fire a notification the way an in-app action would. Same
// division of responsibility as booking-expiry-sweep/expire_overdue_booking.
//
// Auth: x-admin-secret header, server-to-server only (cron -> this
// function) — same pattern as booking-expiry-sweep and send-review-reminders.
//
// Preference handling: claim_pickup_reminders() claims a booking regardless
// of the traveller's notification_preferences — that's deliberate. The
// claim (pickup_reminder_sent_at) is what stops a booking being
// re-considered on every subsequent ~15-minute sweep; if claiming were
// conditional on the preference, a traveller with reminders turned off
// would have the same booking re-evaluated every single run for as long as
// it stays in the 30-minute window, for no benefit (it never got any less
// eligible). So every claimed row here is already permanently consumed by
// the time this function sees it — the preference check below only decides
// whether to actually insert a notification/send a push for it, exactly
// mirroring how notification-service.ts's sendNotification() and
// send-review-reminders check notification_preferences immediately before
// their own insert+push, never before the "is this still eligible" step.
//
// Never touches bookings.status — this feature only ever reads it (via the
// claim function's WHERE clause) and writes the one new dedicated column.
// A push failure (no token, Expo API error, timeout) can therefore never
// affect the booking/payment lifecycle, structurally, not just by
// convention.
//
// Deploy: npx supabase functions deploy pickup-reminder-sweep
// Schedule: configure via Supabase Dashboard -> Database -> Cron Jobs,
// every ~15 minutes, POSTing with the x-admin-secret header — same as
// booking-expiry-sweep's existing job.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ADMIN_SECRET = Deno.env.get('ADMIN_SECRET') ?? '';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Same idiom as _shared/awaiting-host-notifications.ts — bounds the
// worst-case latency a single slow send-push call could add to this sweep.
const INTERNAL_CALL_TIMEOUT_MS = 5_000;

const PICKUP_REMINDER_TITLE = 'Pickup reminder 🧳';
const PICKUP_REMINDER_BODY = 'Your bags are ready to be collected soon. Head back to your Cubby host for pickup.';

interface ClaimedBooking {
  id: string;
  traveller_id: string;
}

async function notifyOneTraveller(supabase: any, booking: ClaimedBooking): Promise<void> {
  // Best-effort, isolated per booking — a failure here must never affect
  // any other row's notification or the claim that already committed.
  try {
    // Existing 'booking_reminders' preference (already shipped, already
    // toggleable in app/(traveller)/notification-preferences.tsx) — a
    // missing row defaults to allowed, same convention as
    // notification-service.ts and send-review-reminders.
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('booking_reminders')
      .eq('user_id', booking.traveller_id)
      .single();
    const allowed = !prefs || prefs.booking_reminders !== false;
    if (!allowed) return;

    const { error: insertErr } = await supabase.from('notifications').insert({
      user_id: booking.traveller_id,
      type: 'pick_up_reminder',
      title: PICKUP_REMINDER_TITLE,
      body: PICKUP_REMINDER_BODY,
      data: { bookingId: booking.id },
      related_booking_id: booking.id,
    });
    if (insertErr) {
      console.error(`[pickup-reminder-sweep] notification insert failed for ${booking.id}:`, insertErr);
    }

    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
      body: JSON.stringify({
        user_id: booking.traveller_id,
        title: PICKUP_REMINDER_TITLE,
        body: PICKUP_REMINDER_BODY,
        data: { type: 'pick_up_reminder', booking_id: booking.id },
      }),
      signal: AbortSignal.timeout(INTERNAL_CALL_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`[pickup-reminder-sweep] push non-OK response for ${booking.id}:`, res.status);
    }
  } catch (e) {
    console.error(`[pickup-reminder-sweep] notify failed for booking ${booking.id}:`, e);
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

    // The one shared claim implementation — see schema.sql. Every returned
    // row is already permanently marked as reminded, regardless of what
    // happens below.
    const { data: claimed, error } = await supabase.rpc('claim_pickup_reminders');

    if (error) {
      console.error('[pickup-reminder-sweep] claim_pickup_reminders RPC failed:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const rows: ClaimedBooking[] = claimed ?? [];

    // Isolated per row so one bad notification can't block the rest.
    for (const booking of rows) {
      await notifyOneTraveller(supabase, booking);
    }

    console.log(`[pickup-reminder-sweep] claimed ${rows.length} booking(s)`);

    return new Response(JSON.stringify({ claimed: rows.length, bookingIds: rows.map(r => r.id) }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[pickup-reminder-sweep] error:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
