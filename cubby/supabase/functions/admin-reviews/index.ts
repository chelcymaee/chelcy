import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-secret',
  'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const unauthorized = () => json({ error: 'Unauthorized' }, 401);
const badRequest = (msg: string) => json({ error: msg }, 400);

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const expectedSecret = Deno.env.get('ADMIN_SECRET');
  const providedSecret = req.headers.get('x-admin-secret');
  if (!expectedSecret || providedSecret !== expectedSecret) return unauthorized();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const url = new URL(req.url);

  try {
    // ── GET — list reviews, optionally filtered to reported only ─────────────
    if (req.method === 'GET') {
      const reportedOnly = url.searchParams.get('reported') === 'true';
      let q = supabase
        .from('reviews')
        .select('id, reviewer_name, host_id, rating, comment, tags, reported, created_at, hosts(display_name)')
        .order('created_at', { ascending: false });
      if (reportedOnly) q = q.eq('reported', true);
      const { data, error } = await q;
      if (error) throw error;
      return json({ data });
    }

    // ── DELETE — permanently remove a review ──────────────────────────────────
    if (req.method === 'DELETE') {
      const id = url.searchParams.get('id');
      if (!id) return badRequest('id required');
      const { error } = await supabase.from('reviews').delete().eq('id', id);
      if (error) throw error;
      return json({ success: true });
    }

    // ── PATCH — clear a review's reported flag ────────────────────────────────
    if (req.method === 'PATCH') {
      const body = await req.json();
      const { id } = body as { id: string };
      if (!id) return badRequest('id required');
      const { error } = await supabase.from('reviews').update({ reported: false }).eq('id', id);
      if (error) throw error;
      return json({ success: true });
    }

    return new Response('Method not allowed', { status: 405, headers: cors });
  } catch (err) {
    console.error('admin-reviews error:', err);
    return json({ error: String(err) }, 500);
  }
});
