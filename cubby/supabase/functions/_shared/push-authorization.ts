// ─── Shared: send-push authorization decision ──────────────────────────────
//
// Pure decision logic for send-push's three auth paths, kept free of any
// Deno or supabase-js import so it can run under plain Node (see
// push-authorization.test.ts) as well as the Deno edge runtime. The actual
// DB work (lookup, relationship check, single-use claim) is injected as
// functions rather than done here, so this file has no network/client
// dependency to mock.
//
// History:
//   Round 1 (deployed, v9): closed the original hole — any signed-in user's
//   JWT could push arbitrary title/body to an arbitrary user_id, with no
//   check at all. Fixed by requiring a matching, recent `notifications` row
//   for the exact user_id/title/body. That left two known gaps, both closed
//   in this round:
//     - Replay: the same real notification could authorize any number of
//       pushes within the match window.
//     - Unrelated caller: nothing verified the CALLER had any connection to
//       the notification — only that its content was real and recent, so a
//       third party with no relationship to either party could trigger (or
//       replay) a push for a static-copy notification type just by knowing
//       its fixed text.
//
// Round 2 (this file) closes both:
//   1. Caller-relationship check — re-applies the EXACT same model already
//      live and approved in the `notifications` table's own RLS policy
//      (Stage 1 / Phase 0): self, or a real counterparty on the
//      notification's related_booking_id, or (for milestone_reached, which
//      carries no related_booking_id in the real client) any shared
//      booking history between caller and recipient-as-host. This is
//      deliberately NOT a new authorization model — it's the same one,
//      applied a second time at the push layer for defense in depth.
//   2. Single-use claim — the matched notification row can authorize at
//      most one push, ever.
//
// Unlike the Phase 1 event ledger (where "claim" and "act" are both DB
// writes inside one transaction, so a ledger claim and its row never
// diverge), this module's "act" is an external network call to Expo's push
// API that can fail independently of anything in this database. Claiming
// BEFORE that call — the Phase 1 "claim before act" pattern — would
// permanently and silently lose the notification the moment Expo's API has
// a bad day: the row stays claimed forever with no delivery ever having
// happened, and no caller can ever retry it.
//
// So this module deliberately does NOT claim. authorizeClientPush only
// looks up an unclaimed match and checks the relationship; it hands the
// caller (index.ts) the matched notification's id and leaves the actual
// single-use claim (via the exported ClaimNotificationPush type) to be
// called ONLY after Expo has confirmed the push was actually sent. That
// trades a narrow window — two truly concurrent legitimate calls for the
// very same notification could each get as far as a real Expo send before
// either claims — for eliminating permanent data loss on delivery failure.
// A rare possible duplicate push is an acceptable cost; silently dropping a
// real notification forever is not.
//
// This preserves the existing request shape (user_id/title/body) that
// installed iOS clients already send via dispatchPush(), so no client
// update is required for legitimate traffic to keep working.

export const PUSH_MATCH_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export type PushAuthMethod = 'admin_secret' | 'admin_session' | 'client_jwt' | 'unauthenticated';

export interface ResolveAuthMethodInput {
  adminSecretHeader: string | null;
  adminSecretEnv: string | undefined;
  adminSessionOk: boolean;
  signedInUserId: string | null; // null if no Authorization header, or token didn't resolve to a user
}

// Order matters and is unchanged from the original implementation:
// admin secret first, then admin session, then any signed-in user.
export function resolveAuthMethod(input: ResolveAuthMethodInput): PushAuthMethod {
  if (input.adminSecretEnv && input.adminSecretHeader === input.adminSecretEnv) {
    return 'admin_secret';
  }
  if (input.adminSessionOk) {
    return 'admin_session';
  }
  if (input.signedInUserId) {
    return 'client_jwt';
  }
  return 'unauthenticated';
}

export interface RecentNotificationLookupArgs {
  userId: string;
  title: string;
  body: string;
  sinceIso: string;
}

// Only matches rows not already claimed by a prior push (pushed_at IS
// NULL, enforced by the real lookup implementation in index.ts).
export interface MatchedNotification {
  id: string;
  type: string;
  relatedBookingId: string | null;
}

export type RecentNotificationLookup = (args: RecentNotificationLookupArgs) => Promise<MatchedNotification | null>;

export interface RelationshipCheckArgs {
  callerId: string;
  recipientId: string;
  type: string;
  relatedBookingId: string | null;
}

// Mirrors the notifications table's own INSERT policy exactly — see the
// file header. Must fail closed (return false) on any DB error.
export type RelationshipCheck = (args: RelationshipCheckArgs) => Promise<boolean>;

// Atomically claims the notification row for a push, returning true only if
// this call was the one that claimed it (i.e. pushed_at was NULL and this
// call set it). Returns false if it was already claimed — by a prior
// legitimate push OR a prior replay attempt that got this far, which can't
// happen now since replay attempts are only even considered "related" once,
// and the claim is the very next step.
export type ClaimNotificationPush = (notificationId: string) => Promise<boolean>;

export interface ClientPushRequest {
  callerId: string;
  userId: string;
  title: string;
  body: string;
}

export interface ClientPushAuthorizationResult {
  authorized: boolean;
  reason:
    | 'matched_existing_notification'
    | 'no_matching_authorized_notification'
    | 'caller_not_related_to_notification';
  // Present only when authorized — the caller MUST claim this via
  // ClaimNotificationPush, but only after confirming the push was actually
  // delivered. Never claim on the strength of authorization alone.
  notificationId?: string;
}

export interface ClientPushDependencies {
  lookup: RecentNotificationLookup;
  checkRelationship: RelationshipCheck;
}

// Only called for the 'client_jwt' auth method — admin_secret and
// admin_session callers are already fully trusted and skip this check
// entirely (see send-push/index.ts).
//
// Deliberately does NOT claim the notification — see the file header.
// The caller is responsible for claiming it (via ClaimNotificationPush)
// strictly after confirming the push was actually sent.
export async function authorizeClientPush(
  request: ClientPushRequest,
  deps: ClientPushDependencies,
  nowIso: string,
  windowMs: number = PUSH_MATCH_WINDOW_MS,
): Promise<ClientPushAuthorizationResult> {
  const sinceIso = new Date(new Date(nowIso).getTime() - windowMs).toISOString();
  const match = await deps.lookup({
    userId: request.userId,
    title: request.title,
    body: request.body,
    sinceIso,
  });

  if (!match) {
    return { authorized: false, reason: 'no_matching_authorized_notification' };
  }

  // Self-push never needs a DB round trip: a caller is always allowed to
  // trigger a push to themselves, same as the notifications policy's own
  // `auth.uid() = user_id` branch.
  const related = request.callerId === request.userId
    || await deps.checkRelationship({
      callerId: request.callerId,
      recipientId: request.userId,
      type: match.type,
      relatedBookingId: match.relatedBookingId,
    });

  if (!related) {
    return { authorized: false, reason: 'caller_not_related_to_notification' };
  }

  return { authorized: true, reason: 'matched_existing_notification', notificationId: match.id };
}
