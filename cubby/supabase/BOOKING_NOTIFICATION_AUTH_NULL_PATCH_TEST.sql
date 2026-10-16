-- ============================================================
-- Regression tests: NULL auth.uid() bypass in booking-notification RPCs
--
-- Run this against the REAL deployed create_booking_notification (v1) and
-- create_booking_notification_v2 functions. Safe to run against
-- production: the whole script is one transaction that always rolls back
-- at the end regardless of outcome, so no row is ever persisted.
--
-- Run it BEFORE applying BOOKING_NOTIFICATION_AUTH_NULL_PATCH.sql and case
-- 1 / 1b should FAIL — that demonstrates the vulnerability. Run it AFTER
-- applying the patch and every case should PASS.
--
-- Each case picks a real booking matching the status its event requires,
-- at run time, rather than hardcoding a specific booking id, so this stays
-- runnable as production data changes. A case is SKIPPED (not failed) if
-- no matching booking currently exists. Any FAIL raises an exception,
-- which aborts this DO block (and is visible in the SQL Editor output) —
-- reaching the final "ALL REGRESSION CASES COMPLETED" notice means nothing
-- failed.
-- ============================================================

begin;

do $$
declare
  v_confirmed_booking uuid;
  v_confirmed_host uuid;
  v_cancelled_booking uuid;
  v_cancelled_traveller uuid;
  v_unrelated uuid := gen_random_uuid();
  v_caught boolean;
begin
  -- Pick a real 'confirmed' booking (host-caller event) + its host user id.
  select b.id, coalesce(h.assigned_user_id, h.user_id)
    into v_confirmed_booking, v_confirmed_host
  from public.bookings b
  join public.hosts h on h.id = b.host_id
  where b.status = 'confirmed' and coalesce(h.assigned_user_id, h.user_id) is not null
  limit 1;

  -- Pick a real 'cancelled' booking (traveller-caller event) + its traveller id.
  select b.id, b.traveller_id
    into v_cancelled_booking, v_cancelled_traveller
  from public.bookings b
  where b.status = 'cancelled' and b.traveller_id is not null
  limit 1;

  -- ── Case 1: NULL caller identity must be rejected (v2) ──────────────
  -- request.jwt.claims has never been set in this transaction yet, so
  -- auth.uid() is NULL here — this is the exact gap the patch closes.
  if v_confirmed_booking is not null then
    v_caught := false;
    begin
      perform * from public.create_booking_notification_v2(v_confirmed_booking, 'booking_confirmed');
    exception when others then
      v_caught := true;
      if sqlerrm not like '%not authorized%' then
        raise exception 'REGRESSION FAIL case1_null_caller_v2: wrong error: %', sqlerrm;
      end if;
    end;
    if not v_caught then
      raise exception 'REGRESSION FAIL case1_null_caller_v2: call succeeded with no caller identity — vulnerability present';
    end if;
    raise notice 'PASS case1_null_caller_v2';
  else
    raise notice 'SKIP case1_null_caller_v2: no confirmed booking available right now';
  end if;

  -- ── Case 1b: same NULL-caller check against v1, for parity ──────────
  if v_confirmed_booking is not null then
    v_caught := false;
    begin
      perform public.create_booking_notification(v_confirmed_booking, 'booking_confirmed');
    exception when others then
      v_caught := true;
      if sqlerrm not like '%not authorized%' then
        raise exception 'REGRESSION FAIL case1b_null_caller_v1: wrong error: %', sqlerrm;
      end if;
    end;
    if not v_caught then
      raise exception 'REGRESSION FAIL case1b_null_caller_v1: call succeeded with no caller identity — vulnerability present';
    end if;
    raise notice 'PASS case1b_null_caller_v1';
  else
    raise notice 'SKIP case1b_null_caller_v1: no confirmed booking available right now';
  end if;

  -- ── Case 2: legitimate host must still succeed (v2) ──────────────────
  if v_confirmed_booking is not null then
    perform set_config('request.jwt.claims', json_build_object('sub', v_confirmed_host)::text, true);
    begin
      perform * from public.create_booking_notification_v2(v_confirmed_booking, 'booking_confirmed');
      raise notice 'PASS case2_legitimate_host_v2';
    exception when others then
      raise exception 'REGRESSION FAIL case2_legitimate_host_v2: legitimate host rejected: %', sqlerrm;
    end;
  else
    raise notice 'SKIP case2_legitimate_host_v2: no confirmed booking available right now';
  end if;

  -- ── Case 3: legitimate traveller must still succeed (v2) ─────────────
  if v_cancelled_booking is not null then
    perform set_config('request.jwt.claims', json_build_object('sub', v_cancelled_traveller)::text, true);
    begin
      perform * from public.create_booking_notification_v2(v_cancelled_booking, 'booking_cancelled');
      raise notice 'PASS case3_legitimate_traveller_v2';
    exception when others then
      raise exception 'REGRESSION FAIL case3_legitimate_traveller_v2: legitimate traveller rejected: %', sqlerrm;
    end;
  else
    raise notice 'SKIP case3_legitimate_traveller_v2: no cancelled booking available right now';
  end if;

  -- ── Case 4: unrelated caller must be rejected (v2) ────────────────────
  if v_confirmed_booking is not null then
    perform set_config('request.jwt.claims', json_build_object('sub', v_unrelated)::text, true);
    v_caught := false;
    begin
      perform * from public.create_booking_notification_v2(v_confirmed_booking, 'booking_confirmed');
    exception when others then
      v_caught := true;
      if sqlerrm not like '%not authorized%' then
        raise exception 'REGRESSION FAIL case4_unrelated_caller_v2: wrong error: %', sqlerrm;
      end if;
    end;
    if not v_caught then
      raise exception 'REGRESSION FAIL case4_unrelated_caller_v2: unrelated caller was authorized';
    end if;
    raise notice 'PASS case4_unrelated_caller_v2';
  else
    raise notice 'SKIP case4_unrelated_caller_v2: no confirmed booking available right now';
  end if;

  raise notice 'ALL REGRESSION CASES COMPLETED — see PASS/SKIP lines above; any FAIL would have aborted this block.';
end $$;

rollback;
