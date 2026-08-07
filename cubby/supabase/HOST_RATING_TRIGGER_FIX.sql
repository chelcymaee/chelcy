-- ============================================================================
-- Host rating/review_count trigger fix + one-time backfill
-- ============================================================================
-- Root cause (confirmed live against production, 2026-08-07):
--   recalculate_host_rating() and trg_recalculate_host_rating are described
--   in schema.sql (lines 97-115) but were never actually deployed to this
--   database — `select * from pg_trigger where tgname = '...'` and the
--   equivalent pg_proc check both returned zero rows. hosts.rating and
--   hosts.review_count have therefore never been automatically kept in sync
--   with the real reviews table; every host's stored summary has been frozen
--   at whatever it started as, regardless of real review activity, since
--   launch. This predates and is unrelated to PR #85 (the 23502 fix) — that
--   was a missing booking_id on insert; this is a missing trigger entirely.
--
-- This file is idempotent end to end — every step below is safe to run more
-- than once with no duplicate objects and no changed outcome on repeat runs:
--   - STEP 1 uses CREATE OR REPLACE FUNCTION (inherently idempotent).
--   - STEP 2 uses DROP TRIGGER IF EXISTS before CREATE TRIGGER (Postgres has
--     no CREATE TRIGGER IF NOT EXISTS form, so this is the idempotent
--     equivalent — running it twice leaves exactly one trigger, not two).
--   - STEP 3's backfill fully recomputes rating/review_count from the real
--     reviews table every time, rather than incrementing anything — running
--     it once or a hundred times converges to the identical correct values.
--
-- Scope: this file touches ONLY the recalculate_host_rating function, the
-- trg_recalculate_host_rating trigger, and hosts.rating / hosts.review_count
-- (STEP 3's UPDATE's SET clause references no other column). It does not
-- touch review submission logic, RLS policies, or any other host field.
-- ============================================================================


-- ── STEP 0: PREFLIGHT (read-only) — run first, keep the output for comparison ──
select
  h.id,
  h.display_name,
  h.rating as stored_rating,
  h.review_count as stored_review_count,
  coalesce(round(avg(r.rating)::numeric, 1), 0) as real_avg_rating,
  count(r.id) as real_review_count
from hosts h
left join reviews r on r.host_id = h.id
group by h.id, h.display_name, h.rating, h.review_count
order by h.created_at desc;


-- ── STEP 1: (Re)create the function — verbatim from schema.sql lines 98-111 ──
create or replace function recalculate_host_rating()
returns trigger language plpgsql security definer as $$
declare
  target_host_id uuid;
begin
  target_host_id := coalesce(new.host_id, old.host_id);
  update hosts
  set
    rating       = (select coalesce(round(avg(rating)::numeric, 1), 0) from reviews where host_id = target_host_id),
    review_count = (select count(*) from reviews where host_id = target_host_id)
  where id = target_host_id;
  return new;
end;
$$;


-- ── STEP 2: (Re)create the trigger ──────────────────────────────────────────
drop trigger if exists trg_recalculate_host_rating on reviews;
create trigger trg_recalculate_host_rating
after insert or delete on reviews
for each row execute function recalculate_host_rating();


-- ── STEP 3: One-time backfill ────────────────────────────────────────────────
-- Corrects every host's currently-wrong stored rating/review_count from the
-- real reviews table. Touches ONLY these two columns on hosts.
update hosts h
set
  rating       = coalesce((select round(avg(r.rating)::numeric, 1) from reviews r where r.host_id = h.id), 0),
  review_count = coalesce((select count(*) from reviews r where r.host_id = h.id), 0);


-- ── STEP 4: POST-DEPLOY VERIFICATION (read-only) ────────────────────────────
-- Re-run the same comparison as STEP 0 — stored_* should now exactly match
-- real_* for every host with zero exceptions.
select
  h.id,
  h.display_name,
  h.rating as stored_rating,
  h.review_count as stored_review_count,
  coalesce(round(avg(r.rating)::numeric, 1), 0) as real_avg_rating,
  count(r.id) as real_review_count
from hosts h
left join reviews r on r.host_id = h.id
group by h.id, h.display_name, h.rating, h.review_count
order by h.created_at desc;

-- Confirm the trigger now exists and is enabled ('O' = enabled):
select tgname, tgenabled, tgrelid::regclass as table_name
from pg_trigger
where tgname = 'trg_recalculate_host_rating';

-- Confirm the function now exists:
select proname, prosecdef as is_security_definer
from pg_proc
where proname = 'recalculate_host_rating';

-- Live end-to-end check: submit a real review (or delete + reinsert an
-- existing one) through the app, then re-run STEP 0's query for that one
-- host — stored_* should update automatically with zero manual SQL, proving
-- the trigger itself is firing, not just that STEP 3's backfill ran once.


-- ============================================================================
-- ROLLBACK (only if needed)
-- ============================================================================
-- Low risk either way: dropping the trigger/function returns to today's
-- current (broken) behavior — not a regression from something that used to
-- work, since it has never worked in production. The backfilled numbers are
-- not "undone" by this and don't need to be — reviews is the source of
-- truth, so correct values can always be recomputed from it again at any
-- time, with or without the trigger in place.
--
-- drop trigger if exists trg_recalculate_host_rating on reviews;
-- drop function if exists recalculate_host_rating();
