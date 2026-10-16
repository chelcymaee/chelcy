-- ============================================================
-- Security patch: NULL auth.uid() bypass in booking-notification RPCs
--
-- NOT YET APPLIED. Prepared for separate approval.
--
-- Discovered during Phase 2 post-deploy verification: create_booking_notification
-- (v1) and create_booking_notification_v2 both gate their "host" caller-role
-- check with `if auth.uid() not in (...) then raise exception ...`. In
-- PL/pgSQL, `IF <NULL> THEN` is treated as false (not true), so when
-- auth.uid() is NULL — i.e. the function is called with no JWT context at
-- all, such as a direct SQL/service-role connection — the exception is
-- silently skipped and the call proceeds as if authorized.
--
-- Not reachable from the real app today: anon has no EXECUTE grant on
-- either function, and every authenticated Supabase session JWT carries a
-- `sub` claim, so auth.uid() is never NULL for a real client call. The gap
-- only matters for direct/service-role SQL access. Still worth closing,
-- since these are SECURITY DEFINER functions and the check should be
-- correct regardless of caller.
--
-- The two review-notification functions (create_review_notification,
-- create_review_notification_v2) were checked and are NOT affected — they
-- use `auth.uid() is distinct from v_reviewer_id`, which already handles
-- NULL correctly (NULL IS DISTINCT FROM <non-null> is true, so the
-- exception still fires). No change needed there.
--
-- Fix: add an explicit `auth.uid() is null` guard immediately before the
-- existing host/traveller role branch, in both functions below. Nothing
-- else changes — same signature, same return type (void for v1, TABLE(...)
-- for v2), same grants/ownership. CREATE OR REPLACE FUNCTION is used
-- because neither function's return type changes, so no DROP is needed.
--
-- Verified (isolated, no production writes): a pg_temp function
-- reproducing this exact branch, parameterized by a simulated auth.uid(),
-- confirmed NULL is now rejected while a real host UUID, a real traveller
-- UUID and an unrelated UUID all behave exactly as before the patch. See
-- BOOKING_NOTIFICATION_AUTH_NULL_PATCH_TEST.sql for a reusable regression
-- script against the real deployed functions (BEGIN/ROLLBACK, never
-- commits) to run after this patch is applied.
-- ============================================================

