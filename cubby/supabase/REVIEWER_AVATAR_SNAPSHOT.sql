-- ============================================================================
-- reviewer_avatar_url column + one-time backfill for existing reviews
-- ============================================================================
-- Feature: show a reviewer's real photo (instead of the generic 👤) on the
-- public host-detail.tsx review list. That screen is public — any traveller
-- can view it, not just the host — so a live join to profiles.avatar_url
-- would silently return nothing for almost everyone (profiles RLS is
-- owner-only self-read + a separate host-booking-scoped read; a random
-- browsing viewer has neither). Same problem this repo already solved once
-- for reviewer_name: a denormalized snapshot, written once at submission
-- time from the reviewer's own self-read profiles row (auth.uid() = id,
-- the most basic RLS policy in the app). No new cross-user access, no RLS
-- change, no new RPC/view — see PROJECT_MASTER_PLAN.md for the full
-- architecture discussion this was decided against.
--
-- Run STEP 1 (schema.sql already has the ALTER TABLE too — this file's copy
-- is here so this migration is self-contained and re-runnable on its own)
-- before STEP 2's backfill. STEP 2 only ever needs to run once for existing
-- reviews; all reviews submitted after the app-code change carry their own
-- snapshot at insert time and don't need backfilling.
--
-- Scope: this file touches ONLY reviews.reviewer_avatar_url. It does not
-- read or write reviewer_name, rating, comment, tags, or any other column,
-- and does not touch traveller_reviews (host→traveller direction) — out of
-- scope for this PR per explicit instruction.
-- ============================================================================


-- ── STEP 1: add the column (idempotent — ADD COLUMN IF NOT EXISTS) ─────────
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reviewer_avatar_url TEXT;


-- ── STEP 2a: PREFLIGHT (read-only) — run first, read the output ────────────
-- How many existing reviews would receive an avatar vs. stay null (reviewer
-- never uploaded a photo, same as Summer's account in the live investigation
-- this migration came out of).
SELECT
  COUNT(*) AS total_reviews,
  COUNT(*) FILTER (WHERE p.avatar_url IS NOT NULL) AS would_receive_avatar,
  COUNT(*) FILTER (WHERE p.avatar_url IS NULL) AS would_stay_null,
  COUNT(*) FILTER (WHERE r.reviewer_avatar_url IS NOT NULL) AS already_has_snapshot
FROM reviews r
LEFT JOIN profiles p ON p.id = r.reviewer_id;

-- Row-level detail, if you want to see exactly which reviews are affected
-- before running STEP 2b:
SELECT r.id, r.reviewer_name, r.reviewer_id, r.created_at,
       p.avatar_url AS would_be_set_to
FROM reviews r
LEFT JOIN profiles p ON p.id = r.reviewer_id
WHERE r.reviewer_avatar_url IS NULL
ORDER BY r.created_at DESC;


-- ── STEP 2b: One-time backfill ───────────────────────────────────────────────
-- Only sets reviewer_avatar_url — reviewer_id -> profiles.avatar_url -> here.
-- reviews.reviewer_id is NOT NULL and references auth.users(id) ON DELETE
-- CASCADE, so every existing review is guaranteed to still point at a real
-- profiles row (no orphaned rows possible) — confirmed live before writing
-- this file. WHERE clause skips rows that already have a snapshot (e.g. a
-- review submitted after the app-code change, before this backfill ran),
-- so this is safe to re-run without re-touching rows that already have the
-- correct real-at-submission-time value.
UPDATE reviews r
SET reviewer_avatar_url = p.avatar_url
FROM profiles p
WHERE p.id = r.reviewer_id
  AND r.reviewer_avatar_url IS NULL
  AND p.avatar_url IS NOT NULL;


-- ── STEP 2c: POST-BACKFILL VERIFICATION (read-only) ─────────────────────────
-- Re-run the STEP 2a summary — would_receive_avatar should now equal
-- already_has_snapshot, and would_stay_null unchanged (reviewers with no
-- photo correctly remain null, not an error).
SELECT
  COUNT(*) AS total_reviews,
  COUNT(*) FILTER (WHERE reviewer_avatar_url IS NOT NULL) AS has_snapshot,
  COUNT(*) FILTER (WHERE reviewer_avatar_url IS NULL) AS still_null
FROM reviews;


-- ============================================================================
-- ROLLBACK (only if needed)
-- ============================================================================
-- The backfill (STEP 2b) only ever sets reviewer_avatar_url — no other
-- column is read or written, and no rows are inserted or deleted. To
-- fully undo just the backfill (leaving the column itself in place, so the
-- app keeps working — new reviews still snapshot correctly going forward):
--
-- UPDATE reviews SET reviewer_avatar_url = NULL;
--
-- To remove the column entirely (only if abandoning the feature altogether —
-- also revert the app-code changes in the same PR first, since they write
-- to this column on every new review):
--
-- ALTER TABLE reviews DROP COLUMN IF EXISTS reviewer_avatar_url;
-- ============================================================================
