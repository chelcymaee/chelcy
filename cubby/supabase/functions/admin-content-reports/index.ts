// ─── admin-content-reports Edge Function ───────────────────────────────────────
//
// PIN-protected moderation queue for content_reports (Stage 1's report_content()
// backend, Stage 2A/2B's client UI). Same shape as admin-reviews — service-role
// client, requireAdminSession gate, GET list / PATCH action.
//
// Moderator actions on a report are independent, not a single terminal state:
//   - remove_content — deletes the actual reported row from reviews /
//     traveller_reviews / messages (never content_reports itself, which stays
//     as the permanent audit record regardless of any action taken on it).
//   - suspend_user / unsuspend_user — bans/unbans the reported_user_id via
//     Supabase Auth's own built-in mechanism (auth.admin.updateUserById with
//     ban_duration). This is the authoritative "eject the user" action Apple's
//     rejection requires — enforced at the auth/session layer, before any RLS
//     policy or app code runs. Never exposed to the app client; only reachable
//     from here, behind requireAdminSession.
//   - dismiss — no action taken, the report was reviewed and didn't warrant one.
//
// A report may get remove_content only, suspend_user only, both, or dismiss.
// action_taken accumulates what actually happened (comma-joined), so "both"
// is recorded accurately rather than overwriting a prior action. status moves
// to 'actioned' the first time either real action is taken, and stays
// 'actioned' regardless of what's done afterward; 'dismiss' sets 'dismissed'
// instead. Nothing here ever deletes a content_reports row.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireAdminSession } from '../_shared/admin-session.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const unauthorized = () => json({ error: 'Unauthorized' }, 401);
const badRequest = (msg: string) => json({ error: msg }, 400);

// A 100-year ban is Supabase's own documented pattern for an effectively
// permanent ban via this API (there's no literal "forever" value) —
// ban_duration: 'none' is the documented way to reverse it.
const PERMANENT_BAN_DURATION = '876000h';

function addActionTaken(existing: string | null, action: string): string {
  const parts = new Set((existing ?? '').split(',').map(s => s.trim()).filter(Boolean));
  parts.add(action);
  return Array.from(parts).join(', ');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const session = await requireAdminSession(req, supabase);
  if (!session.ok) return unauthorized();

  const url = new URL(req.url);

  try {
    // ── GET — list reports, enriched with reporter/reported names and a
    //          preview of the actual reported content ───────────────────────
    if (req.method === 'GET') {
      const statusFilter = url.searchParams.get('status');
      let q = supabase.from('content_reports').select('*').order('created_at', { ascending: true });
      if (statusFilter) q = q.eq('status', statusFilter);
      const { data: reports, error } = await q;
      if (error) throw error;
      if (!reports || reports.length === 0) return json({ data: [] });

      // Reporter/reported names — one batched profiles query, not N+1.
      const userIds = Array.from(new Set(reports.flatMap((r: any) => [r.reporter_id, r.reported_user_id])));
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', userIds);
      const nameById: Record<string, { name: string; email: string }> = {};
      for (const p of profiles ?? []) nameById[p.id] = { name: p.full_name ?? 'Unknown', email: p.email ?? '' };

      // Content preview — one batched query per content type actually present.
      const idsByType: Record<string, string[]> = { host_review: [], traveller_review: [], message: [] };
      for (const r of reports) idsByType[r.content_type]?.push(r.content_id);

      const previewById: Record<string, { text: string | null; extra: string }> = {};
      if (idsByType.host_review.length) {
        const { data } = await supabase.from('reviews').select('id, comment, rating').in('id', idsByType.host_review);
        for (const row of data ?? []) previewById[row.id] = { text: row.comment, extra: `${row.rating}/5` };
      }
      if (idsByType.traveller_review.length) {
        const { data } = await supabase.from('traveller_reviews').select('id, comment, host_name').in('id', idsByType.traveller_review);
        for (const row of data ?? []) previewById[row.id] = { text: row.comment, extra: row.host_name ?? '' };
      }
      if (idsByType.message.length) {
        const { data } = await supabase.from('messages').select('id, body').in('id', idsByType.message);
        for (const row of data ?? []) previewById[row.id] = { text: row.body, extra: '' };
      }

      const enriched = reports.map((r: any) => ({
        ...r,
        reporterName: nameById[r.reporter_id]?.name ?? 'Unknown',
        reporterEmail: nameById[r.reporter_id]?.email ?? '',
        reportedUserName: nameById[r.reported_user_id]?.name ?? 'Unknown',
        reportedUserEmail: nameById[r.reported_user_id]?.email ?? '',
        contentPreview: previewById[r.content_id]?.text ?? '(content no longer exists — likely already removed)',
        contentExtra: previewById[r.content_id]?.extra ?? '',
      }));

      return json({ data: enriched });
    }

    // ── PATCH — take an action on a report ────────────────────────────────────
    if (req.method === 'PATCH') {
      const body = await req.json();
      const { id, action } = body as { id: string; action: string };
      if (!id) return badRequest('id required');
      if (!['remove_content', 'suspend_user', 'unsuspend_user', 'dismiss'].includes(action)) {
        return badRequest('invalid action');
      }

      const { data: report, error: fetchErr } = await supabase
        .from('content_reports').select('*').eq('id', id).single();
      if (fetchErr || !report) return badRequest('report not found');

      if (action === 'dismiss') {
        const { error } = await supabase
          .from('content_reports')
          .update({ status: 'dismissed', resolved_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;
        return json({ success: true });
      }

      if (action === 'remove_content') {
        const table = report.content_type === 'host_review' ? 'reviews'
          : report.content_type === 'traveller_review' ? 'traveller_reviews'
          : 'messages';
        const { error: delErr } = await supabase.from(table).delete().eq('id', report.content_id);
        if (delErr) throw delErr;

        const { error } = await supabase
          .from('content_reports')
          .update({
            status: 'actioned',
            action_taken: addActionTaken(report.action_taken, 'content_removed'),
            resolved_at: new Date().toISOString(),
          })
          .eq('id', id);
        if (error) throw error;
        return json({ success: true });
      }

      if (action === 'suspend_user' || action === 'unsuspend_user') {
        const banning = action === 'suspend_user';
        const { error: authErr } = await supabase.auth.admin.updateUserById(report.reported_user_id, {
          ban_duration: banning ? PERMANENT_BAN_DURATION : 'none',
        });
        if (authErr) throw authErr;

        const { error } = await supabase
          .from('content_reports')
          .update({
            status: 'actioned',
            action_taken: addActionTaken(report.action_taken, banning ? 'user_suspended' : 'user_unsuspended'),
            resolved_at: new Date().toISOString(),
          })
          .eq('id', id);
        if (error) throw error;
        return json({ success: true });
      }

      return badRequest('unreachable');
    }

    return new Response('Method not allowed', { status: 405, headers: cors });
  } catch (err) {
    console.error('admin-content-reports error:', err);
    return json({ error: String(err) }, 500);
  }
});
