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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const session = await requireAdminSession(req, supabase);
  if (!session.ok) return unauthorized();

  if (req.method === 'POST') {
    try {
      const { bookingId, refundReference } = await req.json();
      if (!bookingId) return json({ error: 'Missing bookingId' }, 400);

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

  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405, headers: cors });
  }

  try {
    // Bookings + host display name, used by both the All Bookings list and
    // the Revenue screen (which filters to status=completed client-side).
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id, status, total_price, bag_count, drop_off_date, created_at, host_id, traveller_id, refund_status, refund_requested_at, refunded_at, refund_reference, hosts(display_name)')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const data = (bookings ?? []).map((b: any) => ({
      id: b.id,
      status: b.status,
      total_price: b.total_price,
      bag_count: b.bag_count,
      drop_off_date: b.drop_off_date,
      created_at: b.created_at,
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