create or replace function public.create_booking_notification(p_booking_id uuid, p_event text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking record;
  v_event_key text;
  v_recipient uuid;
  v_type text;
  v_title text;
  v_body text;
  v_required_status text;
  v_caller_role text;
  v_allowed boolean;
  v_claimed boolean;
begin
  select b.id, b.status, b.traveller_id, b.host_id, h.user_id as host_user_id,
         h.assigned_user_id as host_assigned_user_id
  into v_booking
  from public.bookings b
  join public.hosts h on h.id = b.host_id
  where b.id = p_booking_id;

  if v_booking.id is null then
    raise exception 'booking not found';
  end if;

  if p_event = 'booking_confirmed' then
    v_recipient := v_booking.traveller_id;
    v_type := 'booking_confirmed';
    v_title := 'Booking confirmed ✅';
    v_body := 'Your host accepted your booking. Check your bookings for the drop-off PIN.';
    v_required_status := 'confirmed';
    v_caller_role := 'host';
  elsif p_event = 'booking_declined' then
    v_recipient := v_booking.traveller_id;
    v_type := 'booking_declined';
    v_title := 'Booking declined';
    v_body := 'Your host wasn''t able to accept this booking. Your refund has been queued for processing — try another host nearby!';
    v_required_status := 'declined';
    v_caller_role := 'host';
  elsif p_event = 'booking_confirmed_legacy' then
    v_recipient := v_booking.traveller_id;
    v_type := 'booking_confirmed';
    v_title := 'Booking confirmed ✅';
    v_body := 'Your booking has been accepted. Check your bookings for the PIN.';
    v_required_status := 'confirmed';
    v_caller_role := 'host';
  elsif p_event = 'booking_declined_legacy' then
    v_recipient := v_booking.traveller_id;
    v_type := 'booking_declined';
    v_title := 'Booking declined';
    v_body := 'Your booking request was not accepted. Try another host nearby!';
    v_required_status := 'cancelled';
    v_caller_role := 'host';
  elsif p_event = 'booking_cancelled' then
    v_recipient := coalesce(v_booking.host_assigned_user_id, v_booking.host_user_id);
    v_type := 'booking_cancelled';
    v_title := 'Booking cancelled';
    v_body := 'A traveller cancelled their upcoming booking with you.';
    v_required_status := 'cancelled';
    v_caller_role := 'traveller';
  else
    raise exception 'unsupported event type: %', p_event;
  end if;

  if v_booking.status is distinct from v_required_status then
    raise exception 'booking status % does not match required status % for event %',
      v_booking.status, v_required_status, p_event;
  end if;

  if auth.uid() is null then
    raise exception 'not authorized: no caller identity';
  end if;

  if v_caller_role = 'host' then
    if auth.uid() not in (v_booking.host_user_id, v_booking.host_assigned_user_id) then
      raise exception 'not authorized: caller is not the host for this booking event';
    end if;
  else
    if auth.uid() is distinct from v_booking.traveller_id then
      raise exception 'not authorized: caller is not the traveller for this booking event';
    end if;
  end if;

  select coalesce((to_jsonb(np) ->> 'booking_updates')::boolean, true) into v_allowed
  from public.notification_preferences np where np.user_id = v_recipient;
  if v_allowed is null then v_allowed := true; end if;
  if not v_allowed then return; end if;

  v_event_key := 'booking:' || v_type || ':' || p_booking_id::text;
  insert into public.notification_events (event_key) values (v_event_key)
    on conflict (event_key) do nothing returning true into v_claimed;
  if v_claimed is distinct from true then
    return;
  end if;

  if exists (
    select 1 from public.notifications n
    where n.user_id = v_recipient and n.type = v_type and n.related_booking_id = p_booking_id
  ) then
    return;
  end if;

  insert into public.notifications (user_id, type, title, body, related_booking_id)
  values (v_recipient, v_type, v_title, v_body, p_booking_id);
end;
$$;

revoke all on function public.create_booking_notification(uuid, text) from public, anon;
grant execute on function public.create_booking_notification(uuid, text) to authenticated;

create or replace function public.create_booking_notification_v2(
  p_booking_id uuid,
  p_event text  -- 'booking_confirmed' | 'booking_declined' | 'booking_confirmed_legacy'
                -- | 'booking_declined_legacy' | 'booking_cancelled'
)
returns table (
  user_id uuid,
  type text,
  title text,
  body text,
  related_booking_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking record;
  v_event_key text;
  v_recipient uuid;
  v_type text;
  v_title text;
  v_body text;
  v_required_status text;
  v_caller_role text;
  v_allowed boolean;
  v_claimed boolean;
begin
  select b.id, b.status, b.traveller_id, b.host_id, h.user_id as host_user_id,
         h.assigned_user_id as host_assigned_user_id
  into v_booking
  from public.bookings b
  join public.hosts h on h.id = b.host_id
  where b.id = p_booking_id;

  if v_booking.id is null then
    raise exception 'booking not found';
  end if;

  if p_event = 'booking_confirmed' then
    v_recipient := v_booking.traveller_id;
    v_type := 'booking_confirmed';
    v_title := 'Booking confirmed ✅';
    v_body := 'Your host accepted your booking. Check your bookings for the drop-off PIN.';
    v_required_status := 'confirmed';
    v_caller_role := 'host';
  elsif p_event = 'booking_declined' then
    v_recipient := v_booking.traveller_id;
    v_type := 'booking_declined';
    v_title := 'Booking declined';
    v_body := 'Your host wasn''t able to accept this booking. Your refund has been queued for processing — try another host nearby!';
    v_required_status := 'declined';
    v_caller_role := 'host';
  elsif p_event = 'booking_confirmed_legacy' then
    v_recipient := v_booking.traveller_id;
    v_type := 'booking_confirmed';
    v_title := 'Booking confirmed ✅';
    v_body := 'Your booking has been accepted. Check your bookings for the PIN.';
    v_required_status := 'confirmed';
    v_caller_role := 'host';
  elsif p_event = 'booking_declined_legacy' then
    v_recipient := v_booking.traveller_id;
    v_type := 'booking_declined';
    v_title := 'Booking declined';
    v_body := 'Your booking request was not accepted. Try another host nearby!';
    v_required_status := 'cancelled';
    v_caller_role := 'host';
  elsif p_event = 'booking_cancelled' then
    v_recipient := coalesce(v_booking.host_assigned_user_id, v_booking.host_user_id);
    v_type := 'booking_cancelled';
    v_title := 'Booking cancelled';
    v_body := 'A traveller cancelled their upcoming booking with you.';
    v_required_status := 'cancelled';
    v_caller_role := 'traveller';
  else
    raise exception 'unsupported event type: %', p_event;
  end if;

  if v_booking.status is distinct from v_required_status then
    raise exception 'booking status % does not match required status % for event %',
      v_booking.status, v_required_status, p_event;
  end if;

  if auth.uid() is null then
    raise exception 'not authorized: no caller identity';
  end if;

  if v_caller_role = 'host' then
    if auth.uid() not in (v_booking.host_user_id, v_booking.host_assigned_user_id) then
      raise exception 'not authorized: caller is not the host for this booking event';
    end if;
  else
    if auth.uid() is distinct from v_booking.traveller_id then
      raise exception 'not authorized: caller is not the traveller for this booking event';
    end if;
  end if;

  select coalesce((to_jsonb(np) ->> 'booking_updates')::boolean, true) into v_allowed
  from public.notification_preferences np where np.user_id = v_recipient;
  if v_allowed is null then v_allowed := true; end if;
  if not v_allowed then return; end if;

  v_event_key := 'booking:' || v_type || ':' || p_booking_id::text;
  insert into public.notification_events (event_key) values (v_event_key)
    on conflict (event_key) do nothing returning true into v_claimed;
  if v_claimed is distinct from true then
    return;
  end if;

  if exists (
    select 1 from public.notifications n
    where n.user_id = v_recipient and n.type = v_type and n.related_booking_id = p_booking_id
  ) then
    return;
  end if;

  insert into public.notifications (user_id, type, title, body, related_booking_id)
  values (v_recipient, v_type, v_title, v_body, p_booking_id);

  return query select v_recipient, v_type, v_title, v_body, p_booking_id;
end;
$$;

revoke all on function public.create_booking_notification_v2(uuid, text) from public, anon;
grant execute on function public.create_booking_notification_v2(uuid, text) to authenticated;
