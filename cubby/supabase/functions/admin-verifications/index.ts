import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireAdminSession } from '../_shared/admin-session.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const unauthorized = () => json({ error: 'Unauthorized' }, 401);
const badRequest = (msg: string) => json({ error: msg }, 400);

// Approve/reject a submitted ID verification — service-role only.
//
// Why this exists: the admin panel authenticates via a PIN-issued session
// token (see _shared/admin-session.ts), not Supabase Auth — there is no
// admin identity at the database level in this project at all (see the
// Fix 6/7 notes elsewhere in schema.sql). So a direct client-side
// `supabase.from(...).update(...)` against `verifications` or `profiles`
// runs with no matching `auth.uid()` and is silently filtered to zero
// rows by RLS (`auth.uid() = user_id` / `auth.uid() = id`) — no error, no
// row changed, nothing for the caller to catch. That's exactly what
// app/(admin)/verifications.tsx used to do for both of those writes.
//
// Every write below runs under the service role (bypasses RLS by design,
// same pattern as admin-hosts/admin-users) and is individually checked —
// the caller only gets `{ success: true }` once every write that applies
// to this applicant has actually persisted. verifications.tsx gates its
// success UI and "You're verified" push notification on that response,
// not on hope.
//
// Not a single DB transaction across the three tables (no other admin-*
// function in this repo uses one either — see admin-hosts's multi-table
// `action: 'create'` for the same shape). If a later step fails after an
// earlier one succeeded, the caller still gets an error back — so the
// admin UI won't show success or notify — but the earlier write already
// landed. All three writes are idempotent updates, so re-running the same
// approve/reject is always safe.
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const session = await requireAdminSession(req, supabase);
  if (!session.ok) return unauthorized();

  if (req.method !== 'PATCH') return json({ error: 'Method not allowed' }, 405);

  try {
    const body = await req.json();
    const { verificationId, userId, status } = body as {
      verificationId?: string; userId?: string; status?: string;
    };

    if (!verificationId) return badRequest('verificationId required');
    if (!userId) return badRequest('userId required');
    if (status !== 'approved' && status !== 'rejected') {
      return badRequest('status must be "approved" or "rejected"');
    }

    const isApproved = status === 'approved';
    const reviewedAt = new Date().toISOString();

    // 1. verifications.status / reviewed_at — required.
    const { data: verifRow, error: verifErr } = await supabase
      .from('verifications')
      .update({ status, reviewed_at: reviewedAt })
      .eq('id', verificationId)
      .select('id')
      .maybeSingle();
    if (verifErr) throw verifErr;
    if (!verifRow) return json({ error: 'Verification not found — nothing was changed.' }, 404);

    // 2. profiles.is_verified — required. This is the field the bug report
    // traced: previously written by a direct client call with no RLS grant.
    const { data: profileRow, error: profileErr } = await supabase
      .from('profiles')
      .update({ is_verified: isApproved })
      .eq('id', userId)
      .select('id')
      .maybeSingle();
    if (profileErr) throw profileErr;
    if (!profileRow) return json({ error: 'Profile not found — verification was updated but profile was not.' }, 404);

    // 3. hosts.owner_is_verified — required only for host applicants.
    // Same lookup column verifications.tsx always used (assigned_user_id).
    // Every host row gets both user_id and assigned_user_id set to the
    // same value at creation time (see admin-hosts's `action: 'create'`),
    // so this hasn't missed a real host in practice — preserved as-is
    // rather than widened, to keep this fix scoped to the persistence
    // bug rather than a host-lookup redesign.
    const { data: hostRow, error: hostLookupErr } = await supabase
      .from('hosts')
      .select('id')
      .eq('assigned_user_id', userId)
      .maybeSingle();
    if (hostLookupErr) throw hostLookupErr;

    let hostUpdated = false;
    if (hostRow) {
      const { data: updatedHost, error: hostErr } = await supabase
        .from('hosts')
        .update({ owner_is_verified: isApproved })
        .eq('id', hostRow.id)
        .select('id')
        .maybeSingle();
      if (hostErr) throw hostErr;
      if (!updatedHost) return json({ error: 'Host listing update failed — nothing was changed for the listing.' }, 500);
      hostUpdated = true;
    }

    // 4. In-app notification row. Same silent-RLS-failure shape as steps 1-2
    // if left as a client-side insert from verifications.tsx (no policy in
    // schema.sql grants an admin session insert access to another user's
    // notifications), so it moves here too. Best-effort relative to the
    // three writes above, matching how the push notification below has
    // always been treated in this codebase (fire-and-forget) — a failure
    // here doesn't roll back or fail the request, since the actual trust
    // state (steps 1-3) already succeeded by this point; it's logged so
    // it isn't silently lost either.
    const { error: notifErr } = await supabase.from('notifications').insert({
      user_id: userId,
      type: isApproved ? 'verification_approved' : 'verification_rejected',
      title: isApproved ? "You're verified! ✅" : 'Verification unsuccessful',
      body: isApproved
        ? 'Your identity has been confirmed. Your profile now shows the verified badge.'
        : "We couldn't verify your identity. Please try again with a clearer photo of your ID and selfie.",
      read_at: null,
    });
    if (notifErr) console.error('admin-verifications: notification insert failed (non-fatal):', notifErr);

    return json({ success: true, data: { verificationId, userId, status, isHost: hostUpdated, reviewedAt } });
  } catch (err) {
    console.error('admin-verifications error:', err);
    return json({ error: String(err) }, 500);
  }
});
