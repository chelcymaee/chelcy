// ─── verify-admin-pin Edge Function ────────────────────────────────────────────
//
// Replaces client-side admin authentication entirely. The PIN now lives
// only in a server-side Supabase secret (ADMIN_PIN) — never
// EXPO_PUBLIC_ADMIN_PIN, never shipped in the app/web bundle. A correct
// PIN issues a short-lived, opaque session token (60 minutes, Private
// Beta value — see SESSION_TTL_MS in _shared/admin-session.ts) that every
// admin-* Edge Function then requires on every subsequent call, replacing
// the old EXPO_PUBLIC_ADMIN_SECRET header that used to gate those calls.
//
// POST   { pin: string }              -> log in, issue a session
// DELETE (Authorization: Bearer <t>)  -> log out, revoke a session
//
// Deploy: npx supabase functions deploy verify-admin-pin

import { createClient } from '../_shared/admin-session.ts';
import {
  sha256Hex,
  constantTimeEqual,
  extractClientIp,
  getRateLimitStatus,
  recordLoginAttempt,
  createAdminSession,
  revokeAdminSession,
  cleanupExpiredAdminAuth,
  MAX_ATTEMPTS,
} from '../_shared/admin-session.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // ── Logout — revoke a session, always succeed, never reveal state ──────────
  if (req.method === 'DELETE') {
    await revokeAdminSession(req, supabase);
    return json({ ok: true });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  // Cheap opportunistic cleanup on every login attempt — no scheduled job
  // needed at Private Beta scale. Runs before the rate-limit check so a
  // long-locked-out IP's own stale attempt rows still get pruned.
  await cleanupExpiredAdminAuth(supabase);

  const ip = extractClientIp(req);

  // Check lockout BEFORE looking at the submitted PIN at all — if this IP
  // is already locked out, there's no reason to do the PIN comparison
  // (wasted work, and one less thing to reason about re: timing signals).
  const preCheck = await getRateLimitStatus(supabase, ip);
  if (preCheck.locked) {
    return json({ ok: false, reason: 'locked', retryAfterSeconds: preCheck.retryAfterSeconds }, 429);
  }

  let pin: unknown;
  try {
    const body = await req.json();
    pin = body?.pin;
  } catch {
    pin = undefined;
  }

  const adminPin = Deno.env.get('ADMIN_PIN');
  if (!adminPin) {
    // Fail closed on operator misconfiguration — same discipline already
    // used for EXPO_PUBLIC_ADMIN_PIN/ADMIN_SECRET elsewhere in this repo.
    // Distinct from the generic invalid-PIN response below on purpose:
    // this is "the server isn't configured," not "you typed it wrong."
    console.error('[verify-admin-pin] ADMIN_PIN is not set — refusing all logins');
    return json({ ok: false, reason: 'not_configured' }, 500);
  }

  // Constant-time comparison via fixed-length SHA-256 digests rather than
  // a direct string ===, which is neither constant-time nor fixed-length
  // for a raw PIN comparison in V8.
  const isValidFormat = typeof pin === 'string' && pin.length > 0;
  const matches = isValidFormat
    ? constantTimeEqual(await sha256Hex(pin as string), await sha256Hex(adminPin))
    : false;

  await recordLoginAttempt(supabase, ip, matches);

  if (matches) {
    const { token, expiresAt } = await createAdminSession(supabase);
    return json({ ok: true, token, expiresAt });
  }

  const postCheck = await getRateLimitStatus(supabase, ip);
  if (postCheck.locked) {
    return json({ ok: false, reason: 'locked', retryAfterSeconds: postCheck.retryAfterSeconds }, 429);
  }

  return json({
    ok: false,
    reason: 'invalid_pin',
    attemptsRemaining: Math.max(0, MAX_ATTEMPTS - postCheck.attemptsInWindow),
  }, 401);
});
