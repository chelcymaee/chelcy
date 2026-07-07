import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-secret',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const unauthorized = () => json({ error: 'Unauthorized' }, 401);

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const expectedSecret = Deno.env.get('ADMIN_SECRET');
  const providedSecret = req.headers.get('x-admin-secret');
  if (!expectedSecret || providedSecret !== expectedSecret) return unauthorized();

  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405, headers: cors });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  try {
    // Bookings + host display name, used by both the All Bookings list and
    // the Revenue screen (which filters to status=completed client-side).
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id, status, total_price, bag_count, drop_off_date, created_at, host_id, traveller_id, hosts(display_name)')
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
    }));

    return json({ data });
  } catch (err) {
    console.error('admin-bookings error:', err);
    return json({ error: String(err) }, 500);
  }
});
