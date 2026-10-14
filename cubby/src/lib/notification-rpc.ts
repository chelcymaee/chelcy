// Pure trigger logic for the Phase 1 notification RPCs
// (create_booking_notification / create_review_notification). Kept free of
// any import from './supabase' (which pulls in AsyncStorage/react-native)
// so this is testable under plain Node — same split used for
// supabase/functions/_shared/push-authorization.ts: the real
// Supabase/React Native wiring lives in notification-service.ts, which
// imports and calls this.
//
// Both RPCs currently `RETURNS void` in production — this module already
// expects the richer `RETURNS TABLE(...)` shape prepared in
// supabase/PHASE1_RPC_RETURN_VALUES.sql (not yet applied). Until that
// ships, `result.data` will be null/void and the `rows` loop below is
// simply empty — the in-app notification row still gets written
// correctly by the RPC either way (that part doesn't depend on the return
// value at all), only push dispatch for these specific flows is deferred
// until the return-value change is approved and applied. No further
// client change will be needed at that point.
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
  fnName: 'create_booking_notification' | 'create_review_notification',
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
  fnName: 'create_booking_notification' | 'create_review_notification',
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
