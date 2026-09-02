// ─── admin-mark-payout-paid Edge Function ──────────────────────────────────
//
// Admin records that a host's weekly manual EFT has actually been made.
// This is the ONLY write in the Host Payouts feature that touches
// payout_status/host_paid_at — PR #1 (the weekly earnings view) was purely
// read-only.
//
// Deliberately thin: this function does no financial logic itself. It only
// checks the admin session, then calls mark_host_payout_paid() (schema.sql)
// with the host id and which Friday-starting Cape Town payout week the
// admin selected — never a booking list or an amount. The RPC alone
// decides which bookings are eligible (completed, still pending_manual,
// the right host, the right Africa/Johannesburg week) and what they sum
// to; this function just relays that back verbatim. See mark_host_payout_paid's
// own comment in schema.sql for the full guarded-UPDATE/idempotency
// reasoning — same pattern as mark_refunded, used by this same admin panel
// for refunds.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireAdminSession } from '../_shared/admin-session.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const unauthorized = () => json({ error: 'Unauthorized' }, 401);
const badRequest = (msg: string) => json({ error: msg }, 400);

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: cors });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const session = await requireAdminSession(req, supabase);
  if (!session.ok) return unauthorized();

  try {
    // periodStartDate is a plain 'YYYY-MM-DD' calendar date (the Friday
    // that starts the period) -- NOT a client-computed timestamp. The RPC
    // is what decides the actual UTC boundaries, interpreting this date in
    // Africa/Johannesburg -- a browser's local timezone is never trusted
    // for the financial cutoff.
    const { hostId, periodStartDate } = await req.json();
    if (!hostId) return badRequest('Missing hostId');
    if (!periodStartDate || !/^\d{4}-\d{2}-\d{2}$/.test(periodStartDate)) {
      return badRequest('Missing or invalid periodStartDate (expected YYYY-MM-DD)');
    }

    const { data, error } = await supabase.rpc('mark_host_payout_paid', {
      p_host_id: hostId,
      p_period_start_date: periodStartDate,
    });
    if (error) throw error;

    if (!data?.ok) {
      return json({ error: data?.reason ?? 'Could not mark payout paid' }, 409);
    }
    // bookings/total/count here are exactly what the RPC's guarded UPDATE
    // actually touched -- the dashboard should treat this response, not
    // its own pre-click total, as the record of what was just marked paid.
    return json({ data });
  } catch (err) {
    console.error('admin-mark-payout-paid error:', err);
    return json({ error: String(err) }, 500);
  }
});
