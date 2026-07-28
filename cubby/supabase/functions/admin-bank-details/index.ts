import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireAdminSession } from '../_shared/admin-session.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
};

function unauthorized() {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // Session check — see supabase/functions/_shared/admin-session.ts. This
  // function is the highest-stakes of the seven (real bank account
  // details), so it gets the same session requirement as every other
  // admin-* function, not a stronger or weaker one — the token itself is
  // the security boundary, not which endpoint is being called.
  const session = await requireAdminSession(req, supabase);
  if (!session.ok) return unauthorized();

  const url = new URL(req.url);

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('host_bank_details')
        .select('*, hosts(display_name, location_name)');
      if (error) throw error;
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const { error } = await supabase
        .from('host_bank_details')
        .upsert(body, { onConflict: 'host_id' });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'DELETE') {
      const hostId = url.searchParams.get('hostId');
      if (!hostId) {
        return new Response(JSON.stringify({ error: 'Missing hostId' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { error } = await supabase.from('host_bank_details').delete().eq('host_id', hostId);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  } catch (err) {
    console.error('admin-bank-details error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
