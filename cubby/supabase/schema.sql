-- Users/profiles (extends Supabase auth.users)
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  phone text,
  avatar_url text,
  role text not null default 'traveller', -- traveller | host | runner | both
  is_verified boolean default false,
  created_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- Lets a host read a traveller's profiles row (full_name, avatar_url, email)
-- when a real booking exists between them — powers Booking Requests,
-- Messages, View Traveller Profile, and Host Reviews. This policy has
-- existed live in production for a while but was never committed here
-- until the profiles RLS audit below found it undocumented. Captured
-- verbatim from production (2026-08-09) rather than rewritten, and
-- confirmed to be the only policy any live client code depends on for
-- cross-user profiles access (see PROJECT_MASTER_PLAN.md for the audit).
create policy "Hosts can view profiles of their travellers" on profiles
  for select using (
    exists (
      select 1 from bookings b join hosts h on h.id = b.host_id
      where b.traveller_id = profiles.id
        and (h.user_id = auth.uid() or h.assigned_user_id = auth.uid())
    )
  );

-- REMOVED (2026-08-09, profiles RLS audit): "Anyone can view active host
-- profile verification" — for select using (id in (select
-- coalesce(hosts.assigned_user_id, hosts.user_id) from hosts where
-- hosts.is_active = true)). Exposed the full profiles row (email, phone,
-- full_name) of every active host to any authenticated request, no
-- relationship check at all. Its only known consumer (host-detail.tsx's
-- verification badge) had already been migrated to read
-- hosts.owner_is_verified directly in an earlier commit (82ac815) — a
-- full codebase audit found no remaining dependency before this was
-- dropped from production. Rollback, if ever needed, is the verbatim
-- USING clause above.

-- Bank details for hosts
create table if not exists bank_details (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  bank text not null,
  account_holder text not null,
  account_number text not null,
  branch_code text not null,
  account_type text not null default 'Cheque / Current',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table bank_details enable row level security;
create policy "Hosts can manage own bank details" on bank_details for all using (auth.uid() = user_id);

-- Host listings
create table if not exists hosts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  display_name text not null,
  bio text,
  avatar_url text,
  location_name text,
  latitude float,
  longitude float,
  business_type text not null default 'home',
  photos text[] default '{}',
  price_per_bag_per_day integer not null default 60,
  max_bags integer not null default 4,
  available_from text default '08:00',
  available_until text default '20:00',
  available_days text[] default '{Mon,Tue,Wed,Thu,Fri,Sat,Sun}',
  rating float default 0,
  review_count integer default 0,
  response_rate integer default 100,
  is_active boolean default true,
  created_at timestamptz default now()
);
alter table hosts enable row level security;
create policy "Hosts are publicly viewable" on hosts for select using (true);
create policy "Hosts can manage own listing" on hosts for all using (auth.uid() = user_id);

-- Bookings
create table if not exists bookings (
  id uuid default gen_random_uuid() primary key,
  traveller_id uuid references auth.users(id) on delete cascade not null,
  host_id uuid references hosts(id) not null,
  drop_off_date text not null,
  drop_off_time text not null,
  pick_up_date text not null,
  pick_up_time text not null,
  bag_count integer not null default 1,
  total_price integer not null,
  status text not null default 'confirmed',
  pin_code text not null,
  created_at timestamptz default now()
);
alter table bookings enable row level security;
create policy "Travellers can view own bookings" on bookings for select using (auth.uid() = traveller_id);
create policy "Travellers can create bookings" on bookings for insert with check (auth.uid() = traveller_id);
create policy "Hosts can view bookings for their listing" on bookings for select using (
  exists (select 1 from hosts where hosts.id = bookings.host_id and hosts.user_id = auth.uid())
);

-- Reviews
create table if not exists reviews (
  id uuid default gen_random_uuid() primary key,
  booking_id uuid references bookings(id) on delete cascade not null unique, -- one review per booking
  reviewer_id uuid references auth.users(id) on delete cascade not null,
  host_id uuid references hosts(id) not null,
  reviewer_name text not null,
  reviewer_avatar_url text, -- denormalized snapshot of profiles.avatar_url at submission time, same model as reviewer_name — see migration block below
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  tags text[] default '{}',
  created_at timestamptz default now()
);
alter table reviews enable row level security;
create policy "Reviews are publicly viewable" on reviews for select using (true);
create policy "Travellers can create reviews" on reviews for insert with check (auth.uid() = reviewer_id);

-- Function: recalculate host rating + review_count after any review insert/delete
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

create trigger trg_recalculate_host_rating
after insert or delete on reviews
for each row execute function recalculate_host_rating();

-- -------------------------------------------------------------------------
-- Payment & payout additions
-- -------------------------------------------------------------------------

