// Run with: node --experimental-strip-types --test supabase/functions/_shared/push-authorization.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveAuthMethod,
  authorizeClientPush,
  countSuccessfulExpoTickets,
  PUSH_MATCH_WINDOW_MS,
  type RecentNotificationLookupArgs,
  type RelationshipCheckArgs,
  type MatchedNotification,
  type ClientPushDependencies,
} from './push-authorization.ts';

// ─── resolveAuthMethod (unchanged) ──────────────────────────────────────────

test('resolveAuthMethod: admin secret header match wins even if a user is also signed in', () => {
  const method = resolveAuthMethod({
    adminSecretHeader: 'super-secret',
    adminSecretEnv: 'super-secret',
    adminSessionOk: false,
    signedInUserId: 'user-123',
  });
  assert.equal(method, 'admin_secret');
});

test('resolveAuthMethod: wrong admin secret does not match, falls through', () => {
  const method = resolveAuthMethod({
    adminSecretHeader: 'wrong-guess',
    adminSecretEnv: 'super-secret',
    adminSessionOk: false,
    signedInUserId: null,
  });
  assert.equal(method, 'unauthenticated');
});

test('resolveAuthMethod: admin session used when no admin secret present', () => {
  const method = resolveAuthMethod({
    adminSecretHeader: null,
    adminSecretEnv: 'super-secret',
    adminSessionOk: true,
    signedInUserId: null,
  });
  assert.equal(method, 'admin_session');
});

test('resolveAuthMethod: plain signed-in user falls to client_jwt', () => {
  const method = resolveAuthMethod({
    adminSecretHeader: null,
    adminSecretEnv: 'super-secret',
    adminSessionOk: false,
    signedInUserId: 'user-123',
  });
  assert.equal(method, 'client_jwt');
});

test('resolveAuthMethod: nothing matches -> unauthenticated', () => {
  const method = resolveAuthMethod({
    adminSecretHeader: null,
    adminSecretEnv: undefined,
    adminSessionOk: false,
    signedInUserId: null,
  });
  assert.equal(method, 'unauthenticated');
});

// ─── Test helpers ───────────────────────────────────────────────────────────
//
// NOTE: ClientPushDependencies no longer includes a `claim` function —
// authorizeClientPush deliberately never claims a notification itself (see
// the file header for why: claiming before confirmed Expo delivery can
// permanently lose a legitimate notification). The single-use claim is now
// index.ts's responsibility, called only after a successful push send,
// which isn't unit-testable here without Deno — verified instead by
// reading send-push/index.ts's control flow directly and by the live,
// rollback-wrapped SQL checks run against production this session (claim
// succeeds once, a second claim attempt on the same row affects zero
// rows).

function makeDeps(opts: {
  match?: MatchedNotification | null;
  relationshipResult?: boolean | ((args: RelationshipCheckArgs) => boolean);
  calls?: { lookup: RecentNotificationLookupArgs[]; relationship: RelationshipCheckArgs[] };
}): ClientPushDependencies {
  const calls = opts.calls ?? { lookup: [], relationship: [] };
  return {
    lookup: async (args) => {
      calls.lookup.push(args);
      return opts.match ?? null;
    },
    checkRelationship: async (args) => {
      calls.relationship.push(args);
      if (typeof opts.relationshipResult === 'function') return opts.relationshipResult(args);
      return opts.relationshipResult ?? false;
    },
  };
}

const NOW = '2026-10-13T10:00:00.000Z';

// ─── authorizeClientPush: no matching content (original vulnerability) ─────

test('authorizeClientPush: THE ORIGINAL VULNERABILITY — no matching row at all is rejected', async () => {
  const deps = makeDeps({ match: null });
  const result = await authorizeClientPush(
    { callerId: 'attacker-1', userId: 'victim-999', title: 'You just won a free upgrade!', body: 'Click here to claim.' },
    deps, NOW,
  );
  assert.equal(result.authorized, false);
  assert.equal(result.reason, 'no_matching_authorized_notification');
  assert.equal(result.notificationId, undefined);
});

// ─── authorizeClientPush: unrelated caller ──────────────────────────────────

test('authorizeClientPush: UNRELATED CALLER — real, recent, correctly-worded notification exists, but caller has no relationship to it', async () => {
  const deps = makeDeps({
    match: { id: 'notif-1', type: 'booking_cancelled', relatedBookingId: 'booking-1' },
    relationshipResult: false, // caller is a total stranger to this booking
  });

  const result = await authorizeClientPush(
    { callerId: 'stranger-1', userId: 'traveller-victim', title: 'Booking cancelled', body: 'A traveller cancelled their upcoming booking with you.' },
    deps, NOW,
  );

  assert.equal(result.authorized, false);
  assert.equal(result.reason, 'caller_not_related_to_notification');
  assert.equal(result.notificationId, undefined);
});

