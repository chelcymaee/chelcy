// Run with: node --experimental-strip-types --test supabase/functions/_shared/push-authorization.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveAuthMethod,
  authorizeClientPush,
  PUSH_MATCH_WINDOW_MS,
  type RecentNotificationLookupArgs,
} from './push-authorization.ts';

// ─── resolveAuthMethod ──────────────────────────────────────────────────────

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

test('resolveAuthMethod: unset ADMIN_SECRET env never matches, even if header happens to be empty-string equal', () => {
  const method = resolveAuthMethod({
    adminSecretHeader: '',
    adminSecretEnv: undefined,
    adminSessionOk: false,
    signedInUserId: 'user-123',
  });
  assert.equal(method, 'client_jwt');
});

// ─── authorizeClientPush — the actual vulnerability fix ────────────────────

test('authorizeClientPush: legitimate case — caller pushes content matching their own just-inserted notification row', async () => {
  const calls: RecentNotificationLookupArgs[] = [];
  const lookup = async (args: RecentNotificationLookupArgs) => {
    calls.push(args);
    return { found: args.userId === 'traveller-1' && args.title === 'Booking cancelled' };
  };

  const result = await authorizeClientPush(
    { userId: 'traveller-1', title: 'Booking cancelled', body: 'A traveller cancelled their upcoming booking with you.' },
    lookup,
    '2026-10-13T10:00:00.000Z',
  );

  assert.equal(result.authorized, true);
  assert.equal(result.reason, 'matched_existing_notification');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].userId, 'traveller-1');
});

test('authorizeClientPush: THE VULNERABILITY — arbitrary recipient with no matching row is rejected', async () => {
  // No notification row exists for this user/title/body combination at all —
  // this is exactly the attack the original report described: an
  // authenticated caller picks an arbitrary user_id and arbitrary text.
  const lookup = async (_args: RecentNotificationLookupArgs) => ({ found: false });

  const result = await authorizeClientPush(
    { userId: 'victim-999', title: 'You just won a free upgrade!', body: 'Click here to claim.' },
    lookup,
    '2026-10-13T10:00:00.000Z',
  );

  assert.equal(result.authorized, false);
  assert.equal(result.reason, 'no_matching_authorized_notification');
});

test('authorizeClientPush: passes the correct recency window to the lookup', async () => {
  let receivedSinceIso = '';
  const lookup = async (args: RecentNotificationLookupArgs) => {
    receivedSinceIso = args.sinceIso;
    return { found: true };
  };

  const nowIso = '2026-10-13T10:05:00.000Z';
  await authorizeClientPush(
    { userId: 'u1', title: 't', body: 'b' },
    lookup,
    nowIso,
  );

  const expectedSince = new Date(new Date(nowIso).getTime() - PUSH_MATCH_WINDOW_MS).toISOString();
  assert.equal(receivedSinceIso, expectedSince);
});

test('authorizeClientPush: a stale row outside the window is correctly excluded by the lookup boundary passed in', async () => {
  // This test documents the contract: authorizeClientPush trusts the lookup
  // to apply `sinceIso` as a >= filter. We assert the boundary value itself
  // is exactly "now - window", so a lookup implementing `gte('created_at',
  // sinceIso)` will correctly exclude anything older.
  const nowIso = '2026-10-13T12:00:00.000Z';
  let capturedSince = '';
  const lookup = async (args: RecentNotificationLookupArgs) => {
    capturedSince = args.sinceIso;
    return { found: false };
  };

  await authorizeClientPush({ userId: 'u1', title: 't', body: 'b' }, lookup, nowIso);

  const diffMs = new Date(nowIso).getTime() - new Date(capturedSince).getTime();
  assert.equal(diffMs, PUSH_MATCH_WINDOW_MS);
});

test('authorizeClientPush: title/body are matched exactly, not just userId (different body does not leak a window to arbitrary text)', async () => {
  const lookup = async (args: RecentNotificationLookupArgs) => {
    // Simulate a DB that only has ONE real row for this user with specific text.
    return { found: args.title === 'Booking confirmed ✅' && args.body === 'Your host accepted your booking. Check your bookings for the drop-off PIN.' };
  };

  const legit = await authorizeClientPush(
    { userId: 'traveller-1', title: 'Booking confirmed ✅', body: 'Your host accepted your booking. Check your bookings for the drop-off PIN.' },
    lookup,
    '2026-10-13T10:00:00.000Z',
  );
  assert.equal(legit.authorized, true);

  const forged = await authorizeClientPush(
    { userId: 'traveller-1', title: 'Booking confirmed ✅', body: 'Totally different attacker-chosen body text' },
    lookup,
    '2026-10-13T10:00:00.000Z',
  );
  assert.equal(forged.authorized, false);
});
