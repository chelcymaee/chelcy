import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireAdminSession } from '../_shared/admin-session.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const unauthorized = () => json({ error: 'Unauthorized' }, 401);
const badRequest = (msg: string) => json({ error: msg }, 400);

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: cors });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // Gates both GET and POST below — same requireAdminSession() check every
  // other admin-* Edge Function uses, no new admin-auth pattern introduced
  // for this action.
  const session = await requireAdminSession(req, supabase);
  if (!session.ok) return unauthorized();

  // Admin closes out a queued manual refund (refund_status =
  // 'pending_manual' → 'refunded'). This only records that a refund
  // already decided elsewhere was actually paid — it never decides who
  // gets refunded and never calls PayFast/PayGate or moves any money
  // itself. mark_refunded() (schema.sql) enforces the pending_manual gate
  // and the can't-happen-twice guarantee at the database level, not just
  // here.
  if (req.method === 'POST') {
    try {
      const { bookingId, refundReference } = await req.json();
      if (!bookingId) return badRequest('Missing bookingId');

      const { data, error } = await supabase.rpc('mark_refunded', {
        p_booking_id: bookingId,
        p_refund_reference: refundReference ?? null,
      });
      if (error) throw error;

      if (!data?.ok) {
        return json({ error: data?.reason ?? 'Could not mark refunded' }, 409);
      }
      return json({ data: data.booking });
    } catch (err) {
      console.error('admin-bookings POST error:', err);
      return json({ error: String(err) }, 500);
    }
  }

  try {
    // Bookings + host display name, used by both the All Bookings list and
    // the Revenue screen (which filters to status=completed client-side).
    // base_storage_amount/host_payout_amount added so Revenue can compute
    // the real host/Cubby split (see revenue.tsx) instead of a flat 70/30
    // of total_price. refund_status/refund_requested_at/refunded_at/
    // refund_reference added so All Bookings can surface bookings still
    // owed a manual refund (see the Refunds tab). completed_at/payout_status
    // added so Host Payouts can group each host's completed bookings into
    // weekly payout periods and show each booking's payout state — both
    // read-only, neither written by this function. Every addition here is
    // purely additive, each screen ignores whichever fields it doesn't use.
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id, status, total_price, base_storage_amount, host_payout_amount, bag_count, drop_off_date, created_at, completed_at, payout_status, host_id, traveller_id, refund_status, refund_requested_at, refunded_at, refund_reference, hosts(display_name)')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const data = (bookings ?? []).map((b: any) => ({
      id: b.id,
      status: b.status,
      total_price: b.total_price,
      base_storage_amount: b.base_storage_amount,
      host_payout_amount: b.host_payout_amount,
      bag_count: b.bag_count,
      drop_off_date: b.drop_off_date,
      created_at: b.created_at,
      completed_at: b.completed_at,
      payout_status: b.payout_status,
      host_id: b.host_id,
      host_display_name: b.hosts?.display_name ?? null,
      refund_status: b.refund_status,
      refund_requested_at: b.refund_requested_at,
      refunded_at: b.refunded_at,
      refund_reference: b.refund_reference,
    }));

    return json({ data });
  } catch (err) {
    console.error('admin-bookings error:', err);
    return json({ error: String(err) }, 500);
  }
});