test('authorizeClientPush: unrelated caller cannot succeed by knowing static copy for a DIFFERENT real recipient', async () => {
  // Static-copy types (identical text for every occurrence) were exactly
  // the case the round-1 fix left open: content matched, but nothing
  // bound the caller to this specific target. Confirm the relationship
  // check is actually consulted with the real recipient/caller pair.
  const deps = makeDeps({
    match: { id: 'notif-2', type: 'booking_confirmed', relatedBookingId: 'booking-2' },
    relationshipResult: (args: RelationshipCheckArgs) => args.callerId === 'the-real-host',
  });

  const rejected = await authorizeClientPush(
    { callerId: 'random-other-host', userId: 'traveller-x', title: 'Booking confirmed ✅', body: 'Your host accepted your booking. Check your bookings for the drop-off PIN.' },
    deps, NOW,
  );
  assert.equal(rejected.authorized, false);
  assert.equal(rejected.reason, 'caller_not_related_to_notification');

  const accepted = await authorizeClientPush(
    { callerId: 'the-real-host', userId: 'traveller-x', title: 'Booking confirmed ✅', body: 'Your host accepted your booking. Check your bookings for the drop-off PIN.' },
    deps, NOW,
  );
  assert.equal(accepted.authorized, true);
  assert.equal(accepted.notificationId, 'notif-2');
});

// ─── authorizeClientPush: replay — enforced at the DB/index.ts layer, not here ─

test('authorizeClientPush: REPLAY — once the real DB excludes a claimed row, lookup returning null correctly re-rejects', async () => {
  // authorizeClientPush itself has no memory between calls — single-use is
  // enforced by the real lookup's `pushed_at IS NULL` filter in index.ts.
  // This test documents that contract: once a row is claimed (simulated
  // here by the second lookup call returning null, exactly as the real
  // `.is('pushed_at', null)` filter would produce), authorization
  // correctly fails on the "replay".
  let callCount = 0;
  const deps: ClientPushDependencies = {
    lookup: async () => {
      callCount += 1;
      return callCount === 1 ? { id: 'notif-3', type: 'review_received', relatedBookingId: 'booking-3' } : null;
    },
    checkRelationship: async () => true,
  };

  const first = await authorizeClientPush(
    { callerId: 'traveller-1', userId: 'host-user-1', title: 'Jane reviewed your listing', body: '⭐ You got a 5-star review!' },
    deps, NOW,
  );
  assert.equal(first.authorized, true);
  assert.equal(first.notificationId, 'notif-3');

  const second = await authorizeClientPush(
    { callerId: 'traveller-1', userId: 'host-user-1', title: 'Jane reviewed your listing', body: '⭐ You got a 5-star review!' },
    deps, NOW,
  );
  assert.equal(second.authorized, false);
  assert.equal(second.reason, 'no_matching_authorized_notification');
});

test('authorizeClientPush: an unrelated caller\'s rejected attempt never affects a later legitimate lookup', async () => {
  // Since authorizeClientPush never claims anything, this is now
  // structurally guaranteed rather than something to race-test — but
  // confirm the same mocked (always-unclaimed) match still authorizes the
  // real caller after a stranger's attempt was rejected.
  const deps = makeDeps({
    match: { id: 'notif-4', type: 'booking_cancelled', relatedBookingId: 'booking-4' },
    relationshipResult: (args) => args.callerId === 'real-traveller',
  });

  const attackerAttempt = await authorizeClientPush(
    { callerId: 'random-stranger', userId: 'host-user-1', title: 'Booking cancelled', body: 'A traveller cancelled their upcoming booking with you.' },
    deps, NOW,
  );
  assert.equal(attackerAttempt.authorized, false);

  const legitimateAttempt = await authorizeClientPush(
    { callerId: 'real-traveller', userId: 'host-user-1', title: 'Booking cancelled', body: 'A traveller cancelled their upcoming booking with you.' },
    deps, NOW,
  );
  assert.equal(legitimateAttempt.authorized, true);
  assert.equal(legitimateAttempt.notificationId, 'notif-4');
});

// ─── authorizeClientPush: legitimate cross-user notifications still work ───

test('authorizeClientPush: legitimate self-push never needs the relationship DB call', async () => {
  const calls = { lookup: [], relationship: [] } as any;
  const deps = makeDeps({
    match: { id: 'notif-5', type: 'verification_approved', relatedBookingId: null },
    calls,
  });

  const result = await authorizeClientPush(
    { callerId: 'user-1', userId: 'user-1', title: 'Verification approved', body: 'You are verified.' },
    deps, NOW,
  );

  assert.equal(result.authorized, true);
  assert.equal(result.notificationId, 'notif-5');
  assert.equal(calls.relationship.length, 0, 'self-push should skip the relationship DB round trip entirely');
});

test('authorizeClientPush: legitimate host-to-traveller push (booking_confirmed) succeeds', async () => {
  const deps = makeDeps({
    match: { id: 'notif-6', type: 'booking_confirmed', relatedBookingId: 'booking-6' },
    relationshipResult: (args) => args.callerId === 'host-1' && args.recipientId === 'traveller-1' && args.relatedBookingId === 'booking-6',
  });

  const result = await authorizeClientPush(
    { callerId: 'host-1', userId: 'traveller-1', title: 'Booking confirmed ✅', body: 'Your host accepted your booking. Check your bookings for the drop-off PIN.' },
    deps, NOW,
  );
  assert.equal(result.authorized, true);
  assert.equal(result.notificationId, 'notif-6');
});

