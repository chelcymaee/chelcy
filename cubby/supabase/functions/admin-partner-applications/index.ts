import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireAdminSession } from '../_shared/admin-session.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

  // partner_applications only has a public INSERT policy — admin reads/updates
  // must go through this service-role function, gated by a valid admin session.
  const session = await requireAdminSession(req, supabase);
  if (!session.ok) {
    return unauthorized();
  }

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('partner_applications')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const { id, status } = body;
      if (!id || !status) {
        return new Response(JSON.stringify({ error: 'Missing id or status' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (status !== 'approved' && status !== 'rejected') {
        return new Response(JSON.stringify({ error: 'status must be "approved" or "rejected"' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // FAT-007/FAT-009: approving an account-linked application (user_id
      // set — see schema.sql) used to be a cosmetic status flip with no
      // effect on the applicant's account at all. Fetched before the
      // update so we know the PRIOR status (to make a repeat approval a
      // genuine no-op, not a second host-linking pass) and have the
      // application's own fields available to seed a draft hosts row.
      const { data: appRow, error: fetchErr } = await supabase
        .from('partner_applications')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (fetchErr) throw fetchErr;
      if (!appRow) {
        return new Response(JSON.stringify({ error: 'Application not found — nothing was changed.' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const alreadyApproved = appRow.status === 'approved';

      const { error: updateErr } = await supabase
        .from('partner_applications')
        .update({ status })
        .eq('id', id);
      if (updateErr) throw updateErr;

      // Rejections, an already-approved repeat click, and legacy anonymous
      // applications (no user_id — those still go through the existing
      // manual create-host.tsx flow, untouched by this) all stop here:
      // status label updated, no account-linking side effects.
      if (status !== 'approved' || alreadyApproved || !appRow.user_id) {
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const userId = appRow.user_id as string;

      // Link an existing hosts row rather than insert a second one — covers
      // both a genuine repeat approval and the case where an admin already
      // manually created this person's host row via create-host.tsx before
      // their application caught up.
      const { data: existingHost, error: hostLookupErr } = await supabase
        .from('hosts')
        .select('id')
        .or(`user_id.eq.${userId},assigned_user_id.eq.${userId}`)
        .maybeSingle();
      if (hostLookupErr) throw hostLookupErr;

      if (!existingHost) {
        const displayName = (appRow.business_name || appRow.name || 'Host').trim();
        const { error: hostInsertErr } = await supabase.from('hosts').insert({
          user_id: userId,
          assigned_user_id: userId,
          display_name: displayName,
          business_type: appRow.business_type || undefined,
          location_name: appRow.location || undefined,
          max_bags: appRow.storage_capacity || undefined,
          // Draft only — never bookable until the host finishes their
          // listing and flips this themselves via the existing "Accepting
          // bookings" toggle in (host)/host-profile.tsx. explore.tsx's
          // search is gated on exactly this column and nothing else
          // (no photos/completeness check), so leaving it to the hosts
          // table's own `is_active default true` would put an empty
          // listing straight into traveller search.
          is_active: false,
        });
        if (hostInsertErr) throw hostInsertErr;
      }

      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ is_host_approved: true })
        .eq('id', userId);
      if (profileErr) throw profileErr;

      // Best-effort, same pattern as admin-verifications — host access
      // itself (the writes above) is already durable by this point.
      const { error: notifErr } = await supabase.from('notifications').insert({
        user_id: userId,
        type: 'host_application_approved',
        title: "You're approved! 🏠",
        body: 'Your host application has been approved. Finish setting up your listing to start earning.',
        read_at: null,
      });
      if (notifErr) console.error('admin-partner-applications: notification insert failed (non-fatal):', notifErr);

      return new Response(JSON.stringify({ success: true, data: { id, userId, status, hostLinked: !!existingHost } }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  } catch (err) {
    console.error('admin-partner-applications error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
