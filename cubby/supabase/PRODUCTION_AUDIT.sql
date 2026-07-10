-- ============================================================================
-- Production Environment Audit — Private Beta readiness
-- ============================================================================
-- Run this in the Supabase SQL Editor (NOT from the app — this sandbox has
-- no network access to the live project). Every table/column/bucket listed
-- here is one the *code* actually references — this script exists because
-- we've now found two cases (verifications table, and the hosts RLS gaps)
-- where production quietly diverged from what the codebase assumes.
--
-- Run each numbered block, paste the result back. Nothing here writes or
-- deletes anything — every block is a pure SELECT.
-- ============================================================================


-- ── 1. Table existence — every table referenced anywhere in app/src/edge functions ──
-- Expected: all 16 rows show exists = true. Any `false` means the app will
-- error the moment that table is touched — exactly what happened with
-- `verifications` before today, except that one turned out to actually exist
-- (the client's generic error handling just made it look missing).

SELECT expected.table_name, (t.table_name IS NOT NULL) AS exists
FROM (VALUES
  ('bank_details'), ('bookings'), ('conversations'), ('host_bank_details'),
  ('hosts'), ('messages'), ('notification_preferences'), ('notifications'),
  ('partner_applications'), ('profiles'), ('push_tokens'), ('reviews'),
  ('saved_spots'), ('support_messages'), ('traveller_reviews'), ('verifications')
) AS expected(table_name)
LEFT JOIN information_schema.tables t
  ON t.table_name = expected.table_name AND t.table_schema = 'public'
ORDER BY exists ASC, expected.table_name;


-- ── 2. RLS enabled status — for every table that does exist ──
-- Expected: rowsecurity = true for every row. A table with RLS OFF is
-- either fully open (if it holds data anyone can already see, e.g. reviews)
-- or a silent trap waiting for someone to add a policy assuming RLS is on.

SELECT schemaname, tablename, rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'bank_details', 'bookings', 'conversations', 'host_bank_details',
    'hosts', 'messages', 'notification_preferences', 'notifications',
    'partner_applications', 'profiles', 'push_tokens', 'reviews',
    'saved_spots', 'support_messages', 'traveller_reviews', 'verifications'
  )
ORDER BY rls_enabled ASC, tablename;


-- ── 3. Full policy inventory — every policy on every app table, one query ──
-- This is the same query that found the two fake-admin policies on hosts
-- and bookings earlier this week. Read qual/with_check for anything with
-- `true` and a name implying a restriction it doesn't actually enforce —
-- that pattern has already been real twice.

SELECT tablename, policyname, cmd, permissive, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'bank_details', 'bookings', 'conversations', 'host_bank_details',
    'hosts', 'messages', 'notification_preferences', 'notifications',
    'partner_applications', 'profiles', 'push_tokens', 'reviews',
    'saved_spots', 'support_messages', 'traveller_reviews', 'verifications'
  )
ORDER BY tablename, cmd;


-- ── 4. Storage buckets — existence + public/private flag ──
-- Expected: host-photos = public true, avatars = public true,
-- verifications = public FALSE (it holds ID photos and selfies — if this
-- one shows public = true, that's a real, serious exposure, fix immediately).

SELECT expected.bucket_name, b.id IS NOT NULL AS exists, b.public
FROM (VALUES ('host-photos'), ('avatars'), ('verifications')) AS expected(bucket_name)
LEFT JOIN storage.buckets b ON b.id = expected.bucket_name
ORDER BY exists ASC, expected.bucket_name;


-- ── 5. Storage bucket policies — who can read/write each bucket ──
-- Expected pattern for all three (matches the convention already used for
-- host-photos): INSERT/SELECT/UPDATE restricted to
-- auth.uid() = (storage.foldername(name))[1]::uuid — i.e. you can only
-- write into your own folder. If verifications shows anything broader than
-- that, ID documents are more exposed than intended.

SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;


-- ── 6. Columns that are used in code but have no CREATE/ALTER TABLE ──
-- anywhere in schema.sql — genuinely unknown whether they exist live.
-- Run this after block 1 confirms the parent table exists.

SELECT 'hosts' AS table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'hosts' AND table_schema = 'public'
  AND column_name IN ('owner_is_verified', 'avg_response_time_minutes', 'total_requests', 'responded_requests')
UNION ALL
SELECT 'bookings', column_name, data_type
FROM information_schema.columns
WHERE table_name = 'bookings' AND table_schema = 'public'
  AND column_name IN ('payment_provider', 'payment_reference', 'paid_at', 'failure_reason')
UNION ALL
SELECT 'notifications', column_name, data_type
FROM information_schema.columns
WHERE table_name = 'notifications' AND table_schema = 'public'
  AND column_name IN ('related_booking_id', 'related_message_id')
ORDER BY table_name, column_name;

-- Expected row counts if everything is present: hosts 4 rows, bookings 4
-- rows, notifications 2 rows. Any table missing rows here has a column the
-- code silently assumes exists — writes/reads to that column will either
-- error or (for a plain SELECT of a nonexistent column) error loudly, so
-- this is usually easy to spot in the app itself, but confirms it either way.


-- ── 7. verifications table — full column list ──
-- Confirms the exact live shape, since block 1 tells us it exists but not
-- whether its columns match what verifications.tsx expects
-- (id, user_id, id_photo_url, selfie_url, status, submitted_at, reviewed_at).

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'verifications' AND table_schema = 'public'
ORDER BY ordinal_position;


-- ============================================================================
-- After running all 7 blocks, paste every result back. Edge Functions,
-- secrets, and Auth/PayFast dashboard settings aren't queryable via SQL —
-- see the companion CLI/manual checklist for those.
-- ============================================================================
