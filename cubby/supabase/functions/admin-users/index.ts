import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireAdminSession } from '../_shared/admin-session.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
};

function unauthorized() {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function badRequest(msg: string) {
  return new Response(JSON.stringify({ error: msg }), {
    status: 400,
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

  const session = await requireAdminSession(req, supabase);
  if (!session.ok) {
    return unauthorized();
  }

  const url = new URL(req.url);

  try {
    // ── GET /admin-users — list all users with enrichment ──────────────────────
    if (req.method === 'GET') {
      const search = url.searchParams.get('search') ?? '';
      const roleFilter = url.searchParams.get('role') ?? '';
      const verifiedFilter = url.searchParams.get('verified') ?? '';
      const hostApprovedFilter = url.searchParams.get('host_approved') ?? '';

      // 1. Load profiles
      let query = supabase
        .from('profiles')
        .select('id, email, full_name, phone, role, is_verified, is_host_approved, created_at')
        .order('created_at', { ascending: false });

      if (roleFilter) query = query.eq('role', roleFilter);
      if (verifiedFilter !== '') query = query.eq('is_verified', verifiedFilter === 'true');
      if (hostApprovedFilter !== '') query = query.eq('is_host_approved', hostApprovedFilter === 'true');

      const { data: profiles, error: profilesError } = await query;
      if (profilesError) throw profilesError;
      if (!profiles || profiles.length === 0) {
        return new Response(JSON.stringify({ data: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 2. Apply search filter (client-side after fetch to support name+email)
      const filtered = search
        ? profiles.filter((p: any) =>
            (p.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
            (p.email ?? '').toLowerCase().includes(search.toLowerCase()),
          )
        : profiles;

      const userIds = filtered.map((p: any) => p.id);

      // 3. Booking counts per user
      const { data: bookingRows } = await supabase
        .from('bookings')
        .select('traveller_id')
        .in('traveller_id', userIds);

      const bookingCount: Record<string, number> = {};
      for (const b of bookingRows ?? []) {
        bookingCount[b.traveller_id] = (bookingCount[b.traveller_id] ?? 0) + 1;
      }

      // 4. Review counts per user
      const { data: reviewRows } = await supabase
        .from('reviews')
        .select('reviewer_id')
        .in('reviewer_id', userIds);

      const reviewCount: Record<string, number> = {};
      for (const r of reviewRows ?? []) {
        reviewCount[r.reviewer_id] = (reviewCount[r.reviewer_id] ?? 0) + 1;
      }

      // 5. Assigned host per user
      const { data: hostRows } = await supabase
        .from('hosts')
        .select('id, display_name, assigned_user_id')
        .in('assigned_user_id', userIds);

      const assignedHost: Record<string, { id: string; display_name: string }> = {};
      for (const h of hostRows ?? []) {
        if (h.assigned_user_id) assignedHost[h.assigned_user_id] = { id: h.id, display_name: h.display_name };
      }

      // 6. Verification status per user
      const { data: verifRows } = await supabase
        .from('verifications')
        .select('user_id, status, submitted_at')
        .in('user_id', userIds);

      const verifStatus: Record<string, { status: string; submitted_at: string }> = {};
      for (const v of verifRows ?? []) {
        verifStatus[v.user_id] = { status: v.status, submitted_at: v.submitted_at };
      }

      const data = filtered.map((p: any) => ({
        id: p.id,
        email: p.email,
        fullName: p.full_name,
        phone: p.phone,
        role: p.role,
        isVerified: p.is_verified ?? false,
        isHostApproved: p.is_host_approved ?? false,
        createdAt: p.created_at,
        bookingCount: bookingCount[p.id] ?? 0,
        reviewCount: reviewCount[p.id] ?? 0,
        assignedHost: assignedHost[p.id] ?? null,
        verification: verifStatus[p.id] ?? null,
      }));

      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── PATCH /admin-users — update a user's profile flags ────────────────────
    if (req.method === 'PATCH') {
      const body = await req.json();
      const { userId, updates } = body as { userId: string; updates: Record<string, unknown> };

      if (!userId) return badRequest('userId required');

      // Allowed fields only — never let arbitrary columns be patched
      const allowed: Record<string, boolean> = { is_verified: true, is_host_approved: true, role: true };
      const safe: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(updates ?? {})) {
        if (allowed[k]) safe[k] = v;
      }
      if (Object.keys(safe).length === 0) return badRequest('No valid fields to update');

      const { error } = await supabase.from('profiles').update(safe).eq('id', userId);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  } catch (err) {
    console.error('admin-users error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
