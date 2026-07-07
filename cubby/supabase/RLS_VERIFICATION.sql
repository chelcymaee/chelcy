-- ============================================================================
-- RLS live verification — Private Beta launch audit
-- ============================================================================
-- Run this in the Supabase SQL Editor (NOT from the app — this sandbox has
-- no network access to the live project, so none of this could be executed
-- automatically; every result here needs you to actually run it and read
-- the output).
--
-- Method: same as the Sprint 3 diagnostic that caught the real
-- partner_applications/support_messages bug — impersonate a role/user and
-- see what actually comes back, rather than trusting what the code assumes.
--
-- Run each numbered block, note the result, then RESET ROLE before the next
-- one. Blocks that INSERT/UPDATE/DELETE are wrapped in a transaction that
-- gets rolled back automatically — nothing here permanently changes data.
-- ============================================================================


-- ── 1. Messages/conversations: can a completely anonymous request read anything? ──
-- Expected (safe): 0 rows, or a permission error.
-- If you get real rows back here, messaging is wide open to the public.

SET ROLE anon;
SELECT count(*) FROM conversations;
SELECT count(*) FROM messages;
RESET ROLE;


-- ── 2. Messages/conversations: can ANY signed-in user read a conversation ──
-- ── that isn't theirs? ──
-- First, find a real conversation and a real user who is NOT a participant
-- in it:
SELECT c.id AS conversation_id, c.traveller_id, h.assigned_user_id AS host_owner_id
FROM conversations c
JOIN hosts h ON h.id = c.host_id
LIMIT 5;

-- Then pick any OTHER real user id (not traveller_id or host_owner_id from
-- above) — e.g. from `select id, email from profiles limit 10;` — and
-- substitute it as <OTHER_USER_ID> and the conversation id as <CONV_ID>
-- below:

BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub": "<OTHER_USER_ID>", "role": "authenticated"}';
SELECT * FROM conversations WHERE id = '<CONV_ID>';
SELECT * FROM messages WHERE conversation_id = '<CONV_ID>';
ROLLBACK;

-- Expected (safe): both queries return 0 rows — this user isn't a
-- participant, so they shouldn't see this conversation or its messages at
-- all. If real rows come back, that confirms the IDOR risk flagged in the
-- audit — apply Fix 4 in schema.sql (already written, just needs running).


-- ── 3. hosts: can a random authenticated user create a fake listing? ──
-- Expected (safe): INSERT fails with a policy violation.

BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000000", "role": "authenticated"}';
INSERT INTO hosts (display_name, location_name, business_type, price_per_bag_per_day, max_bags)
VALUES ('RLS TEST — should fail', 'Nowhere', 'other', 100, 1);
ROLLBACK;

-- If this succeeds (no error), any signed-in traveller could create fake
-- host listings directly — a real gap, independent of the admin-hosts
-- edge function fix already shipped this sprint (that only closed the
-- *admin panel's* path; this checks the *direct table* path).


-- ── 4. reviews: can a random authenticated user delete someone else's review? ──
-- First find a real review id:
SELECT id, reviewer_name, host_id FROM reviews LIMIT 5;

-- Substitute a real id as <REVIEW_ID>:
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000000", "role": "authenticated"}';
DELETE FROM reviews WHERE id = '<REVIEW_ID>';
SELECT count(*) FROM reviews WHERE id = '<REVIEW_ID>'; -- should still be 1 if the delete was blocked
ROLLBACK;

-- Expected (safe): DELETE affects 0 rows or errors — a review shouldn't be
-- deletable by anyone except the host who wrote it (or an admin, via the
-- ADMIN_SECRET-gated admin-reviews function already shipped this sprint).


-- ── 5. bookings: can a random authenticated user see other people's bookings? ──

BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000000", "role": "authenticated"}';
SELECT count(*) FROM bookings; -- should be 0 for a user with no bookings/hosts of their own
ROLLBACK;

-- Expected (safe): 0. If this returns every booking on the platform, that's
-- the same class of leak as the Sprint 3 bug, just on a much more
-- sensitive table.


-- ============================================================================
-- After running all 5: report back which ones returned unexpected (unsafe)
-- results. For #2 (messaging), if unsafe, run the Fix 4 block already added
-- to schema.sql, then re-run block #2 to confirm it's now blocked.
-- ============================================================================
