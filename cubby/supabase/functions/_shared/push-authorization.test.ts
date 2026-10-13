// Run with: node --experimental-strip-types --test supabase/functions/_shared/push-authorization.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveAuthMethod,
  authorizeClientPush,
  PUSH_MATCH_WINDOW_MS,
  type RecentNotificationLookupArgs,
  type RelationshipCheckArgs,
  type MatchedNotification,
  type ClientPushDependencies,
} from './push-authorization.ts';

// ─── resolveAuthMethod (unchanged from round 1) ─────────────────────────────

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

function makeDeps(opts: {
  match?: MatchedNotification | null;
  relationshipResult?: boolean | ((args: RelationshipCheckArgs) => boolean);
  claimResult?: boolean;
  calls?: { lookup: RecentNotificationLookupArgs[]; relationship: RelationshipCheckArgs[]; claim: string[] };
}): ClientPushDependencies {
  const calls = opts.calls ?? { lookup: [], relationship: [], claim: [] };
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
    claim: async (id) => {
      calls.claim.push(id);
      return opts.claimResult ?? true;
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
});

// ─── authorizeClientPush: unrelated caller (gap #1 closed this round) ──────

test('authorizeClientPush: UNRELATED CALLER — real, recent, correctly-worded notification exists, but caller has no relationship to it', async () => {
  const calls = { lookup: [], relationship: [], claim: [] } as any;
  const deps = makeDeps({
    match: { id: 'notif-1', type: 'booking_cancelled', relatedBookingId: 'booking-1' },
    relationshipResult: false, // caller is a total stranger to this booking
    calls,
  });

  const result = await authorizeClientPush(
    { callerId: 'stranger-1', userId: 'traveller-victim', title: 'Booking cancelled', body: 'A traveller cancelled their upcoming booking with you.' },
    deps, NOW,
  );

  assert.equal(result.authorized, false);
  assert.equal(result.reason, 'caller_not_related_to_notification');
  assert.equal(calls.claim.length, 0, 'an unrelated caller must never consume the single-use claim');
});

test('authorizeClientPush: unrelated caller cannot even partially succeed by knowing static copy for a DIFFERENT real recipient', async () => {
  // Static-copy types (identical text for every occurrence) were exactly
  // the case the pre-round-2 fix left open: content matched, but nothing
  // bound the caller to this specific target. Confirm the relationship
  // check is actually consulted with the real recipient/caller pair.
  const calls = { lookup: [], relationship: [], claim: [] } as any;
  const deps = makeDeps({
    match: { id: 'notif-2', type: 'booking_confirmed', relatedBookingId: 'booking-2' },
    relationshipResult: (args: RelationshipCheckArgs) => args.callerId === 'the-real-host',
    calls,
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
});

// ─── authorizeClientPush: replay (gap #2 closed this round) ────────────────

test('authorizeClientPush: REPLAY — the same notification cannot authorize a second push', async () => {
  let claimed = false;
  const deps: ClientPushDependencies = {
    lookup: async () => ({ id: 'notif-3', type: 'review_received', relatedBookingId: 'booking-3' }),
    checkRelationship: async () => true,
    claim: async () => {
      if (claimed) return false; // already used
      claimed = true;
      return true;
    },
  };

  const first = await authorizeClientPush(
    { callerId: 'traveller-1', userId: 'host-user-1', title: 'Jane reviewed your listing', body: '⭐ You got a 5-star review!' },
    deps, NOW,
  );
  assert.equal(first.authorized, true);

  const second = await authorizeClientPush(
    { callerId: 'traveller-1', userId: 'host-user-1', title: 'Jane reviewed your listing', body: '⭐ You got a 5-star review!' },
    deps, NOW,
  );
  assert.equal(second.authorized, false);
  assert.equal(second.reason, 'notification_already_used');
});

test('authorizeClientPush: a rejected unrelated-caller attempt does not block the later legitimate push', async () => {
  // Order-of-operations regression test: claim must happen AFTER the
  // relationship check, never before, or an attacker could grief a real
  // notification by "using it up" with a doomed, unrelated request.
  const calls = { lookup: [], relationship: [], claim: [] } as any;
  let notificationClaimed = false;
  const deps: ClientPushDependencies = {
    lookup: async (args) => {
      calls.lookup.push(args);
      return { id: 'notif-4', type: 'booking_cancelled', relatedBookingId: 'booking-4' };
    },
    checkRelationship: async (args) => {
      calls.relationship.push(args);
      return args.callerId === 'real-traveller';
    },
    claim: async (id) => {
      calls.claim.push(id);
      if (notificationClaimed) return false;
      notificationClaimed = true;
      return true;
    },
  };

  const attackerAttempt = await authorizeClientPush(
    { callerId: 'random-stranger', userId: 'host-user-1', title: 'Booking cancelled', body: 'A traveller cancelled their upcoming booking with you.' },
    deps, NOW,
  );
  assert.equal(attackerAttempt.authorized, false);
  assert.equal(attackerAttempt.reason, 'caller_not_related_to_notification');
  assert.equal(notificationClaimed, false, 'unrelated attempt must not consume the claim');

  const legitimateAttempt = await authorizeClientPush(
    { callerId: 'real-traveller', userId: 'host-user-1', title: 'Booking cancelled', body: 'A traveller cancelled their upcoming booking with you.' },
    deps, NOW,
  );
  assert.equal(legitimateAttempt.authorized, true);
});

// ─── authorizeClientPush: legitimate cross-user notifications still work ───

test('authorizeClientPush: legitimate self-push never needs the relationship DB call', async () => {
  const calls = { lookup: [], relationship: [], claim: [] } as any;
  const deps = makeDeps({
    match: { id: 'notif-5', type: 'verification_approved', relatedBookingId: null },
    calls,
  });

  const result = await authorizeClientPush(
    { callerId: 'user-1', userId: 'user-1', title: 'Verification approved', body: 'You are verified.' },
    deps, NOW,
  );

  assert.equal(result.authorized, true);
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

// ─── window boundary (unchanged behavior from round 1) ──────────────────────

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
