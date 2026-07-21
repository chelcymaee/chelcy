import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Admin session — client side ───────────────────────────────────────────────
//
// The PIN and the secret that used to gate every admin-* Edge Function
// (EXPO_PUBLIC_ADMIN_PIN, EXPO_PUBLIC_ADMIN_SECRET) no longer exist on the
// client at all — see supabase/functions/verify-admin-pin and
// supabase/functions/_shared/admin-session.ts. What's stored locally now
// is an opaque session token issued by verify-admin-pin after a correct
// PIN, plus the expiry it reported.
//
// checkAdminSession() below is a FAST LOCAL CHECK ONLY — it's the UX gate
// for app/(admin)/_layout.tsx (don't even render an admin screen if we
// already know the token is stale), not the real security boundary. The
// actual boundary is every admin-* Edge Function independently validating
// the token against the admin_sessions table on every call, via
// adminFetch() below. A tampered or extended local expiresAt value cannot
// grant a single extra admin action — it can only make the UI wait longer
// before redirecting to a call that the server rejects anyway.

const SESSION_KEY = 'cubby_admin_session';
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://gqgxahqmndkaeyuvhliv.supabase.co';
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

interface StoredSession {
  token: string;
  expiresAt: number; // ms epoch, converted from the server's ISO timestamp once at login
}

export type LoginResult =
  | { ok: true }
  | { ok: false; reason: 'invalid_pin'; attemptsRemaining?: number }
  | { ok: false; reason: 'locked'; retryAfterSeconds: number }
  | { ok: false; reason: 'not_configured' | 'error' };

export async function loginAdmin(pin: string): Promise<LoginResult> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/verify-admin-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
      body: JSON.stringify({ pin }),
    });
    const data = await res.json().catch(() => ({}));

    if (res.ok && data?.ok && data.token && data.expiresAt) {
      const session: StoredSession = { token: data.token, expiresAt: new Date(data.expiresAt).getTime() };
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return { ok: true };
    }
    if (res.status === 429) {
      return { ok: false, reason: 'locked', retryAfterSeconds: data?.retryAfterSeconds ?? 900 };
    }
    if (data?.reason === 'not_configured') {
      return { ok: false, reason: 'not_configured' };
    }
    return { ok: false, reason: 'invalid_pin', attemptsRemaining: data?.attemptsRemaining };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

// Local-only, synchronous-feeling gate for _layout.tsx. See file header.
export async function checkAdminSession(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const { expiresAt } = JSON.parse(raw) as StoredSession;
    if (!expiresAt || Date.now() > expiresAt) {
      await AsyncStorage.removeItem(SESSION_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function getAdminToken(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const { token, expiresAt } = JSON.parse(raw) as StoredSession;
    if (!token || !expiresAt || Date.now() > expiresAt) return null;
    return token;
  } catch {
    return null;
  }
}

export async function clearAdminSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}

// Logs out: revokes the session server-side (so the token can't be reused
// even if it leaked before this ran) AND clears it locally. Local storage
// is always cleared regardless of whether the network call succeeds — a
// logout should never be blocked by connectivity.
export async function logoutAdmin(): Promise<void> {
  const token = await getAdminToken();
  await clearAdminSession();
  if (!token) return;
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/verify-admin-pin`, {
      method: 'DELETE',
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
    });
  } catch {
    // Best-effort — the local session is already gone either way, and the
    // server-side row will fall out on its own once it expires (60 min).
  }
}

// Every admin-* Edge Function call goes through this — the one place that
// attaches the session token, so no screen builds this header by hand.
// `path` is the function name plus any query string, e.g.
// '/admin-hosts?id=123'.
export async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAdminToken();
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
    apikey: ANON_KEY,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${SUPABASE_URL}/functions/v1${path}`, { ...init, headers });
}
