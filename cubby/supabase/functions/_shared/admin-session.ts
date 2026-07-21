// ─── Shared: admin session handling ────────────────────────────────────────────
//
// Used by verify-admin-pin (issues/revokes sessions) and every admin-*
// Edge Function (validates them). Centralized here so the actual
// session-validity check exists in exactly one place rather than seven
// near-identical copies that could quietly drift from each other.
//
// The token itself is never stored — only its SHA-256 hash, in
// admin_sessions.token_hash. A stolen database row is useless without the
// original random token; a stolen token is useless once its expiry
// passes. See supabase/schema.sql for the table definitions and the
// rationale for default-deny RLS on both of them.

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const SESSION_TTL_MS = 60 * 60 * 1000; // 60 minutes — Private Beta value, the one place it's defined
export const MAX_ATTEMPTS = 5;
export const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// ─── Hashing / constant-time comparison ────────────────────────────────────────

export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Constant-time comparison of two equal-length strings — does not
// short-circuit on the first mismatching character, so a timing attack
// can't learn where two values diverge. Callers should pass fixed-length
// hex digests (e.g. from sha256Hex), not raw variable-length secrets —
// comparing raw strings directly would leak their length even with this
// function, since a length mismatch still returns immediately below.
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// ─── Client IP extraction (for rate limiting) ──────────────────────────────────
//
// Rate limiting only means something if the IP it buckets by is hard for
// the caller to control — otherwise an attacker just rotates the header
// on every request and never accumulates a lockout. Supabase Edge
// Functions run behind Supabase's own gateway (Cloudflare), which is the
// layer actually terminating the client's connection:
//
//   - cf-connecting-ip is set by Cloudflare at their edge and overwritten
//     regardless of what a client sends — the strongest signal available.
//   - x-forwarded-for is a comma-separated hop chain where each proxy is
//     expected to APPEND its own observed address; the LAST entry is the
//     one appended by the closest hop to us and is the harder one to
//     forge, while the FIRST entry is exactly what the original client
//     supplied and is trivially spoofable. (This is the opposite of what
//     payfast-itn's own IP check does — that's fine there, since it's
//     comparing against PayFast's published IP list rather than using the
//     value as a rate-limit bucket key an attacker benefits from rotating.)
//
// This assumes Supabase's production edge network is actually what's
// setting these headers on the way in, which hasn't been independently
// confirmed from this environment — treat IP attribution here as
// best-effort, not a guarantee. The 5-attempt/15-minute cap itself is what
// actually bounds the damage even if attribution is imperfect. If no IP
// signal is present at all, every such request shares one fallback bucket
// ('unknown') rather than skipping rate limiting — failing closed
// (more restrictive) instead of open.
export function extractClientIp(req: Request): string {
  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();

  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const hops = forwardedFor.split(',').map(h => h.trim()).filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1];
  }

  return 'unknown';
}

// ─── Rate limiting ──────────────────────────────────────────────────────────

export interface RateLimitStatus {
  locked: boolean;
  retryAfterSeconds: number;
  attemptsInWindow: number;
}

// admin_login_attempts is append-only — this is a COUNT over the trailing
// window, never a read-modify-write counter, so there's no lock
// contention or race between concurrent requests to reason about.
export async function getRateLimitStatus(supabase: SupabaseClient, ip: string): Promise<RateLimitStatus> {
  const windowStart = new Date(Date.now() - LOCKOUT_WINDOW_MS).toISOString();
  const { data, error } = await supabase
    .from('admin_login_attempts')
    .select('created_at')
    .eq('ip', ip)
    .eq('success', false)
    .gte('created_at', windowStart)
    .order('created_at', { ascending: true });

  if (error || !data) return { locked: false, retryAfterSeconds: 0, attemptsInWindow: 0 };

  const attemptsInWindow = data.length;
  if (attemptsInWindow < MAX_ATTEMPTS) {
    return { locked: false, retryAfterSeconds: 0, attemptsInWindow };
  }

  // Locked until LOCKOUT_WINDOW_MS after the attempt that tipped it over
  // the limit (the MAX_ATTEMPTSth failure) — not from "now" — so the
  // lockout duration doesn't keep resetting on every subsequent request
  // made during the lockout window.
  const tippingAttempt = data[MAX_ATTEMPTS - 1];
  const lockedUntil = new Date(tippingAttempt.created_at).getTime() + LOCKOUT_WINDOW_MS;
  const retryAfterSeconds = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
  return { locked: retryAfterSeconds > 0, retryAfterSeconds, attemptsInWindow };
}

export async function recordLoginAttempt(supabase: SupabaseClient, ip: string, success: boolean): Promise<void> {
  await supabase.from('admin_login_attempts').insert({ ip, success });
}

// ─── Session issuance / validation / revocation ────────────────────────────────

export async function createAdminSession(supabase: SupabaseClient): Promise<{ token: string; expiresAt: string }> {
  const tokenBytes = new Uint8Array(32);
  crypto.getRandomValues(tokenBytes);
  const token = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  const { error } = await supabase.from('admin_sessions').insert({ token_hash: tokenHash, expires_at: expiresAt });
  if (error) throw error;

  return { token, expiresAt };
}

export interface AdminSessionCheck {
  ok: boolean;
}

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  return token || null;
}

// Validates the Authorization: Bearer <token> header against
// admin_sessions. Missing header, malformed header, unknown token hash,
// and an expired-but-still-present row are all indistinguishable to the
// caller — every case returns the same {ok: false}, and every admin-*
// function turns that into the same generic 401 response — so nothing
// here can be used to probe whether a given token used to be valid.
export async function requireAdminSession(req: Request, supabase: SupabaseClient): Promise<AdminSessionCheck> {
  const token = extractBearerToken(req);
  if (!token) return { ok: false };

  const tokenHash = await sha256Hex(token);
  const { data, error } = await supabase
    .from('admin_sessions')
    .select('expires_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (error || !data) return { ok: false };
  if (new Date(data.expires_at).getTime() <= Date.now()) return { ok: false };

  return { ok: true };
}

// Revocation is a hard DELETE, not a status flag — a revoked token and a
// never-issued one end up in exactly the same state (no row), which is
// what keeps requireAdminSession's responses indistinguishable above for
// free, with no extra "was this revoked" branch to keep in sync.
export async function revokeAdminSession(req: Request, supabase: SupabaseClient): Promise<void> {
  const token = extractBearerToken(req);
  if (!token) return;
  const tokenHash = await sha256Hex(token);
  await supabase.from('admin_sessions').delete().eq('token_hash', tokenHash);
}

// Opportunistic cleanup — called once per login attempt (see
// verify-admin-pin), not on a schedule. Two bounded DELETEs; no
// cron/pg_net infrastructure needed at Private Beta scale.
export async function cleanupExpiredAdminAuth(supabase: SupabaseClient): Promise<void> {
  const now = new Date().toISOString();
  const attemptCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await Promise.all([
    supabase.from('admin_sessions').delete().lt('expires_at', now),
    supabase.from('admin_login_attempts').delete().lt('created_at', attemptCutoff),
  ]);
}

// Re-exported so admin-* functions only need one import line for both the
// session check and a service-role client, if they don't already have one.
export { createClient };
export type { SupabaseClient };
