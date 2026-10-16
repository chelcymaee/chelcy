-- ============================================================
-- Stage 2 Phase 1 (Round 7 — Priority 2) — secure notification RPCs
--
-- NOT YET APPLIED. This file is the exact migration to run via
-- apply_migration once approved — nothing in this repo executes it.
--
-- Verified against real source before writing this:
--   - app/(host)/requests.tsx       (booking accept/decline, both the
--                                     legacy `pending`-status path and the
--                                     current accept_booking/decline_booking
--                                     path — their copy genuinely differs)
--   - app/(traveller)/bookings.tsx  (traveller-initiated cancellation)
--   - src/lib/notification-service.ts (PREF_KEY preference-category map)
--   - src/lib/review-service.ts     (review_received, milestone_reached,
--                                     and the reciprocal review_request
--                                     nudge — all three, both directions)
--   - public.accept_booking / decline_booking / respond_to_pending_booking /
--     cancel_awaiting_booking / cancel_own_booking (pg_get_functiondef,
--     read-only) — to get the exact status value each transition leaves
--     behind, since decline_booking sets status='declined' while the
--     legacy respond_to_pending_booking sets status='cancelled' for the
--     same real-world event (an explicit host decline).
-- ============================================================

-- 1. Event ledger
create table public.notification_events (
  id bigint generated always as identity primary key,
  event_key text not null unique,
  created_at timestamptz not null default now()
);
alter table public.notification_events enable row level security;
revoke all on public.notification_events from public, anon, authenticated;

-- 2. create_booking_notification
--
-- p_event names the call site / copy variant (there are two genuinely
-- different "declined" and "confirmed" copies in requests.tsx depending on
-- which booking flow produced them), but the ledger key and the legacy
-- bridge check both key on the real notification `type` + booking, not on
-- p_event — so a legacy-path and current-path call for the same logical
-- event on the same booking still dedupe against each other.
--
-- Status validation: each event requires the booking to actually be in the
-- status that transition leaves behind (confirmed by reading the real
-- accept_booking/decline_booking/respond_to_pending_booking/
-- cancel_awaiting_booking/cancel_own_booking bodies), and requires the
-- caller to be the specific party who takes that action — not just any
-- participant on the booking.
create or replace function public.create_booking_notification(
  p_booking_id uuid,
  p_event text  -- 'booking_confirmed' | 'booking_declined' | 'booking_confirmed_legacy'
                -- | 'booking_declined_legacy' | 'booking_cancelled'
)
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
  v_caller_role text; -- 'host' | 'traveller' — who must be auth.uid() for this event
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

  -- Copy matches NOTIFICATION_COPY in app/(host)/requests.tsx exactly for
  -- the current (Phase 5) flow; the _legacy variants match updateStatus()'s
  -- inline copy for the old `pending`-status flow. Both are kept — neither
  -- is assumed dead.
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
    v_required_status := 'declined'; -- decline_booking sets status='declined', NOT 'cancelled'
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
    v_required_status := 'cancelled'; -- respond_to_pending_booking's decline path sets status='cancelled'
    v_caller_role := 'host';
  elsif p_event = 'booking_cancelled' then
    -- Matches bookings.tsx exactly: falls back to host_user_id when no
    -- assigned_user_id, unlike review-service.ts's host-review path below.
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

  if v_caller_role = 'host' then
    if auth.uid() not in (v_booking.host_user_id, v_booking.host_assigned_user_id) then
      raise exception 'not authorized: caller is not the host for this booking event';
    end if;
  else -- 'traveller'
    if auth.uid() is distinct from v_booking.traveller_id then
      raise exception 'not authorized: caller is not the traveller for this booking event';
    end if;
  end if;

  -- All five map to 'booking_updates' per notification-service.ts PREF_KEY.
  select coalesce((to_jsonb(np) ->> 'booking_updates')::boolean, true) into v_allowed
  from public.notification_preferences np where np.user_id = v_recipient;
  if v_allowed is null then v_allowed := true; end if;
  if not v_allowed then return; end if;

  -- Keyed on the real type + booking (not p_event), so a legacy-path call
  -- and a current-path call for the same logical event dedupe together.
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

