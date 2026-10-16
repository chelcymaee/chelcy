// Pure trigger logic for the Phase 2 notification RPCs
// (create_booking_notification_v2 / create_review_notification_v2). Kept
// free of any import from './supabase' (which pulls in
// AsyncStorage/react-native) so this is testable under plain Node — same
// split used for supabase/functions/_shared/push-authorization.ts: the
// real Supabase/React Native wiring lives in notification-service.ts,
// which imports and calls this.
//
// The _v2 functions (supabase/PHASE2_NOTIFICATION_RPCS_V2.sql, not yet
// applied) are new, separately-named, additive functions — the original
// create_booking_notification/create_review_notification (RETURNS void,
// live) are untouched. Internal logic is otherwise byte-for-byte
// identical; the _v2 functions additionally RETURN the row(s) actually
// inserted, so push dispatch can use their exact content without
// reconstructing it client-side. A row is returned only immediately after
// its own successful INSERT, so a duplicate or preference-suppressed
// event always produces zero rows — never a push.
//
// Never throws: a notification failure must not reverse or block the
// booking/review action that already succeeded (Stage 2 Phase 2
// requirement). Every failure path here is caught and logged instead.

export interface RpcNotificationRow {
  user_id: string;
  type: string;
  title: string;
  body: string;
  related_booking_id: string | null;
}

export interface NotificationRpcResult {
  data: RpcNotificationRow[] | null;
  error: { message: string } | null;
}

// PromiseLike, not Promise: supabase-js's `.rpc()` returns a thenable
// query-builder object (awaitable, but not a literal Promise — it has no
// .catch()/.finally() in its own type), so the real wiring in
// notification-service.ts can pass `supabase.rpc(fn, args)` straight
// through without an extra wrapper or type assertion.
export type NotificationRpcCaller = (
  fnName: 'create_booking_notification_v2' | 'create_review_notification_v2',
  args: Record<string, unknown>,
) => PromiseLike<NotificationRpcResult>;

export type PushDispatcher = (
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
) => Promise<void>;

export interface TriggerNotificationRpcDeps {
  callRpc: NotificationRpcCaller;
  dispatchPush: PushDispatcher;
  onError?: (context: string, error: unknown) => void;
}

export async function triggerNotificationRpc(
  fnName: 'create_booking_notification_v2' | 'create_review_notification_v2',
  args: Record<string, unknown>,
  deps: TriggerNotificationRpcDeps,
): Promise<void> {
  const logError = deps.onError ?? ((context: string, error: unknown) => console.error(context, error));

  let result: NotificationRpcResult;
  try {
    result = await deps.callRpc(fnName, args);
  } catch (e) {
    logError(`[notification-rpc] ${fnName} threw for ${JSON.stringify(args)}`, e);
    return;
  }

  if (result.error) {
    logError(`[notification-rpc] ${fnName} returned an error for ${JSON.stringify(args)}`, result.error);
    return;
  }

  const rows = Array.isArray(result.data) ? result.data : [];
  for (const row of rows) {
    deps.dispatchPush(row.user_id, row.title, row.body, { type: row.type }).catch((e) =>
      logError(`[notification-rpc] push dispatch failed for ${row.type} (${fnName})`, e),
    );
  }
}

// ─── Push delivery confirmation ─────────────────────────────────────────────
//
// send-push can report failure two ways: throwing (network error reaching
// it at all), or resolving normally with a non-OK HTTP status (401/403
// unauthorized, 502 "delivery failed, not claimed — safe to retry", etc).
// dispatchPush (notification-service.ts) must treat both the same way —
// as a failure the caller above needs to log — rather than only catching
// a thrown error and silently treating a non-OK response as success. This
// throws so the existing `.catch()` wiring at each call site (above, and
// the one in sendNotification()) catches it uniformly.
export function assertPushDeliverySucceeded(ok: boolean, status: number, bodyText: string): void {
  if (!ok) {
    throw new Error(`send-push responded ${status}: ${bodyText}`);
  }
}
