// ─── Shared: send-push authorization decision ──────────────────────────────
//
// Pure decision logic for send-push's three auth paths, kept free of any
// Deno or supabase-js import so it can run under plain Node (see
// push-authorization.test.ts) as well as the Deno edge runtime. The actual
// DB lookup is injected as a function (RecentNotificationLookup) rather than
// done here, so this file has no network/client dependency to mock.
//
// Background: send-push previously treated ANY valid signed-in user's JWT
// as sufficient to push arbitrary title/body to an arbitrary user_id, with
// no relationship check between the caller and the target. That's the
// vulnerability this module closes for the 'client_jwt' path.
//
// Fix shape: a signed-in caller may only trigger a push for content that
// already exists as a real, recent row in `notifications` for that exact
// user_id/title/body. Since the existing Phase 0 RLS policy on
// `notifications` already restricts who can INSERT a row for a given
// user_id (self, or a real counterparty on a shared booking/review), the
// existence of a matching row is itself proof the push target was
// legitimately authorized by that earlier, already-checked write — this
// avoids re-deriving booking/review relationships a second time here.
//
// This preserves the existing request shape (user_id/title/body) that
// installed iOS clients already send via dispatchPush(), so no client
// update is required for legitimate traffic to keep working.
//
// Residual risk (accepted, narrower than before): a caller who already
// knows the exact title/body of a real notification a target user received
// in the last PUSH_MATCH_WINDOW_MS could re-trigger that same push again.
// This can only replay truthful, already-authorized content within a short
// window — not inject fabricated content or target an unrelated user with
// invented text, which was the original hole. Closing this fully (e.g. a
// one-time-use `pushed_at` marker on the notification row) is a proposed
// follow-up, not required for this fix.

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

export type RecentNotificationLookup = (args: RecentNotificationLookupArgs) => Promise<{ found: boolean }>;

export interface ClientPushRequest {
  userId: string;
  title: string;
  body: string;
}

export interface ClientPushAuthorizationResult {
  authorized: boolean;
  reason: 'matched_existing_notification' | 'no_matching_authorized_notification';
}

// Only called for the 'client_jwt' auth method — admin_secret and
// admin_session callers are already fully trusted and skip this check
// entirely (see send-push/index.ts).
export async function authorizeClientPush(
  request: ClientPushRequest,
  lookup: RecentNotificationLookup,
  nowIso: string,
  windowMs: number = PUSH_MATCH_WINDOW_MS,
): Promise<ClientPushAuthorizationResult> {
  const sinceIso = new Date(new Date(nowIso).getTime() - windowMs).toISOString();
  const { found } = await lookup({
    userId: request.userId,
    title: request.title,
    body: request.body,
    sinceIso,
  });

  return found
    ? { authorized: true, reason: 'matched_existing_notification' }
    : { authorized: false, reason: 'no_matching_authorized_notification' };
}
