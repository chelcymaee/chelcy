-- ============================================================================
-- Phase 4/5 production sync — bring production into alignment with
-- already-reviewed-and-merged code (PR #56-#58)
-- ============================================================================
-- Run this in the Supabase SQL Editor (Table Editor -> SQL Editor -> New
-- query -> paste this whole file -> Run).
--
-- Why this file exists: schema.sql already contains this exact SQL (it was
-- merged into the booking-lifecycle-redesign PRs), but a live check against
-- production on 2026-07-29 found none of the six functions below actually
-- exist there:
--
--   SELECT proname FROM pg_proc WHERE proname IN (
--     'confirm_booking_payment', 'accept_booking', 'decline_booking',
--     'mark_refunded', 'expire_overdue_booking', 'check_booking_expiry'
--   );
--   -- returned 0 rows
--
-- i.e. the code was reviewed and merged, but this section of schema.sql was
-- never actually pasted into production's SQL Editor and run — consistent
-- with PROJECT_MASTER_PLAN.md's own unchecked "run when ready to test" note
-- against the PayFast SQL migration. Nothing user-facing is broken by this
-- today (requests.tsx's legacy updateStatus() path, used for ordinary
-- `pending` bookings, does not depend on these functions), but every one of
-- these RPCs is required before any real payment (PayFast or PayGate) can
-- complete, or before a paid booking can be host-accepted/declined, or
-- before a queued refund can be closed out.
--
-- Scope: exactly the Phase 4 (trusted server-side transitions) and Phase 5
-- (payment confirmation) objects from schema.sql, and nothing else —
-- verbatim, byte-for-byte the same statements already reviewed and merged
-- there. Not included, and not needed here:
--   - the payment_provider allowlist CHECK and paygate_pay_request_id
--     column: already applied to production directly (PR #63, 2026-07-29)
--   - any PayGate-specific Edge Function or table: not started yet, and
--     explicitly out of scope for this sync
--   - the pre-existing schema.sql fresh-bootstrap ordering issue
--     (hosts.assigned_user_id referenced before it's added): unrelated,
--     tracked separately as tech debt, not touched here
--
-- Idempotency: every statement below is safe to run more than once. Column
-- additions use IF NOT EXISTS; CREATE OR REPLACE FUNCTION and REVOKE/GRANT
-- are inherently safe to repeat; the two constraints are wrapped in DO
-- blocks that swallow duplicate_object, matching the pattern schema.sql
-- already uses elsewhere (the ADD CONSTRAINT below is not written this way
-- in schema.sql itself — that version assumes a fresh table and would
-- error if the constraint already exists there; this copy adds the guard
-- so this script is safe to run without first knowing which pieces, if
-- any, already made it into production).
-- ============================================================================


-- ── Phase 1 support: columns + refund_status allowlist ──────────────────────
-- (accept_booking / decline_booking / cancel_awaiting_booking /
-- expire_overdue_booking / mark_refunded all read or write these.)

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


-- ── Phase 4: trusted server-side transitions ─────────────────────────────────

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

  RETURN jsonb_build_object('ok', false, 'reason', 'deadline_passed');
END;
$$;

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


-- ── Phase 5: payment confirmation ────────────────────────────────────────────
-- (payment_provider allowlist + paygate_pay_request_id are deliberately not
-- repeated here — already live in production as of PR #63.)

-- Diagnostic to run first if this errors with a uniqueness violation: some
-- live row already has a duplicate payment_reference.
--   SELECT payment_reference, COUNT(*) FROM bookings
--   WHERE payment_reference IS NOT NULL
--   GROUP BY payment_reference HAVING COUNT(*) > 1;
DO $$ BEGIN
  ALTER TABLE bookings
    ADD CONSTRAINT bookings_payment_reference_unique UNIQUE (payment_reference);
EXCEPTION
  -- A UNIQUE constraint creates a backing index, so re-adding one that
  -- already exists raises duplicate_table (the index name collision), not
  -- duplicate_object like a plain CHECK constraint does above — caught
  -- the hard way, by actually running this script twice against a real
  -- database rather than assuming the same guard works for both.
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_table THEN NULL;
END $$;

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
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_provider');
END;
$$;

REVOKE ALL ON FUNCTION confirm_booking_payment(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION confirm_booking_payment(UUID, TEXT, TEXT) TO service_role;


-- ── Verification — run after the above, paste results back ──────────────────

SELECT proname FROM pg_proc WHERE proname IN (
  'confirm_booking_payment', 'accept_booking', 'decline_booking',
  'cancel_awaiting_booking', 'mark_refunded', 'expire_overdue_booking',
  'check_booking_expiry'
) ORDER BY proname;
-- Expected: all 7 rows present.

SELECT column_name FROM information_schema.columns
WHERE table_name = 'bookings'
  AND column_name IN ('host_response_deadline', 'refund_status', 'refund_requested_at',
                       'refunded_at', 'refund_reference', 'declined_at', 'expired_at');
-- Expected: all 7 rows present.

SELECT conname FROM pg_constraint
WHERE conname IN ('bookings_refund_status_check', 'bookings_payment_reference_unique');
-- Expected: both rows present.
