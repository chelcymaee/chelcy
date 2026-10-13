-- ============================================================
-- send-push replay protection — supporting schema change
--
-- NOT YET APPLIED. Required by the not-yet-deployed round-2
-- send-push/index.ts (see supabase/functions/_shared/push-authorization.ts).
--
-- Purely additive: one new nullable column, no default beyond NULL, no
-- backfill, no constraint on existing rows. Every existing row reads as
-- "not yet claimed" (pushed_at IS NULL), which is exactly correct — nothing
-- has used the new single-use mechanism yet. The currently-deployed
-- send-push (v9) never references this column, so adding it has zero
-- effect until the round-2 code is actually deployed.
-- ============================================================

alter table public.notifications
  add column if not exists pushed_at timestamptz;

-- No index added: send-push's lookup already filters by user_id + title +
-- body + created_at, which is a narrow, recent slice of a table this size
-- at Private Beta scale; revisit if query_logs ever show this as slow.