-- Host bank details (keyed by host listing id)
CREATE TABLE IF NOT EXISTS host_bank_details (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id UUID REFERENCES hosts(id) ON DELETE CASCADE,
  account_holder TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'Cheque',
  branch_code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE host_bank_details ENABLE ROW LEVEL SECURITY;
-- Hosts can only manage bank details for their own listing.
-- Matches hosts.user_id (self-registered) or hosts.assigned_user_id (admin-assigned) —
-- every other host-facing screen resolves ownership via both columns.
-- Admin reads go through the admin-bank-details Edge Function (service role).
CREATE POLICY "Hosts can manage own bank details" ON host_bank_details
  FOR ALL USING (
    host_id IN (SELECT id FROM hosts WHERE user_id = auth.uid() OR assigned_user_id = auth.uid())
  );

-- Payment & payout columns on bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS checkout_id TEXT,
  ADD COLUMN IF NOT EXISTS host_payout_amount DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS cubby_amount DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS payout_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payout_id TEXT;

-- PayFast payment/completion columns — confirmed live via direct database
-- inspection (2026-07-20) but never previously committed here; schema.sql
-- had drifted from the real database. Read/written by payfast-itn,
-- payfast-cancel, payfast-create, and complete-booking.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'payfast',
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failure_reason TEXT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Booking lifecycle redesign (Phase 1) — host-confirmation gate, decline/
-- expiry tracking, and manual-refund tracking. See PROJECT_MASTER_PLAN.md
-- for the full state machine. Columns only in this phase — no code reads
-- or writes them yet; they're activated in later phases.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS host_response_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refund_status TEXT,
  ADD COLUMN IF NOT EXISTS refund_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refund_reference TEXT,
  ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expired_at TIMESTAMPTZ;

DO $$ BEGIN
  ALTER TABLE bookings
    ADD CONSTRAINT bookings_refund_status_check
    CHECK (refund_status IS NULL OR refund_status IN ('pending_manual', 'refunded'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Server-verified admin role, replacing the client-embedded ADMIN_SECRET
-- pattern for new admin functions going forward (see PROJECT_MASTER_PLAN.md).
-- Existing admin-* functions are not migrated in this change — tracked
-- separately as a pre-existing gap, not introduced by this work.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- Saved spots (travellers bookmarking hosts)
CREATE TABLE IF NOT EXISTS saved_spots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  host_id UUID REFERENCES hosts(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, host_id)
);
ALTER TABLE saved_spots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own saved spots" ON saved_spots FOR ALL USING (auth.uid() = user_id);

-- Partner applications
CREATE TABLE IF NOT EXISTS partner_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  business_name TEXT,
  business_type TEXT,
  location TEXT,
  storage_capacity INTEGER,
  available_hours TEXT,
  message TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE partner_applications ENABLE ROW LEVEL SECURITY;
-- Public INSERT: anyone can submit a partner application (no auth required)
CREATE POLICY "Anyone can submit a partner application" ON partner_applications FOR INSERT WITH CHECK (true);
-- No public SELECT: admin reads go through service-role Edge Functions only

-- Allow travellers to update their own bookings (needed for cancellation)
CREATE POLICY "Travellers can update own bookings" ON bookings FOR UPDATE USING (auth.uid() = traveller_id);

-- Allow hosts to update bookings for their own listing (accept / decline / complete)
CREATE POLICY "Hosts can update bookings for their listing" ON bookings FOR UPDATE
  USING (host_id IN (SELECT id FROM hosts WHERE user_id = auth.uid()));

-- -------------------------------------------------------------------------
-- Security sprint migrations (run these in Supabase SQL editor if the DB
-- already exists — the CREATE TABLE above won't re-run on an existing DB)
-- -------------------------------------------------------------------------

-- Fix 1: host_bank_details — drop the open-to-all policy, replace with owner-only
-- DROP POLICY IF EXISTS "Admins can manage bank details" ON host_bank_details;
-- CREATE POLICY "Hosts can manage own bank details" ON host_bank_details
--   FOR ALL USING (host_id IN (SELECT id FROM hosts WHERE user_id = auth.uid()));

-- Fix 2: partner_applications — drop the open SELECT policy
-- DROP POLICY IF EXISTS "Admins can view all applications" ON partner_applications;

-- Fix 3 (Sprint 3): host_bank_details RLS only matched hosts.user_id, but every
-- host-facing screen resolves ownership via assigned_user_id (admin-assigned hosts)
-- as well. Hosts using the self-service bank-details screen with an assigned_user_id
-- host row would be silently blocked by RLS from saving their own bank details.
-- RUN THIS ON EXISTING DATABASES:
-- DROP POLICY IF EXISTS "Hosts can manage own bank details" ON host_bank_details;
-- CREATE POLICY "Hosts can manage own bank details" ON host_bank_details
--   FOR ALL USING (host_id IN (SELECT id FROM hosts WHERE user_id = auth.uid() OR assigned_user_id = auth.uid()));

-- -------------------------------------------------------------------------
-- Avatar storage — run these in Supabase SQL editor / Storage dashboard
-- -------------------------------------------------------------------------
-- 1. Create the bucket (Supabase dashboard → Storage → New bucket):
--      Name: avatars
--      Public: true
--      Allowed MIME types: image/jpeg, image/png, image/webp, image/gif
--      Max file size: 5 MB
--
-- 2. Storage RLS policies (run in SQL editor):
--
-- INSERT: authenticated users can upload to their own folder
-- CREATE POLICY "Users can upload own avatar"
--   ON storage.objects FOR INSERT
--   TO authenticated
--   WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
--
-- UPDATE: authenticated users can replace their own avatar
-- CREATE POLICY "Users can update own avatar"
--   ON storage.objects FOR UPDATE
--   TO authenticated
--   USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
--
-- SELECT: anyone can read avatars (bucket is public)
-- CREATE POLICY "Anyone can read avatars"
--   ON storage.objects FOR SELECT
--   TO public
--   USING (bucket_id = 'avatars');
--
-- DELETE: users can delete their own avatar
-- CREATE POLICY "Users can delete own avatar"
--   ON storage.objects FOR DELETE
--   TO authenticated
--   USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- -------------------------------------------------------------------------
-- Messaging tables
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL UNIQUE,
  traveller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  host_id UUID REFERENCES hosts(id) ON DELETE CASCADE NOT NULL,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- Support messages table
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS support_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- Phase 1: host ownership via assigned_user_id
-- -------------------------------------------------------------------------
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES auth.users(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_host_approved BOOLEAN DEFAULT FALSE;

-- -------------------------------------------------------------------------
-- Reviewer avatar snapshot on reviews (public listing page reviewer photos)
-- -------------------------------------------------------------------------
-- Same denormalized-snapshot model as reviewer_name — avoids any new
-- cross-user profiles RLS surface on the public host-detail.tsx review
-- list. Written once at submission time from the reviewer's own (self-read)
-- profiles row. See supabase/REVIEWER_AVATAR_SNAPSHOT.sql for the existing-
-- rows backfill (run separately, after this column exists).
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reviewer_avatar_url TEXT;

-- -------------------------------------------------------------------------
-- RLS FIX: bookings — hosts must be readable by assigned_user_id too
-- -------------------------------------------------------------------------
-- (Run the migration SQL block below in Supabase SQL editor)

-- -------------------------------------------------------------------------
-- Verifications table (Phase 1 — Operations Centre)
-- -------------------------------------------------------------------------
-- MANUAL STEP: Run this block in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id_photo_url TEXT,   -- 7-day signed URL generated at upload time
  selfie_url TEXT,     -- 7-day signed URL generated at upload time
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

-- One pending verification per user (upsert on user_id)
CREATE UNIQUE INDEX IF NOT EXISTS verifications_user_id_unique ON verifications (user_id);

ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;

-- Travellers can submit and read their own verification
CREATE POLICY "Users can insert own verification"
  ON verifications FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own verification"
  ON verifications FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own verification (needed for re-submission after rejection)
CREATE POLICY "Users can update own verification"
  ON verifications FOR UPDATE USING (auth.uid() = user_id);

-- NOTE: The above UPDATE policy also allows admin to approve/reject verifications
-- because the admin runs in the same browser session as the logged-in traveller user.
-- For a multi-user admin system, replace with a service-role edge function.

-- -------------------------------------------------------------------------
-- Storage bucket for verifications (MANUAL — Supabase Dashboard)
-- -------------------------------------------------------------------------
-- 1. Go to Storage → New bucket
-- 2. Name: verifications
-- 3. Public access: OFF (private)
-- 4. After creating, add these storage policies in Dashboard → Storage → verifications → Policies:

-- Policy: Users can upload to their own folder
-- INSERT: (auth.uid() = (storage.foldername(name))[1]::uuid)

-- Policy: Users can read their own files
-- SELECT: (auth.uid() = (storage.foldername(name))[1]::uuid)

-- Policy: Users can overwrite their own files (for re-submission)
-- UPDATE: (auth.uid() = (storage.foldername(name))[1]::uuid)

-- Storage path format: verifications/{user_id}/id.jpg
--                      verifications/{user_id}/selfie.jpg

-- -------------------------------------------------------------------------
-- Traveller reviews (host reviews traveller after a booking)
-- -------------------------------------------------------------------------
-- MANUAL STEP: Run this block in Supabase SQL Editor if the table doesn't exist

CREATE TABLE IF NOT EXISTS traveller_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL UNIQUE,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  host_id UUID REFERENCES hosts(id) ON DELETE CASCADE NOT NULL,
  traveller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  host_name TEXT NOT NULL,
  rating_respectful INTEGER NOT NULL CHECK (rating_respectful >= 1 AND rating_respectful <= 5),
  rating_on_time INTEGER NOT NULL CHECK (rating_on_time >= 1 AND rating_on_time <= 5),
  rating_communication INTEGER NOT NULL CHECK (rating_communication >= 1 AND rating_communication <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE traveller_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read traveller reviews (used on admin + traveller profile views)
CREATE POLICY "Traveller reviews are publicly viewable"
  ON traveller_reviews FOR SELECT USING (true);

-- Only the host (matched via auth.uid()) can insert a traveller review
CREATE POLICY "Hosts can create traveller reviews"
  ON traveller_reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- Trigger: recalculate traveller's average rating after a review is inserted/deleted
CREATE OR REPLACE FUNCTION recalculate_traveller_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  target_traveller_id UUID;
  avg_respectful NUMERIC;
  avg_on_time NUMERIC;
  avg_communication NUMERIC;
  overall_avg NUMERIC;
BEGIN
  target_traveller_id := COALESCE(NEW.traveller_id, OLD.traveller_id);

  SELECT
    COALESCE(ROUND(AVG(rating_respectful)::NUMERIC, 1), 0),
    COALESCE(ROUND(AVG(rating_on_time)::NUMERIC, 1), 0),
    COALESCE(ROUND(AVG(rating_communication)::NUMERIC, 1), 0)
  INTO avg_respectful, avg_on_time, avg_communication
  FROM traveller_reviews
  WHERE traveller_id = target_traveller_id;

  overall_avg := ROUND(((avg_respectful + avg_on_time + avg_communication) / 3)::NUMERIC, 1);

  -- Update traveller_rating on profiles (column added below if needed)
  UPDATE profiles
  SET traveller_rating = overall_avg,
      traveller_review_count = (SELECT COUNT(*) FROM traveller_reviews WHERE traveller_id = target_traveller_id)
  WHERE id = target_traveller_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_recalculate_traveller_rating
AFTER INSERT OR DELETE ON traveller_reviews
FOR EACH ROW EXECUTE FUNCTION recalculate_traveller_rating();

-- Add traveller_rating + traveller_review_count to profiles (safe — no-op if already present)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS traveller_rating NUMERIC(3,1) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS traveller_review_count INTEGER DEFAULT 0;

-- -------------------------------------------------------------------------
-- Fix 4 (Sprint 5 launch audit): messaging RLS
-- -------------------------------------------------------------------------
-- `conversations` and `messages` had ENABLE ROW LEVEL SECURITY with ZERO
-- policies committed anywhere in this repo. If nothing was added directly
-- in the Dashboard, RLS with no policies means deny-all for anon/
-- authenticated roles (messaging would be totally broken, not insecure).
-- If something WAS added out-of-band in the Dashboard, its correctness was
-- never verified — the client code (chat.tsx) derives conversation
-- participants from a booking id with no ownership check of its own, so it
-- relies entirely on RLS being correct. Run the verification queries in
-- RLS_VERIFICATION.sql (same folder) BEFORE and AFTER applying this to
-- confirm what the actual live behavior was, and that this fixes it.
--
-- Safe to run even if equivalent policies already exist under different
-- names — this only touches policies with these exact names.

DROP POLICY IF EXISTS "Participants can read own conversations" ON conversations;
CREATE POLICY "Participants can read own conversations" ON conversations
  FOR SELECT USING (
    auth.uid() = traveller_id
    OR auth.uid() IN (
      SELECT COALESCE(assigned_user_id, user_id) FROM hosts WHERE id = conversations.host_id
    )
  );

DROP POLICY IF EXISTS "Participants can create own conversations" ON conversations;
CREATE POLICY "Participants can create own conversations" ON conversations
  FOR INSERT WITH CHECK (
    auth.uid() = traveller_id
    OR auth.uid() IN (
      SELECT COALESCE(assigned_user_id, user_id) FROM hosts WHERE id = conversations.host_id
    )
  );

DROP POLICY IF EXISTS "Participants can update own conversations" ON conversations;
CREATE POLICY "Participants can update own conversations" ON conversations
  FOR UPDATE USING (
    auth.uid() = traveller_id
    OR auth.uid() IN (
      SELECT COALESCE(assigned_user_id, user_id) FROM hosts WHERE id = conversations.host_id
    )
  );

DROP POLICY IF EXISTS "Participants can read messages in own conversations" ON messages;
CREATE POLICY "Participants can read messages in own conversations" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (
          c.traveller_id = auth.uid()
          OR c.host_id IN (SELECT id FROM hosts WHERE assigned_user_id = auth.uid() OR user_id = auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS "Participants can send messages in own conversations" ON messages;
CREATE POLICY "Participants can send messages in own conversations" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (
          c.traveller_id = auth.uid()
          OR c.host_id IN (SELECT id FROM hosts WHERE assigned_user_id = auth.uid() OR user_id = auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS "Participants can mark messages as read" ON messages;
CREATE POLICY "Participants can mark messages as read" ON messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (
          c.traveller_id = auth.uid()
          OR c.host_id IN (SELECT id FROM hosts WHERE assigned_user_id = auth.uid() OR user_id = auth.uid())
        )
    )
  );

-- -------------------------------------------------------------------------
-- Fix 5 (Sprint 5 launch audit): hosts — self-service INSERT was possible
-- -------------------------------------------------------------------------
-- "Hosts can manage own listing" was FOR ALL USING (auth.uid() = user_id).
-- Postgres applies a FOR ALL policy's USING clause as the WITH CHECK clause
-- too when no WITH CHECK is given — so on INSERT, it only verified the new
-- row's user_id equalled auth.uid(). Any signed-in user could satisfy that
-- by inserting a row with their own id as user_id, creating a live, publicly
-- visible host listing with zero admin approval — bypassing the entire
-- admin-hosts create/assign flow. Confirmed live via RLS_VERIFICATION.sql
-- block #3 (2026-07-07): an ordinary traveller account's INSERT succeeded
-- with no policy error.
--
-- Host creation/assignment only happens through the ADMIN_SECRET-gated
-- admin-hosts edge function, which uses the service-role key and bypasses
-- RLS entirely — removing self-service INSERT here does not affect it.
-- Self-service editing (host-profile.tsx, dashboard.tsx toggling is_active)
-- still works: admin-hosts always sets user_id and assigned_user_id to the
-- same value together (both its `create` and `assign` actions), so the
-- UPDATE policy below still matches every existing host's own account.
-- Confirmed via grep: no client-side code anywhere in app/ or src/ calls
-- `.from('hosts').insert(...)` or `.from('hosts').delete(...)` — both only
-- happen server-side in admin-hosts (service role), so no legitimate path
-- is broken by removing self-service INSERT/DELETE policies.

DROP POLICY IF EXISTS "Hosts can manage own listing" ON hosts;

DROP POLICY IF EXISTS "Hosts can update own listing" ON hosts;
CREATE POLICY "Hosts can update own listing" ON hosts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Hosts can delete own listing" ON hosts;
CREATE POLICY "Hosts can delete own listing" ON hosts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Deliberately no INSERT policy for the authenticated/anon roles — with no
-- permissive INSERT policy, RLS denies all direct INSERTs into hosts by
-- default. SELECT is unaffected: "Hosts are publicly viewable" (line 56)
-- already grants public SELECT independently of this policy.

-- -------------------------------------------------------------------------
-- Fix 6 (Sprint 5 launch audit, continued): hosts — "Admin can manage all
-- hosts" was a dead-simple bypass, not a real admin check
-- -------------------------------------------------------------------------
-- Discovered by querying pg_policies directly against production (this
-- policy was never in this repo — added out-of-band in the Dashboard).
-- It read: FOR ALL, roles {public}, USING (true), WITH CHECK (true).
-- Despite the name, it checks nothing about the caller — `true` grants
-- every command (SELECT/INSERT/UPDATE/DELETE) to every role, including
-- ordinary signed-in travellers. This is why Fix 5 alone didn't close
-- RLS_VERIFICATION.sql block #3: Postgres OR-combines permissive
-- policies, so this one alone still let the INSERT through regardless
-- of what Fix 5 changed.
--
-- There is no admin identity at the database level in this project at
-- all — admin access is a client-side PIN (checkAdminSession(),
-- AsyncStorage-based) with zero corresponding auth.uid()/claim, so no
-- RLS policy can actually distinguish "the founder's account" from any
-- other authenticated user. Real admin mutations on hosts already go
-- through the service-role admin-hosts edge function (bypasses RLS
-- entirely, gated by ADMIN_SECRET instead) — this policy was pure
-- unused risk, not a working feature. The one remaining direct client
-- write to hosts from an admin screen (app/(admin)/verifications.tsx,
-- syncing owner_is_verified after approving an ID verification) has
-- been migrated onto the same admin-hosts edge function pattern
-- (owner_is_verified added to ALLOWED_HOST_FIELDS) as part of this fix,
-- so nothing depends on this policy anymore.

DROP POLICY IF EXISTS "Admin can manage all hosts" ON hosts;

-- -------------------------------------------------------------------------
-- Fix 7 (Sprint 5 launch audit, continued): bookings — same fake-admin
-- policy pattern as Fix 6, on a more sensitive table
-- -------------------------------------------------------------------------
-- Discovered the same way as Fix 6: RLS_VERIFICATION.sql block #5 showed
-- a non-host traveller account (1 real booking of its own) could see 8 of
-- the platform's 8 total bookings. `bookings` already has correctly scoped
-- policies committed in this file ("Travellers can view own bookings",
-- "Hosts can view bookings for their listing") — neither explains the
-- leak. Querying pg_policies live turned up a third, undocumented one:
-- "Admin can view all bookings" — FOR ALL, roles {public}, USING (true).
-- Same shape as the hosts bug: the name implies an admin check, `true`
-- performs none, and there is no admin identity at the database level in
-- this project to check against anyway (see Fix 6 for the full reasoning).
--
-- Before dropping it, audited every direct client-side read of bookings
-- to confirm nothing legitimately depended on it. Found one:
-- app/(admin)/dashboard.tsx read all bookings directly (for stats +
-- recent-activity widgets) using the admin's own session — the other two
-- admin bookings screens (all-bookings.tsx, revenue.tsx) were already
-- migrated onto the service-role admin-bookings edge function back in the
-- original Sprint 5 pass, dashboard.tsx was simply missed at the time.
-- Migrated it onto the same admin-bookings edge function here. The one
-- other direct read (src/lib/review-service.ts, fetching a booking's
-- host_id to send a reciprocal review prompt) is called by the host who
-- owns that booking, already covered by "Hosts can view bookings for
-- their listing" — unaffected by this policy either way.

DROP POLICY IF EXISTS "Admin can view all bookings" ON bookings;

-- -------------------------------------------------------------------------
-- Fix 8 (regression, found immediately after Fix 7 deployed): travellers
-- could no longer cancel their own bookings
-- -------------------------------------------------------------------------
-- schema.sql has always defined "Travellers can update own bookings" (see
-- the CREATE TABLE bookings section above), but a live pg_policies query
-- during the Fix 7 investigation showed it was never actually applied to
-- production — only 5 policies existed on bookings, and this wasn't one
-- of them. The only thing granting UPDATE to a traveller cancelling their
-- own booking was the incidental side effect of "Admin can view all
-- bookings" being FOR ALL (not just SELECT) with USING (true). Fix 7
-- correctly closed the read-visibility leak that policy caused, but
-- removing a FOR ALL policy removes all four commands it covered, not
-- just the one the audit was focused on (SELECT) — so it silently took
-- traveller cancellation down with it. The client's cancelBooking() never
-- checked the update's error, so the failure was invisible: the booking
-- simply stayed in "confirmed" and never moved to Past.
--
-- This restores exactly the access travellers need — nothing broader —
-- so it doesn't reopen the Fix 7 leak. Host-side booking updates
-- ("Hosts can update bookings for their listing") and completed bookings
-- (set via the service-role complete-booking edge function, which
-- bypasses RLS) are both untouched by this and by Fix 7.

DROP POLICY IF EXISTS "Travellers can update own bookings" ON bookings;
CREATE POLICY "Travellers can update own bookings" ON bookings
  FOR UPDATE USING (auth.uid() = traveller_id);

-- -------------------------------------------------------------------------
-- Booking lifecycle redesign — Phase 4: trusted server-side transitions
-- -------------------------------------------------------------------------
-- Six Postgres functions (SECURITY DEFINER) are the only things allowed to
-- move a booking out of `awaiting_host_confirmation`. No React Native
-- screen writes to `bookings.status`, `refund_status`, or any deadline
-- column directly for this state — see PROJECT_MASTER_PLAN.md and the
-- Phase 4 sequence-diagram review for the full design rationale.
--
-- Every function below follows the same guarded-UPDATE pattern used since
-- payfast-itn: `UPDATE ... WHERE <starting state>` either succeeds and
-- returns the new row, or matches zero rows, in which case a follow-up
-- SELECT determines *why* (not found / not owner / wrong status / deadline
-- passed) purely to shape a useful response — the guarded UPDATE itself,
-- not that follow-up SELECT, is what makes concurrent calls safe. Two
-- racing calls against the same row are serialized by ordinary Postgres
-- row-level locking: whichever UPDATE's WHERE clause matches first commits
-- first, and the second transaction's WHERE clause no longer matches the
-- now-committed row, so it cleanly returns a "no rows" response instead of
-- a second transition. This was verified locally with two genuinely
-- concurrent sessions racing a decline against a cancel on the same row —
-- not just asserted from reading the SQL.
--
-- All deadline comparisons use the database's own now() inside the
-- function body, never a client-supplied timestamp — this is exactly why
-- these are Postgres functions rather than plain PostgREST `.update()`
-- calls from an Edge Function: Supabase's REST filter builder can only
-- compare a column to a value the caller sends, which would reopen the
-- clock-skew risk this design has avoided from the start.
--
-- Known pre-existing gap, not fixed here: the existing RLS policy "Hosts
-- can update bookings for their listing" (above) only checks
-- hosts.user_id, not hosts.assigned_user_id, so an admin-assigned host
-- cannot update bookings via plain RLS. These six functions are all
-- SECURITY DEFINER and perform their own ownership check internally
-- (checking both user_id and assigned_user_id), so they are unaffected by
-- that gap — but the underlying RLS policy itself still has it, for any
-- future direct-write code path that might rely on it.

-- accept_booking(p_booking_id) — host accepts within the response window.
-- Guard: status = 'awaiting_host_confirmation' AND host_response_deadline
-- IS NOT NULL AND host_response_deadline > now(). The deadline condition
-- (not just status) is deliberate: it makes the deadline authoritative
-- rather than depending on how promptly the expiry sweep runs — an accept
-- can never land during the gap between the true deadline and the next
-- sweep invocation.
CREATE OR REPLACE FUNCTION accept_booking(p_booking_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking bookings;
  v_is_owner boolean;
BEGIN
  UPDATE bookings b
  SET status = 'confirmed'
  WHERE b.id = p_booking_id
    AND b.status = 'awaiting_host_confirmation'
    AND b.host_response_deadline IS NOT NULL
    AND b.host_response_deadline > now()
    AND b.host_id IN (
      SELECT id FROM hosts WHERE user_id = auth.uid() OR assigned_user_id = auth.uid()
    )
  RETURNING * INTO v_booking;

  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'booking', to_jsonb(v_booking));
  END IF;

  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM hosts
    WHERE id = v_booking.host_id AND (user_id = auth.uid() OR assigned_user_id = auth.uid())
  ) INTO v_is_owner;
  IF NOT v_is_owner THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_owner');
  END IF;

  IF v_booking.status <> 'awaiting_host_confirmation' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_resolved', 'status', v_booking.status);
  END IF;

  -- Only remaining possibility: status still matches but the deadline
  -- condition didn't (missing or already elapsed).
  RETURN jsonb_build_object('ok', false, 'reason', 'deadline_passed');
END;
$$;

-- decline_booking(p_booking_id) — host declines within the response window.
-- Same deadline-authoritative guard as accept_booking. Status, declined_at,
-- and the refund-queue fields are written in the SAME guarded UPDATE — a
-- decline can never land without its refund obligation recorded alongside
-- it in one atomic statement.
CREATE OR REPLACE FUNCTION decline_booking(p_booking_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking bookings;
  v_is_owner boolean;
BEGIN
  UPDATE bookings b
  SET status = 'declined',
      declined_at = now(),
      refund_status = 'pending_manual',
      refund_requested_at = now()
  WHERE b.id = p_booking_id
    AND b.status = 'awaiting_host_confirmation'
    AND b.host_response_deadline IS NOT NULL
    AND b.host_response_deadline > now()
    AND b.host_id IN (
      SELECT id FROM hosts WHERE user_id = auth.uid() OR assigned_user_id = auth.uid()
    )
  RETURNING * INTO v_booking;

  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'booking', to_jsonb(v_booking));
  END IF;

  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM hosts
    WHERE id = v_booking.host_id AND (user_id = auth.uid() OR assigned_user_id = auth.uid())
  ) INTO v_is_owner;
  IF NOT v_is_owner THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_owner');
  END IF;

  IF v_booking.status <> 'awaiting_host_confirmation' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_resolved', 'status', v_booking.status);
  END IF;

  RETURN jsonb_build_object('ok', false, 'reason', 'deadline_passed');
END;
$$;

-- cancel_awaiting_booking(p_booking_id) — traveller cancels while still
-- awaiting host confirmation. Guard is deliberately status-only (no
-- deadline condition): the client-side countdown is display-only and must
-- never decide whether cancellation is allowed, and a traveller should be
-- able to cancel regardless of how close to (or past) the deadline the
-- booking is, right up until the moment it actually transitions away from
-- this state.
--
-- Three distinct outcomes on a non-match, not one generic "already
-- handled": already expired/declined/cancelled is a harmless idempotent
-- no-op (ok:true) since there's nothing left to do; already confirmed is a
-- genuine refusal (ok:false) — this function intentionally does not handle
-- cancelling a confirmed booking, that stays on the existing, untouched
-- cancelBooking() direct-write path in app/(traveller)/bookings.tsx for now.
CREATE OR REPLACE FUNCTION cancel_awaiting_booking(p_booking_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking bookings;
BEGIN
  UPDATE bookings b
  SET status = 'cancelled',
      refund_status = 'pending_manual',
      refund_requested_at = now()
  WHERE b.id = p_booking_id
    AND b.status = 'awaiting_host_confirmation'
    AND b.traveller_id = auth.uid()
  RETURNING * INTO v_booking;

  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'booking', to_jsonb(v_booking));
  END IF;

  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  IF v_booking.traveller_id <> auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_owner');
  END IF;

  IF v_booking.status = 'confirmed' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'refused_confirmed', 'status', v_booking.status);
  END IF;

  RETURN jsonb_build_object('ok', true, 'reason', 'already_resolved',
                             'status', v_booking.status, 'booking', to_jsonb(v_booking));
END;
$$;

-- expire_overdue_booking(p_booking_id) — the ONE authoritative expiry
-- transition. p_booking_id NULL sweeps every eligible row (used by the
-- scheduled booking-expiry-sweep Edge Function); a specific id scopes the
-- identical guarded UPDATE to that one row (used by check_booking_expiry
-- below). Nothing about this transition exists anywhere else — both
-- callers share this exact implementation, not a re-implementation of it.
--
-- Eligibility is deliberately conservative: a NULL host_response_deadline
-- can never match `host_response_deadline <= now()`, so a booking with no
-- deadline set is never treated as expired. This mirrors the same rule the
-- dormant Phase 2/3 UI already enforces on the display side.
--
-- Not directly callable by end users — see the REVOKE/GRANT block below.
CREATE OR REPLACE FUNCTION expire_overdue_booking(p_booking_id UUID DEFAULT NULL)
RETURNS SETOF bookings
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE bookings
  SET status = 'expired',
      expired_at = now(),
      refund_status = 'pending_manual',
      refund_requested_at = now()
  WHERE status = 'awaiting_host_confirmation'
    AND host_response_deadline IS NOT NULL
    AND host_response_deadline <= now()
    AND (p_booking_id IS NULL OR id = p_booking_id)
  RETURNING *;
$$;

-- check_booking_expiry(p_booking_id) — thin, ownership-checked wrapper
-- around expire_overdue_booking, for a client to call defensively when it
-- opens or refreshes a booking that looks overdue. Verifies the caller is
-- actually a party to this specific booking (the traveller, or the
-- listing's owning/assigned host), then delegates to the exact same
-- shared expiry implementation used by the scheduled sweep — this
-- function adds an authorization check, it does not add or duplicate any
-- transition logic.
CREATE OR REPLACE FUNCTION check_booking_expiry(p_booking_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row bookings;
  v_is_party boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM bookings b
    LEFT JOIN hosts h ON h.id = b.host_id
    WHERE b.id = p_booking_id
      AND (b.traveller_id = auth.uid() OR h.user_id = auth.uid() OR h.assigned_user_id = auth.uid())
  ) INTO v_is_party;

  IF NOT v_is_party THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_owner');
  END IF;

  SELECT * INTO v_row FROM expire_overdue_booking(p_booking_id);
  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'expired', true, 'booking', to_jsonb(v_row));
  END IF;
  RETURN jsonb_build_object('ok', true, 'expired', false);
END;
$$;

-- mark_refunded(p_booking_id, p_refund_reference) — admin closes out a
-- queued manual refund. Gated on profiles.is_admin = true, checked via
-- auth.uid() inside the function body — replacing the client-embedded
-- ADMIN_SECRET pattern for this function specifically, per the Phase 1
-- decision. No service-role key or admin secret is ever sent to or stored
-- in the client for this to work.
CREATE OR REPLACE FUNCTION mark_refunded(p_booking_id UUID, p_refund_reference TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking bookings;
  v_is_admin boolean;
BEGIN
  SELECT COALESCE((SELECT is_admin FROM profiles WHERE id = auth.uid()), false) INTO v_is_admin;
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_admin');
  END IF;

  UPDATE bookings b
  SET refund_status = 'refunded',
      refunded_at = now(),
      refund_reference = p_refund_reference
  WHERE b.id = p_booking_id
    AND b.refund_status = 'pending_manual'
  RETURNING * INTO v_booking;

  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'booking', to_jsonb(v_booking));
  END IF;

  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  RETURN jsonb_build_object('ok', false, 'reason', 'already_resolved', 'refund_status', v_booking.refund_status);
END;
$$;

-- Grants: everything except expire_overdue_booking is callable directly by
-- any authenticated user (each function performs its own ownership/role
-- check internally, exactly like RLS-backed tables would, just enforced in
-- the function body instead). expire_overdue_booking is deliberately
-- restricted to service_role only — the scheduled sweep is the one caller
-- allowed to invoke it with no per-row ownership check, since it runs with
-- no end user attached. A normal authenticated client can only reach it
-- indirectly through check_booking_expiry's ownership check above. This
-- was verified locally: a non-privileged role attempting to call
-- expire_overdue_booking directly gets a Postgres insufficient_privilege
-- error, not a silent bypass.
REVOKE ALL ON FUNCTION accept_booking(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION decline_booking(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION cancel_awaiting_booking(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION expire_overdue_booking(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION check_booking_expiry(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION mark_refunded(UUID, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION accept_booking(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION decline_booking(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_awaiting_booking(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_booking_expiry(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_refunded(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION expire_overdue_booking(UUID) TO service_role;

-- -------------------------------------------------------------------------
-- Booking lifecycle redesign — Phase 5: PayFast payment confirmation
-- -------------------------------------------------------------------------
-- A successful PayFast ITN no longer transitions a booking straight to
-- 'confirmed'. It transitions to 'awaiting_host_confirmation' and starts
-- the host-response clock — the same gate every other entry into that
-- state goes through. `payfast-itn` calls this RPC instead of writing to
-- `bookings` directly; see supabase/functions/payfast-itn/index.ts.
--
-- Diagnostic query to run before applying the UNIQUE constraint below, in
-- case any live data already has a duplicate payment_reference (would
-- otherwise make the ALTER TABLE fail):
--   SELECT payment_reference, COUNT(*) FROM bookings
--   WHERE payment_reference IS NOT NULL
--   GROUP BY payment_reference HAVING COUNT(*) > 1;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_payment_reference_unique UNIQUE (payment_reference);

-- payment_provider allowlist: confirm_booking_payment takes p_payment_provider
-- as a plain TEXT argument from whichever Edge Function calls it, so the
-- column itself is the enforcement point rather than trusting each caller —
-- the same defense-in-depth shape as the guarded UPDATE + restricted GRANT
-- already used for every trusted transition. 'payfast' (payfast-create,
-- app/(traveller)/booking.tsx, and confirm_booking_payment's own default)
-- and 'peach' (payment-webhook, payment-result) are the values actually
-- written today; 'paygate' is added ahead of the paygate-* Edge Functions
-- (not yet built) so the schema change and the code change can land as
-- separate, independently reviewable steps. NULL stays allowed for
-- pre-payment rows. DROP+ADD (rather than a bare ADD CONSTRAINT) makes this
-- safe to re-run AND lets the allowlist actually change on a second run,
-- unlike a duplicate_object-guarded DO block, which would silently keep
-- whatever definition already existed.
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_payment_provider_check;
ALTER TABLE bookings
  ADD CONSTRAINT bookings_payment_provider_check
  CHECK (payment_provider IS NULL OR payment_provider IN ('payfast', 'peach', 'paygate'));

-- paygate_pay_request_id: PayGate's PAY_REQUEST_ID, stored between
-- paygate-initiate and paygate-notify/paygate-return. Not just a
-- convenience — PayGate's own docs confirm PAY_REQUEST_ID is a required
-- field for query.trans (the reconciliation fallback when notify/return
-- is missed), and paygate-return's checksum can only be validated by
-- looking up our own REFERENCE/PAYGATE_ID via this column first, since
-- PayGate's return redirect carries PAY_REQUEST_ID + TRANSACTION_STATUS
-- only — not REFERENCE. Nullable, overwritten freely on a retried
-- initiate (no UNIQUE constraint, unlike payment_reference, which is only
-- ever set once by confirm_booking_payment after real confirmation).
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS paygate_pay_request_id TEXT;

-- confirm_booking_payment(p_booking_id, p_payment_reference, p_payment_provider)
-- — the one authoritative payment-confirmation transition, shared by every
-- payment provider's webhook (payfast-itn, and the legacy Peach
-- payment-webhook / payment-result, both hardened to call this instead of
-- writing to bookings directly — see those files under supabase/functions).
-- Guard is deliberately status-only (pending_payment), not an ownership
-- check: the caller here is a payment provider's server, not an
-- authenticated Cubby user — there is no auth.uid() to check. Authorization
-- instead comes entirely from the restricted GRANT below (service_role
-- only), the same pattern already used for expire_overdue_booking and for
-- the same reason: no end-user JWT exists in this call path.
--
-- p_payment_provider defaults to 'payfast' so the original payfast-itn call
-- site (which only ever passes the first two arguments) is unaffected;
-- Peach callers pass p_payment_provider := 'peach' explicitly so a Peach
-- payment is never mislabeled as a PayFast one.
--
-- host_response_deadline is derived from now() + a single hardcoded
-- interval (30 minutes, Private Beta value) — the only place this
-- duration is defined. paid_at also uses now(): PayFast's ITN payload
-- (m_payment_id, pf_payment_id, payment_status, amount_gross, amount_fee,
-- amount_net, custom_str1-5, custom_int1-5, name_first, name_last,
-- email_address, merchant_id, signature) has no payment timestamp field —
-- confirmed against PayFast's own documented parameter list and their
-- reference WHMCS integration, which itself uses the receiving server's
-- clock rather than anything from the payload. The same now()-based
-- approach is used for every provider for consistency, since none of
-- Peach's webhook payloads carry a timestamp either.
--
-- Idempotent by the same guarded-UPDATE mechanism as every other
-- transition: a duplicate/stale webhook call from any provider (PayFast
-- retries on anything but a prompt 200; Peach may retry similarly) resolves
-- to zero rows / already_resolved, never a second transition, never a
-- reset deadline or a resent notification (callers only notify when
-- ok = true). A payment_reference collision with a different booking (data
-- anomaly or replay) is caught explicitly via the UNIQUE constraint above
-- rather than silently succeeding or throwing a raw DB error.
CREATE OR REPLACE FUNCTION confirm_booking_payment(
  p_booking_id UUID,
  p_payment_reference TEXT,
  p_payment_provider TEXT DEFAULT 'payfast'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking bookings;
BEGIN
  UPDATE bookings b
  SET status = 'awaiting_host_confirmation',
      payment_provider = p_payment_provider,
      payment_reference = p_payment_reference,
      paid_at = now(),
      host_response_deadline = now() + interval '30 minutes'
  WHERE b.id = p_booking_id
    AND b.status = 'pending_payment'
  RETURNING * INTO v_booking;

  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'booking', to_jsonb(v_booking));
  END IF;

  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  RETURN jsonb_build_object('ok', false, 'reason', 'already_resolved', 'status', v_booking.status);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'reference_reused');
  WHEN check_violation THEN
    -- Almost certainly the bookings_payment_provider_check allowlist
    -- above (payment_reference has no CHECK, only the UNIQUE handled
    -- separately): an unrecognised p_payment_provider from a caller.
    -- Returned as a structured outcome, same as every other rejection
    -- here, rather than letting a raw Postgres error reach the caller.
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_provider');
END;
$$;

REVOKE ALL ON FUNCTION confirm_booking_payment(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION confirm_booking_payment(UUID, TEXT, TEXT) TO service_role;

-- The Phase 2/3 dormant Accept / Decline / Cancel buttons are wired to
-- accept_booking / decline_booking / cancel_awaiting_booking as part of
-- this same phase — see app/(host)/requests.tsx and
-- app/(traveller)/bookings.tsx. check_booking_expiry is wired as a
-- defensive, opportunistic check on both screens when a countdown's local
-- display reaches 'ended'. None of this makes the client-side call the
-- authority — every RPC re-validates its own guard server-side regardless
-- of what the client believed was true when it called.

-- -------------------------------------------------------------------------
-- Admin authentication hardening — server-side PIN + session tokens
-- -------------------------------------------------------------------------
-- Replaces two secrets that used to ship inside the client bundle —
-- EXPO_PUBLIC_ADMIN_PIN (gated the login screen) and
-- EXPO_PUBLIC_ADMIN_SECRET (gated every admin-* Edge Function call, i.e.
-- the actual data access — including every host's real bank account
-- details). Both were extractable from the shipped app/web bundle by
-- design of the EXPO_PUBLIC_ prefix. Neither replacement table below is
-- ever meant to be reached by a client role directly — RLS is enabled
-- with no policies (default-deny), the same convention already used
-- elsewhere in this schema for tables only service-role Edge Functions
-- should touch. All reads/writes happen from verify-admin-pin or the
-- shared supabase/functions/_shared/admin-session.ts helper the admin-*
-- functions all now call through — see that file for the session
-- lifecycle (issue, validate, revoke, opportunistic cleanup).

-- admin_login_attempts — append-only log, never updated in place. Rate
-- limiting is a COUNT(*) over the trailing window, not a read-modify-write
-- counter, so there's no lock contention or race to reason about. Rows
-- older than a day are opportunistically deleted on each login attempt
-- (see cleanupExpiredAdminAuth in the shared helper) — no scheduled job
-- needed for Private Beta scale.
CREATE TABLE IF NOT EXISTS admin_login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE admin_login_attempts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_ip_created_at
  ON admin_login_attempts (ip, created_at);

-- admin_sessions — the token itself is never stored, only its SHA-256
-- hash (token_hash is the primary key: a stolen row is useless without
-- the original random token, and lookup is a direct equality match, no
-- table scan). 60-minute lifetime for Private Beta, enforced by
-- expires_at, not by anything the client asserts.
CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash TEXT PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at
  ON admin_sessions (expires_at);
