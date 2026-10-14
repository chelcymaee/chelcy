// Run with: node --experimental-strip-types --test src/lib/notification-rpc.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  triggerNotificationRpc,
  type NotificationRpcResult,
  type RpcNotificationRow,
} from './notification-rpc.ts';

function makeDeps(opts: {
  rpcResult?: NotificationRpcResult;
  rpcThrows?: unknown;
  pushThrows?: boolean;
}) {
  const calls = { rpc: [] as Array<{ fn: string; args: Record<string, unknown> }>, push: [] as Array<{ userId: string; title: string; body: string; data?: Record<string, unknown> }>, errors: [] as Array<{ context: string; error: unknown }> };

  return {
    calls,
    deps: {
      callRpc: async (fnName: 'create_booking_notification' | 'create_review_notification', args: Record<string, unknown>) => {
        calls.rpc.push({ fn: fnName, args });
        if (opts.rpcThrows !== undefined) throw opts.rpcThrows;
        return opts.rpcResult ?? { data: null, error: null };
      },
      dispatchPush: async (userId: string, title: string, body: string, data?: Record<string, unknown>) => {
        calls.push.push({ userId, title, body, data });
        if (opts.pushThrows) throw new Error('push failed');
      },
      onError: (context: string, error: unknown) => {
        calls.errors.push({ context, error });
      },
    },
  };
}

// ─── Booking flow failures must never throw ────────────────────────────────

test('triggerNotificationRpc: RPC throws — logged, does not propagate, no push attempted', async () => {
  const { deps, calls } = makeDeps({ rpcThrows: new Error('network error') });

  await assert.doesNotReject(
    triggerNotificationRpc('create_booking_notification', { p_booking_id: 'b1', p_event: 'booking_confirmed' }, deps),
  );

  assert.equal(calls.push.length, 0);
  assert.equal(calls.errors.length, 1);
  assert.match(calls.errors[0].context, /create_booking_notification threw/);
});

test('triggerNotificationRpc: RPC returns an error field — logged, does not throw, no push attempted', async () => {
  const { deps, calls } = makeDeps({ rpcResult: { data: null, error: { message: 'not authorized: caller is not the host for this booking event' } } });

  await assert.doesNotReject(
    triggerNotificationRpc('create_booking_notification', { p_booking_id: 'b1', p_event: 'booking_confirmed' }, deps),
  );

  assert.equal(calls.push.length, 0);
  assert.equal(calls.errors.length, 1);
  assert.match(calls.errors[0].context, /returned an error/);
});

// ─── Current production shape (RETURNS void -> data: null) ────────────────

test('triggerNotificationRpc: current deployed RPC shape (data: null, no error) — no push, no error logged', async () => {
  const { deps, calls } = makeDeps({ rpcResult: { data: null, error: null } });

  await triggerNotificationRpc('create_booking_notification', { p_booking_id: 'b1', p_event: 'booking_cancelled' }, deps);

  assert.equal(calls.push.length, 0);
  assert.equal(calls.errors.length, 0);
});

// ─── Future production shape (PHASE1_RPC_RETURN_VALUES.sql applied) ───────

test('triggerNotificationRpc: one returned row -> exactly one push dispatched with that row\'s own content', async () => {
  const row: RpcNotificationRow = {
    user_id: 'traveller-1', type: 'booking_confirmed', title: 'Booking confirmed ✅',
    body: 'Your host accepted your booking. Check your bookings for the drop-off PIN.', related_booking_id: 'b1',
  };
  const { deps, calls } = makeDeps({ rpcResult: { data: [row], error: null } });

  await triggerNotificationRpc('create_booking_notification', { p_booking_id: 'b1', p_event: 'booking_confirmed' }, deps);

  assert.equal(calls.push.length, 1);
  assert.deepEqual(calls.push[0], { userId: 'traveller-1', title: row.title, body: row.body, data: { type: 'booking_confirmed' } });
});

test('triggerNotificationRpc: THREE returned rows (review_received + milestone + reciprocal review_request) -> three pushes, correct content each', async () => {
  const rows: RpcNotificationRow[] = [
    { user_id: 'host-1', type: 'review_received', title: 'Jane reviewed your listing', body: '⭐ You got a 5-star review!', related_booking_id: 'b2' },
    { user_id: 'host-1', type: 'milestone_reached', title: '🏆 Milestone: 10 reviews', body: "You're a well-established Cubby host!", related_booking_id: 'b2' },
    { user_id: 'host-1', type: 'review_request', title: 'Jane just reviewed you', body: 'Now review them — it only takes 30 seconds.', related_booking_id: 'b2' },
  ];
  const { deps, calls } = makeDeps({ rpcResult: { data: rows, error: null } });

  await triggerNotificationRpc('create_review_notification', { p_booking_id: 'b2', p_reviewed_party: 'host' }, deps);

  assert.equal(calls.push.length, 3);
  assert.deepEqual(calls.push.map((c) => c.title), rows.map((r) => r.title));
  assert.deepEqual(calls.push.map((c) => c.body), rows.map((r) => r.body));
});

test('triggerNotificationRpc: empty-array result (e.g. preference opted out, or dedup suppressed) -> zero pushes, no error', async () => {
  const { deps, calls } = makeDeps({ rpcResult: { data: [], error: null } });

  await triggerNotificationRpc('create_review_notification', { p_booking_id: 'b3', p_reviewed_party: 'traveller' }, deps);

  assert.equal(calls.push.length, 0);
  assert.equal(calls.errors.length, 0);
});

// ─── A push failure must also never throw, and must not block other rows ──

test('triggerNotificationRpc: a push dispatch failure is logged but does not throw and does not stop other rows from being attempted', async () => {
  const rows: RpcNotificationRow[] = [
    { user_id: 'host-1', type: 'review_received', title: 'A', body: 'B', related_booking_id: 'b4' },
    { user_id: 'host-1', type: 'review_request', title: 'C', body: 'D', related_booking_id: 'b4' },
  ];
  const { deps, calls } = makeDeps({ rpcResult: { data: rows, error: null }, pushThrows: true });

  await assert.doesNotReject(
    triggerNotificationRpc('create_review_notification', { p_booking_id: 'b4', p_reviewed_party: 'host' }, deps),
  );

  // Both pushes were attempted even though each one "failed" internally.
  assert.equal(calls.push.length, 2);
});

// ─── Correct args passed through verbatim ──────────────────────────────────

test('triggerNotificationRpc: passes fnName and args through to callRpc unchanged', async () => {
  const { deps, calls } = makeDeps({ rpcResult: { data: null, error: null } });

  await triggerNotificationRpc('create_booking_notification', { p_booking_id: 'xyz', p_event: 'booking_declined_legacy' }, deps);

  assert.equal(calls.rpc.length, 1);
  assert.deepEqual(calls.rpc[0], { fn: 'create_booking_notification', args: { p_booking_id: 'xyz', p_event: 'booking_declined_legacy' } });
});