test('authorizeClientPush: legitimate traveller-to-host push (booking_cancelled) succeeds', async () => {
  const deps = makeDeps({
    match: { id: 'notif-7', type: 'booking_cancelled', relatedBookingId: 'booking-7' },
    relationshipResult: (args) => args.callerId === 'traveller-2' && args.recipientId === 'host-user-2',
  });

  const result = await authorizeClientPush(
    { callerId: 'traveller-2', userId: 'host-user-2', title: 'Booking cancelled', body: 'A traveller cancelled their upcoming booking with you.' },
    deps, NOW,
  );
  assert.equal(result.authorized, true);
});

test('authorizeClientPush: milestone_reached (no related_booking_id) still authorizes via shared booking history', async () => {
  // Matches the real client exactly: sendNotification() for milestone_reached
  // never passes relatedBookingId at all.
  const deps = makeDeps({
    match: { id: 'notif-8', type: 'milestone_reached', relatedBookingId: null },
    relationshipResult: (args) => args.type === 'milestone_reached' && args.callerId === 'traveller-3',
  });

  const result = await authorizeClientPush(
    { callerId: 'traveller-3', userId: 'host-user-3', title: '🏆 Milestone: First 5 reviews', body: 'Your reputation is growing!' },
    deps, NOW,
  );
  assert.equal(result.authorized, true);
});

test('authorizeClientPush: milestone_reached rejected for a caller with zero shared booking history', async () => {
  const deps = makeDeps({
    match: { id: 'notif-9', type: 'milestone_reached', relatedBookingId: null },
    relationshipResult: false,
  });

  const result = await authorizeClientPush(
    { callerId: 'never-booked-with-this-host', userId: 'host-user-4', title: '🏆 Milestone: 10 reviews', body: "You're a well-established Cubby host!" },
    deps, NOW,
  );
  assert.equal(result.authorized, false);
  assert.equal(result.reason, 'caller_not_related_to_notification');
});

// ─── window boundary (unchanged) ────────────────────────────────────────────

test('authorizeClientPush: passes the correct recency window to the lookup', async () => {
  let receivedSinceIso = '';
  const deps = makeDeps({ match: null });
  deps.lookup = async (args) => {
    receivedSinceIso = args.sinceIso;
    return null;
  };

  await authorizeClientPush({ callerId: 'u1', userId: 'u1', title: 't', body: 'b' }, deps, '2026-10-13T10:05:00.000Z');

  const expectedSince = new Date(new Date('2026-10-13T10:05:00.000Z').getTime() - PUSH_MATCH_WINDOW_MS).toISOString();
  assert.equal(receivedSinceIso, expectedSince);
});

// ─── countSuccessfulExpoTickets ──────────────────────────────────────────────
//
// THE SPECIFIC BUG THIS COVERS: Expo's push API returns HTTP 200 even when
// every individual ticket failed (e.g. DeviceNotRegistered) — a 200 status
// alone is not proof of delivery. These tests exist because send-push's
// earlier draft treated `pushRes.ok` as "delivered" and would have claimed
// (and reported success for) a notification Expo never actually sent.

test('countSuccessfulExpoTickets: all tickets ok', () => {
  const n = countSuccessfulExpoTickets({ data: [{ status: 'ok', id: 'a' }, { status: 'ok', id: 'b' }] });
  assert.equal(n, 2);
});

test('countSuccessfulExpoTickets: THE BUG — HTTP 200 body with every ticket errored must count as zero', () => {
  const n = countSuccessfulExpoTickets({
    data: [
      { status: 'error', message: 'DeviceNotRegistered', details: { error: 'DeviceNotRegistered' } },
      { status: 'error', message: 'MessageTooBig' },
    ],
  });
  assert.equal(n, 0);
});

test('countSuccessfulExpoTickets: mixed success/failure counts only the successes', () => {
  const n = countSuccessfulExpoTickets({
    data: [
      { status: 'ok', id: 'a' },
      { status: 'error', message: 'DeviceNotRegistered' },
      { status: 'ok', id: 'c' },
    ],
  });
  assert.equal(n, 2);
});

test('countSuccessfulExpoTickets: request-level error response (no data field) counts as zero', () => {
  const n = countSuccessfulExpoTickets({ errors: [{ code: 'API_ERROR', message: 'Invalid request' }] });
  assert.equal(n, 0);
});

test('countSuccessfulExpoTickets: malformed/empty bodies all count as zero', () => {
  assert.equal(countSuccessfulExpoTickets(null), 0);
  assert.equal(countSuccessfulExpoTickets(undefined), 0);
  assert.equal(countSuccessfulExpoTickets('not an object'), 0);
  assert.equal(countSuccessfulExpoTickets({}), 0);
  assert.equal(countSuccessfulExpoTickets({ data: 'not an array' }), 0);
  assert.equal(countSuccessfulExpoTickets({ data: [] }), 0);
  assert.equal(countSuccessfulExpoTickets({ data: [null, undefined] }), 0);
});
