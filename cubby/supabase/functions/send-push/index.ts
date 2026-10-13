// Edge Function: send-push
// Generic Expo push notification sender.
// Accepts: { user_id, title, body, data? }
// Auth, tried in order until one matches:
//   1. x-admin-secret header — server-to-server callers (other Edge
//      Functions notifying someone after their own transition, e.g.
//      _shared/awaiting-host-notifications.ts, booking-expiry-sweep).
//      ADMIN_SECRET here is a server-only secret, read from Deno.env,
//      never sent by a client.
//   2. Admin session bearer token — the one client-facing caller,
//      app/(admin)/verifications.tsx, sending a push after an admin
//      approves/rejects a verification. See
//      supabase/functions/_shared/admin-session.ts.
//   3. Supabase JWT — any other signed-in client caller. v9 (deployed)
//      closed the original hole — ANY signed-in user could push arbitrary
//      title/body to an arbitrary user_id with no relationship check at
//      all — by requiring a matching, recent `notifications` row for the
//      exact user_id/title/body. That left two known gaps, both closed
//      below (not yet deployed): replay of the same real notification, and
//      an unrelated caller triggering/replaying a static-copy notification
//      they had no part in. See _shared/push-authorization.ts for the full
//      design — it re-applies the existing `notifications` RLS policy's own
//      relationship model rather than inventing a new one, plus a
//      single-use claim on the notification row.
//
// Deploy: npx supabase functions deploy send-push

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireAdminSession } from '../_shared/admin-session.ts';
import {
  resolveAuthMethod,
  authorizeClientPush,
  type RecentNotificationLookupArgs,
  type MatchedNotification,
  type RelationshipCheckArgs,
} from '../_shared/push-authorization.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ADMIN_SECRET = Deno.env.get('ADMIN_SECRET');

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const adminSecret = req.headers.get('x-admin-secret');
    const authHeader = req.headers.get('authorization');
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const adminSecretMatches = !!ADMIN_SECRET && adminSecret === ADMIN_SECRET;

    let adminSessionOk = false;
    let signedInUserId: string | null = null;
    if (!adminSecretMatches && authHeader) {
      const adminSession = await requireAdminSession(req, adminClient);
      adminSessionOk = adminSession.ok;
      if (!adminSessionOk) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await adminClient.auth.getUser(token);
        signedInUserId = user?.id ?? null;
      }
    }

    const authMethod = resolveAuthMethod({
      adminSecretHeader: adminSecret,
      adminSecretEnv: ADMIN_SECRET,
      adminSessionOk,
      signedInUserId,
    });

    if (authMethod === 'unauthenticated') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const { user_id, title, body, data } = await req.json();

    if (!user_id || !title || !body) {
      return new Response(JSON.stringify({ error: 'user_id, title and body are required' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Declared here (not inside the block below) so the notificationId it
    // carries is still reachable at the claim call sites, after delivery
    // has been attempted.
    let authResult: Awaited<ReturnType<typeof authorizeClientPush>> | undefined;

    // admin_secret and admin_session callers are already fully trusted
    // server/admin paths — unchanged, no extra check. Only a plain
    // signed-in-user caller (client_jwt) needs the relationship check and
    // single-use claim, since that's the path that previously had neither.
    if (authMethod === 'client_jwt') {
      const lookup = async (args: RecentNotificationLookupArgs): Promise<MatchedNotification | null> => {
        // pushed_at IS NULL is the single-use gate: a row already consumed
        // by a prior push (legitimate or not) can never match again.
        const { data: rows } = await supabase
          .from('notifications')
          .select('id, type, related_booking_id')
          .eq('user_id', args.userId)
          .eq('title', args.title)
          .eq('body', args.body)
          .is('pushed_at', null)
          .gte('created_at', args.sinceIso)
          .limit(1);
        const row = rows?.[0];
        return row ? { id: row.id, type: row.type, relatedBookingId: row.related_booking_id } : null;
      };

      // Plain single-table queries only (no embedded-resource filters) —
      // easier to verify correct by inspection than a cross-table
      // PostgREST embed, which matters more here than brevity.
      const checkRelationship = (client: SupabaseClient) => async (args: RelationshipCheckArgs): Promise<boolean> => {
        // Mirrors the notifications table's own INSERT policy exactly —
        // see push-authorization.ts's header for why. Fails closed on any
        // DB error. No new DB object required: every query here runs as
        // the service role directly against bookings/hosts, same tables
        // the policy's own logic reads at INSERT time.
        if (args.relatedBookingId) {
          const { data: booking, error: bookingError } = await client
            .from('bookings')
            .select('traveller_id, host_id')
            .eq('id', args.relatedBookingId)
            .maybeSingle();

          if (!bookingError && booking) {
            const { data: host, error: hostError } = await client
              .from('hosts')
              .select('user_id, assigned_user_id')
              .eq('id', booking.host_id)
              .maybeSingle();

            if (!hostError && host) {
              const travellerToHost = booking.traveller_id === args.callerId
                && (args.recipientId === host.user_id || args.recipientId === host.assigned_user_id);
              const hostToTraveller = (args.callerId === host.user_id || args.callerId === host.assigned_user_id)
                && args.recipientId === booking.traveller_id;
              if (travellerToHost || hostToTraveller) return true;
            }
          }
        }

        if (args.type === 'milestone_reached') {
          // Any shared booking history at all, with the caller as
          // traveller and the recipient as that booking's host — exactly
          // the leniency the notifications policy's own milestone branch
          // allows, since the real client never sets related_booking_id
          // on a milestone_reached notification.
          const { data: hostRows, error: hostError } = await client
            .from('hosts')
            .select('id')
            .or(`user_id.eq.${args.recipientId},assigned_user_id.eq.${args.recipientId}`);

          if (!hostError && hostRows && hostRows.length > 0) {
            const hostIds = hostRows.map((h: { id: string }) => h.id);
            const { data: bookingRows, error: bookingsError } = await client
              .from('bookings')
              .select('id')
              .eq('traveller_id', args.callerId)
              .in('host_id', hostIds)
              .limit(1);
            if (!bookingsError && bookingRows && bookingRows.length > 0) return true;
          }
        }

        return false;
      };

      authResult = await authorizeClientPush(
        { callerId: signedInUserId!, userId: user_id, title, body },
        { lookup, checkRelationship: checkRelationship(supabase) },
        new Date().toISOString(),
      );
      if (!authResult.authorized) {
        console.warn(`send-push: rejected client_jwt push — caller ${signedInUserId} -> target ${user_id}, reason: ${authResult.reason}`);
        return new Response(JSON.stringify({ error: 'Not authorized to push to this recipient' }), {
          status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
    }

    // Claims the matched notification so it can never authorize another
    // push. Deliberately NOT called until after delivery is confirmed (see
    // the three call sites below) — claiming earlier would permanently
    // lose the notification the moment Expo's API has a bad day, since the
    // claim and the actual push are two independent operations with no
    // shared transaction. Only relevant for authMethod === 'client_jwt';
    // admin_secret/admin_session callers never produce a notificationId.
    const claimPushedNotification = async (notificationId: string): Promise<void> => {
      await supabase
        .from('notifications')
        .update({ pushed_at: new Date().toISOString() })
        .eq('id', notificationId)
        .is('pushed_at', null);
    };

    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', user_id);

    if (!tokens || tokens.length === 0) {
      // Nothing to deliver to — there's no device to fail to reach, so
      // this is a legitimate terminal state, not a lost delivery. Safe to
      // claim: the same (sent: 0) outcome was already the pre-existing
      // behavior for this branch before any of this round's changes.
      if (authResult?.notificationId) await claimPushedNotification(authResult.notificationId);
      return new Response(JSON.stringify({ sent: 0 }), {
        status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const messages = tokens.map(({ token }: { token: string }) => ({
      to: token,
      title,
      body: body.length > 150 ? body.substring(0, 147) + '…' : body,
      data: data ?? {},
      sound: 'default',
    }));

    let pushRes: Response;
    try {
      pushRes = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(messages),
      });
    } catch (fetchError) {
      // Network failure reaching Expo — definitely not delivered. Do NOT
      // claim; this notification must remain retriable.
      console.error(`send-push: Expo request failed for user ${user_id}:`, fetchError);
      return new Response(JSON.stringify({ error: 'Push delivery failed, not claimed — safe to retry' }), {
        status: 502, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    console.log(`send-push: sent ${messages.length} push(es) to user ${user_id}, expo status ${pushRes.status}`);

    if (!pushRes.ok) {
      // Expo itself rejected the request (e.g. malformed payload, outage).
      // Same reasoning as the network-failure case above: not delivered,
      // must not claim, must stay retriable.
      return new Response(JSON.stringify({ error: 'Push delivery failed, not claimed — safe to retry' }), {
        status: 502, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // Only now — after Expo has confirmed it accepted the request — is it
    // safe to make this notification unavailable for future pushes.
    if (authResult?.notificationId) await claimPushedNotification(authResult.notificationId);

    return new Response(JSON.stringify({ sent: messages.length }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('send-push error:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