-- 3. create_review_notification
--
-- Mirrors src/lib/review-service.ts's notifyHostOfReview / notifyTravellerOfReview
-- exactly: review_received content and recipient rules, milestone
-- conditions/copy, and the previously-missing reciprocal review_request
-- nudge (sent to the OTHER party only if they haven't already reviewed
-- back for this booking).
create or replace function public.create_review_notification(
  p_booking_id uuid,
  p_reviewed_party text  -- 'host' | 'traveller'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_review_id uuid;
  v_reviewer_id uuid;
  v_reviewer_name text;
  v_rating int;
  v_created_at timestamptz;
  v_host_id uuid;
  v_host_assigned_user_id uuid;
  v_host_name text;
  v_traveller_id uuid;
  v_event_key text;
  v_claimed boolean;
  v_allowed boolean;
  v_five_star_incl int;
  v_total_incl int;
  v_avg_incl numeric;
  v_avg_excl numeric;
  v_total_excl int;
  v_milestone_title text;
  v_milestone_body text;
  v_reciprocal_needed boolean;
  v_avg_traveller_rating numeric;
  v_recipient uuid;
  v_title text;
  v_body text;
begin
  if p_reviewed_party = 'host' then
    select r.id, r.reviewer_id, r.reviewer_name, r.rating, r.created_at, r.host_id
    into v_review_id, v_reviewer_id, v_reviewer_name, v_rating, v_created_at, v_host_id
    from public.reviews r where r.booking_id = p_booking_id;

    if v_review_id is null then raise exception 'review not found for booking'; end if;
    if auth.uid() is distinct from v_reviewer_id then raise exception 'not authorized to raise this notification'; end if;

    -- Matches notifyHostOfReview exactly: assigned_user_id only, no
    -- fallback to host.user_id. If absent, the real client returns early
    -- and sends nothing at all — not even review_received.
    select h.assigned_user_id into v_host_assigned_user_id
    from public.hosts h where h.id = v_host_id;
    if v_host_assigned_user_id is null then
      return;
    end if;
    v_recipient := v_host_assigned_user_id;

    -- (a) review_received
    v_title := v_reviewer_name || ' reviewed your listing';
    v_body := case when v_rating = 5 then '⭐ You got a 5-star review!' else 'They gave you ' || v_rating || ' stars.' end;

    select coalesce((to_jsonb(np) ->> 'new_reviews')::boolean, true) into v_allowed
    from public.notification_preferences np where np.user_id = v_recipient;
    if v_allowed is null then v_allowed := true; end if;

    if v_allowed then
      v_event_key := 'review_received:' || v_review_id::text;
      insert into public.notification_events (event_key) values (v_event_key)
        on conflict (event_key) do nothing returning true into v_claimed;
      if v_claimed is true and not exists (
        select 1 from public.notifications n
        where n.user_id = v_recipient and n.type = 'review_received' and n.related_booking_id = p_booking_id
      ) then
        insert into public.notifications (user_id, type, title, body, related_booking_id)
        values (v_recipient, 'review_received', v_title, v_body, p_booking_id);
      end if;
    end if;

    -- (b) host milestones — matches review-service.ts's five conditions,
    -- priority order, and exact copy (title + per-milestone detail body).
    select count(*) filter (where r.rating = 5), count(*)
      into v_five_star_incl, v_total_incl
      from public.reviews r
      where r.host_id = v_host_id and (r.created_at, r.id) <= (v_created_at, v_review_id);

    v_milestone_title := null;
    if v_five_star_incl = 10 then
      v_milestone_title := '10 five-star reviews'; v_milestone_body := 'Travellers love you — keep it up!';
    elsif v_five_star_incl = 5 then
      v_milestone_title := 'First 5 five-star reviews'; v_milestone_body := 'You''re building an outstanding reputation.';
    elsif v_total_incl = 10 then
      v_milestone_title := '10 reviews'; v_milestone_body := 'You''re a well-established Cubby host!';
    elsif v_total_incl = 5 then
      v_milestone_title := 'First 5 reviews'; v_milestone_body := 'Your reputation is growing!';
    else
      select avg(r.rating), count(*) into v_avg_incl, v_total_incl
        from public.reviews r where r.host_id = v_host_id and (r.created_at, r.id) <= (v_created_at, v_review_id);
      select avg(r.rating), count(*) into v_avg_excl, v_total_excl
        from public.reviews r where r.host_id = v_host_id and (r.created_at, r.id) < (v_created_at, v_review_id);
      if v_avg_incl >= 4.8 and v_total_incl >= 5
         and not (coalesce(v_avg_excl, 0) >= 4.8 and coalesce(v_total_excl, 0) >= 5) then
        v_milestone_title := '4.8★ average rating'; v_milestone_body := 'You rank among the top Cubby hosts.';
      end if;
    end if;

    if v_milestone_title is not null then
      select coalesce((to_jsonb(np) ->> 'milestones')::boolean, true) into v_allowed
      from public.notification_preferences np where np.user_id = v_recipient;
      if v_allowed is null then v_allowed := true; end if;

      if v_allowed then
        v_event_key := 'milestone:' || v_host_id::text || ':' || v_milestone_title || ':' || v_review_id::text;
        insert into public.notification_events (event_key) values (v_event_key)
          on conflict (event_key) do nothing returning true into v_claimed;
        if v_claimed is true then
          insert into public.notifications (user_id, type, title, body, related_booking_id)
          values (v_recipient, 'milestone_reached', '🏆 Milestone: ' || v_milestone_title, v_milestone_body, p_booking_id);
        end if;
      end if;
    end if;

    -- (c) reciprocal review_request — matches review-service.ts: only if
    -- the host hasn't already reviewed this traveller for this booking.
    select not exists (
      select 1 from public.traveller_reviews tr where tr.booking_id = p_booking_id
    ) into v_reciprocal_needed;

    if v_reciprocal_needed then
      select coalesce((to_jsonb(np) ->> 'booking_updates')::boolean, true) into v_allowed
      from public.notification_preferences np where np.user_id = v_recipient;
      if v_allowed is null then v_allowed := true; end if;

      if v_allowed then
        v_event_key := 'review_request:' || v_review_id::text;
        insert into public.notification_events (event_key) values (v_event_key)
          on conflict (event_key) do nothing returning true into v_claimed;
        if v_claimed is true and not exists (
          select 1 from public.notifications n
          where n.user_id = v_recipient and n.type = 'review_request' and n.related_booking_id = p_booking_id
        ) then
          insert into public.notifications (user_id, type, title, body, related_booking_id)
          values (v_recipient, 'review_request', v_reviewer_name || ' just reviewed you',
                  'Now review them — it only takes 30 seconds.', p_booking_id);
        end if;
      end if;
    end if;

  elsif p_reviewed_party = 'traveller' then
    select tr.id, tr.reviewer_id, tr.host_name, tr.traveller_id, tr.created_at,
           round((tr.rating_respectful + tr.rating_on_time + tr.rating_communication) / 3.0)
    into v_review_id, v_reviewer_id, v_host_name, v_traveller_id, v_created_at,
         v_avg_traveller_rating
    from public.traveller_reviews tr where tr.booking_id = p_booking_id;

    if v_review_id is null then raise exception 'review not found for booking'; end if;
    if auth.uid() is distinct from v_reviewer_id then raise exception 'not authorized to raise this notification'; end if;

    -- v_avg_traveller_rating above matches review-service.ts's
    -- Math.round((respectful+on_time+communication)/3) exactly.
    v_recipient := v_traveller_id;
    v_title := v_host_name || ' reviewed you';
    v_body := case when v_avg_traveller_rating >= 4 then '🌟 Great news — you got a positive review!' else 'You have a new review.' end;

    select coalesce((to_jsonb(np) ->> 'new_reviews')::boolean, true) into v_allowed
    from public.notification_preferences np where np.user_id = v_recipient;
    if v_allowed is null then v_allowed := true; end if;

    if v_allowed then
      v_event_key := 'review_received:' || v_review_id::text;
      insert into public.notification_events (event_key) values (v_event_key)
        on conflict (event_key) do nothing returning true into v_claimed;
      if v_claimed is true and not exists (
        select 1 from public.notifications n
        where n.user_id = v_recipient and n.type = 'review_received' and n.related_booking_id = p_booking_id
      ) then
        insert into public.notifications (user_id, type, title, body, related_booking_id)
        values (v_recipient, 'review_received', v_title, v_body, p_booking_id);
      end if;
    end if;

    -- reciprocal review_request — only if traveller hasn't reviewed host yet.
    select not exists (
      select 1 from public.reviews r where r.booking_id = p_booking_id
    ) into v_reciprocal_needed;

    if v_reciprocal_needed then
      select coalesce((to_jsonb(np) ->> 'booking_updates')::boolean, true) into v_allowed
      from public.notification_preferences np where np.user_id = v_recipient;
      if v_allowed is null then v_allowed := true; end if;

      if v_allowed then
        v_event_key := 'review_request:' || v_review_id::text;
        insert into public.notification_events (event_key) values (v_event_key)
          on conflict (event_key) do nothing returning true into v_claimed;
        if v_claimed is true and not exists (
          select 1 from public.notifications n
          where n.user_id = v_recipient and n.type = 'review_request' and n.related_booking_id = p_booking_id
        ) then
          insert into public.notifications (user_id, type, title, body, related_booking_id)
          values (v_recipient, 'review_request', v_host_name || ' just reviewed you',
                  'Return the favour — review your host now.', p_booking_id);
        end if;
      end if;
    end if;

  else
    raise exception 'invalid reviewed_party: %', p_reviewed_party;
  end if;
end;
$$;

revoke all on function public.create_review_notification(uuid, text) from public, anon;
grant execute on function public.create_review_notification(uuid, text) to authenticated;
