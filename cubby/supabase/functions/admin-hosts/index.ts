import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireAdminSession } from '../_shared/admin-session.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const unauthorized = () => json({ error: 'Unauthorized' }, 401);
const badRequest = (msg: string) => json({ error: msg }, 400);

const ALLOWED_HOST_FIELDS: Record<string, true> = {
  display_name: true, bio: true, location_name: true, business_type: true,
  price_per_bag_per_day: true, max_bags: true, available_from: true,
  available_until: true, available_days: true, is_active: true,
  owner_is_verified: true,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const session = await requireAdminSession(req, supabase);
  if (!session.ok) return unauthorized();

  const url = new URL(req.url);
  const hostId = url.searchParams.get('id');

  try {
    // ── GET — list all hosts OR single host detail ────────────────────────────
    if (req.method === 'GET') {
      if (hostId) {
        // Single host with full detail, bookings, and stats
        const [
          { data: host, error: hostErr },
          { data: bookings },
          { data: assignedProfile },
        ] = await Promise.all([
          supabase.from('hosts').select('*').eq('id', hostId).single(),
          supabase.from('bookings')
            .select('id, status, total_price, base_storage_amount, host_payout_amount, bag_count, drop_off_date, pick_up_date, created_at, traveller_id')
            .eq('host_id', hostId)
            .order('created_at', { ascending: false }),
          supabase.from('hosts').select('assigned_user_id').eq('id', hostId).single(),
        ]);

        if (hostErr) throw hostErr;

        // Fetch assigned user profile
        let ownerProfile = null;
        if (host.assigned_user_id || host.user_id) {
          const ownerId = host.assigned_user_id || host.user_id;
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, email, full_name, phone')
            .eq('id', ownerId)
            .single();
          ownerProfile = profile;
        }

        // Compute stats
        const allBookings = bookings ?? [];
        const completed = allBookings.filter((b: any) => b.status === 'completed');
        const cancelled = allBookings.filter((b: any) => b.status === 'cancelled');
        const active = allBookings.filter((b: any) => ['confirmed', 'active'].includes(b.status));
        const upcoming = allBookings.filter((b: any) => b.status === 'pending');

        // Host/Cubby split source of truth (matches hostShare() in
        // app/(host)/dashboard.tsx, established by the PR #101 financial
        // integrity fix): host = 70% of base storage price only, never the
        // traveller service fee — Cubby keeps 30% of base + 100% of the fee.
        // Prefer the locked `host_payout_amount` snapshot taken at booking
        // completion; fall back to computing 70% of `base_storage_amount`
        // for completed bookings that predate the snapshot column. Only for
        // genuinely old/legacy rows missing *both* of those do we fall back
        // to 70% of `total_price` — that fallback is financially wrong (it
        // includes the traveller fee in the split) and should never be hit
        // for any booking created after the PR #101 fix shipped.
        const totalRevenue = completed.reduce((s: number, b: any) => s + (b.total_price ?? 0), 0);
        const hostEarnings = completed.reduce((s: number, b: any) => {
          if (b.host_payout_amount != null) return s + Number(b.host_payout_amount);
          // Integer-multiply-then-divide, same convention as
          // complete-booking's cents-based rounding — `x * 0.70` alone
          // hits JS float imprecision (165 * 0.70 === 115.49999999999999),
          // which can round a legacy fallback estimate down by R1.
          if (b.base_storage_amount != null) return s + Math.round(Number(b.base_storage_amount) * 70) / 100;
          return s + Math.round(Number(b.total_price ?? 0) * 70) / 100;
        }, 0);
        const cubbyEarnings = totalRevenue - hostEarnings;

        return json({
          data: {
            host,
            ownerProfile,
            bookings: allBookings.slice(0, 20),
            stats: {
              total: allBookings.length,
              completed: completed.length,
              cancelled: cancelled.length,
              active: active.length,
              upcoming: upcoming.length,
              totalRevenue,
              hostEarnings,
              cubbyEarnings,
              avgRating: host.rating ?? 0,
              reviewCount: host.review_count ?? 0,
              responseRate: host.response_rate ?? null,
              avgResponseTimeMinutes: host.avg_response_time_minutes ?? null,
              totalRequests: host.total_requests ?? 0,
              respondedRequests: host.responded_requests ?? 0,
              missedRequests: Math.max(0, (host.total_requests ?? 0) - (host.responded_requests ?? 0)),
              pendingRequests: allBookings.filter((b: any) => b.status === 'pending').length,
            },
          },
        });
      }

      // List all hosts
      const { data: hosts, error: hostsErr } = await supabase
        .from('hosts')
        .select('id, display_name, location_name, business_type, price_per_bag_per_day, max_bags, is_active, assigned_user_id, user_id, rating, review_count, created_at')
        .order('created_at', { ascending: false });

      if (hostsErr) throw hostsErr;

      // Fetch owner emails
      const ownerIds = [...new Set((hosts ?? []).map((h: any) => h.assigned_user_id || h.user_id).filter(Boolean))];
      const emailMap: Record<string, string> = {};
      if (ownerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', ownerIds);
        for (const p of profiles ?? []) emailMap[p.id] = p.email;
      }

      // Booking counts per host
      const { data: bookingCounts } = await supabase
        .from('bookings')
        .select('host_id, status');
      const countMap: Record<string, number> = {};
      for (const b of bookingCounts ?? []) {
        countMap[b.host_id] = (countMap[b.host_id] ?? 0) + 1;
      }

      return json({
        data: (hosts ?? []).map((h: any) => ({
          ...h,
          ownerEmail: emailMap[h.assigned_user_id || h.user_id] ?? null,
          bookingCount: countMap[h.id] ?? 0,
        })),
      });
    }

    // ── PATCH — update host fields ────────────────────────────────────────────
    if (req.method === 'PATCH') {
      const body = await req.json();
      const { hostId: id, updates } = body as { hostId: string; updates: Record<string, unknown> };
      if (!id) return badRequest('hostId required');

      const safe: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(updates ?? {})) {
        if (ALLOWED_HOST_FIELDS[k]) safe[k] = v;
      }
      if (Object.keys(safe).length === 0) return badRequest('No valid fields');

      const { error } = await supabase.from('hosts').update(safe).eq('id', id);
      if (error) throw error;
      return json({ success: true });
    }

    // ── POST — actions (create, assign, remove_user, delete) ─────────────────
    if (req.method === 'POST') {
      const body = await req.json();
      const { action } = body as { action: string };
      if (!action) return badRequest('action required');

      // Create a new host listing, optionally assigning + approving a partner
      if (action === 'create') {
        const { payload, partnerEmail } = body as { payload: Record<string, unknown>; partnerEmail?: string };
        if (!payload) return badRequest('payload required');

        let assignedUserId: string | null = null;
        let ownerIsVerified = false;
        if (partnerEmail?.trim()) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, is_verified')
            .eq('email', partnerEmail.trim().toLowerCase())
            .single();
          if (!profile) return json({ error: `No account found for ${partnerEmail.trim()}. Ask them to sign up first.` }, 404);
          assignedUserId = profile.id;
          ownerIsVerified = profile.is_verified ?? false;
        }

        const safePayload: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(payload)) {
          if (ALLOWED_HOST_FIELDS[k]) safePayload[k] = v;
        }

        const { data: inserted, error } = await supabase
          .from('hosts')
          .insert({
            ...safePayload,
            user_id: assignedUserId,
            assigned_user_id: assignedUserId,
            owner_is_verified: ownerIsVerified,
          })
          .select()
          .single();
        if (error) throw error;

        if (assignedUserId) {
          await supabase.from('profiles').update({ is_host_approved: true }).eq('id', assignedUserId);
        }

        return json({ success: true, data: inserted });
      }

      // Multi-listing: add an additional listing to an existing host/business
      // account. Deliberately separate from the 'create' action above rather
      // than a flag on it — 'create' sets user_id (only valid for a listing's
      // very first row per account, enforced by hosts.user_id's UNIQUE
      // constraint); this action never touches user_id at all, so the same
      // owner can hold any number of additional listings via
      // assigned_user_id alone. schema.sql's `ALTER TABLE hosts ALTER
      // COLUMN user_id DROP NOT NULL` is what makes that possible.
      if (action === 'create_additional_listing') {
        const { ownerUserId, payload } = body as { ownerUserId?: string; payload?: Record<string, unknown> };

        // Fail closed — never create a listing without a real, existing
        // owner account, and never as a backdoor around the normal
        // create/approval flow for a brand-new host with no listing yet.
        if (!ownerUserId || typeof ownerUserId !== 'string') {
          return badRequest('ownerUserId required');
        }
        const { data: ownerProfile, error: ownerErr } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', ownerUserId)
          .single();
        if (ownerErr || !ownerProfile) {
          return json({ error: 'No account found for that owner id — refusing to create an orphaned listing.' }, 404);
        }
        const { count: existingListingCount } = await supabase
          .from('hosts')
          .select('id', { count: 'exact', head: true })
          .or(`user_id.eq.${ownerUserId},assigned_user_id.eq.${ownerUserId}`);
        if (!existingListingCount) {
          return json({ error: 'This account has no existing listing — use "Create Host Profile" for a brand-new host instead.' }, 409);
        }

        if (!payload) return badRequest('payload required');
        const safePayload: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(payload)) {
          // is_active excluded on purpose, even if present in payload — this
          // listing is always created as a draft, no exceptions, until the
          // host completes and activates it themselves.
          if (ALLOWED_HOST_FIELDS[k] && k !== 'is_active') safePayload[k] = v;
        }

        const { data: inserted, error } = await supabase
          .from('hosts')
          .insert({
            ...safePayload,
            user_id: null,
            assigned_user_id: ownerUserId,
            is_active: false,
          })
          .select()
          .single();
        if (error) throw error;

        return json({ success: true, data: inserted });
      }

      const { hostId: id } = body as { hostId: string };
      if (!id) return badRequest('hostId required');

      // Assign user by email
      if (action === 'assign') {
        const { email } = body as { email: string };
        if (!email) return badRequest('email required');

        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .eq('email', email.trim().toLowerCase())
          .single();

        if (profileErr || !profile) return json({ error: 'No account found for that email' }, 404);

        // Update host: set both user_id and assigned_user_id
        const { error: hostErr } = await supabase
          .from('hosts')
          .update({ assigned_user_id: profile.id, user_id: profile.id })
          .eq('id', id);
        if (hostErr) throw hostErr;

        // Approve the user as a host
        await supabase.from('profiles').update({ is_host_approved: true }).eq('id', profile.id);

        return json({ success: true, profile });
      }

      // Remove assigned user
      if (action === 'remove_user') {
        const { data: host } = await supabase.from('hosts').select('user_id, assigned_user_id').eq('id', id).single();
        const { error } = await supabase
          .from('hosts')
          .update({ assigned_user_id: null })
          .eq('id', id);
        if (error) throw error;

        // Revoke host approval if user is assigned here
        if (host?.assigned_user_id) {
          await supabase.from('profiles').update({ is_host_approved: false }).eq('id', host.assigned_user_id);
        }
        return json({ success: true });
      }

      // Safe delete — check for active bookings first
      if (action === 'delete') {
        const { force } = body as { force?: boolean };

        // Check for active/pending/confirmed bookings
        const { data: activeBookings } = await supabase
          .from('bookings')
          .select('id, status')
          .eq('host_id', id)
          .in('status', ['pending', 'confirmed', 'active']);

        if ((activeBookings?.length ?? 0) > 0 && !force) {
          return json({
            error: `Host has ${activeBookings!.length} active booking(s). Pass force:true to confirm deletion.`,
            activeBookingCount: activeBookings!.length,
            requiresForce: true,
          }, 409);
        }

        // Delete in safe order
        await supabase.from('bookings').delete().eq('host_id', id);
        await supabase.from('reviews').delete().eq('host_id', id);
        const { error } = await supabase.from('hosts').delete().eq('id', id);
        if (error) throw error;
        return json({ success: true });
      }

      return badRequest(`Unknown action: ${action}`);
    }

    return new Response('Method not allowed', { status: 405, headers: cors });
  } catch (err) {
    console.error('admin-hosts error:', err);
    return json({ error: String(err) }, 500);
  }
});
