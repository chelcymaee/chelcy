import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabase';
import { useAuth } from './auth-context';

// ─── Selected-listing context — Stage 3.1 ──────────────────────────────────
//
// One canonical "which listing is this host managing right now" value for
// the whole (host) area, replacing the pattern of every screen independently
// running `.eq('assigned_user_id', user.id).single()` — which breaks the
// instant an account owns more than one `hosts` row (`.single()` errors on
// 0 *or* 2+ rows; PostgREST's single-object mode makes `.maybeSingle()` fail
// the same way on 2+ rows, it just doesn't throw on 0).
//
// This file only builds the context/provider. Nothing consumes it yet —
// app/(host)/_layout.tsx, the listing selector UI, and the 9 screens that
// still do their own lookup are all future stages, deliberately untouched
// here.

export type HostListing = {
  id: string;
  display_name: string | null;
  location_name: string | null;
  is_active: boolean | null;
  user_id: string | null;
  assigned_user_id: string | null;
};

type HostContextType = {
  hosts: HostListing[];
  selectedHostId: string | null;
  selectedHost: HostListing | null;
  selectListing: (id: string) => void;
  loading: boolean;
  error: string | null;
};

const HostContext = createContext<HostContextType>({
  hosts: [],
  selectedHostId: null,
  selectedHost: null,
  selectListing: () => {},
  loading: false,
  error: null,
});

// User-scoped storage key — deliberately not a single global key. Two
// different host accounts signing in on the same device must never be able
// to restore each other's selected listing.
function storageKey(userId: string): string {
  return `cubby_selected_host_id:${userId}`;
}

export function HostProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [hosts, setHosts] = useState<HostListing[]>([]);
  const [selectedHostId, setSelectedHostId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait for auth to settle before doing anything — avoids firing a
    // lookup for a user id that's about to change on initial mount.
    if (authLoading) return;

    if (!user) {
      // Signed out (or never signed in). Clear everything so a previous
      // account's listing selection can never leak into whichever account
      // signs in next on this device.
      setHosts([]);
      setSelectedHostId(null);
      setError(null);
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const userId = user.id;
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      // Deliberately no .single()/.maybeSingle() — an account can own any
      // number of listings, and this must return all of them.
      const { data, error: fetchErr } = await supabase
        .from('hosts')
        .select('id, display_name, location_name, is_active, user_id, assigned_user_id')
        .or(`user_id.eq.${userId},assigned_user_id.eq.${userId}`)
        .order('created_at', { ascending: true });

      // If the signed-in user changed (or signed out) while this request
      // was in flight, `cancelled` will already be true — React runs this
      // effect's cleanup (setting it) before running the next effect for
      // the new user. Drop the stale response rather than applying it, so
      // a slow fetch for a previous account can't resolve after a new
      // account has already signed in and clobber its state.
      if (cancelled) return;

      if (fetchErr) {
        setHosts([]);
        setSelectedHostId(null);
        setError('Could not load your listings. Pull to refresh or try again.');
        setLoading(false);
        return;
      }

      const owned = data ?? [];
      setHosts(owned);
      setError(null);

      if (owned.length === 0) {
        // Account isn't linked to any hosts row (not yet approved as a
        // host, or between admin steps). Existing per-screen "not a host
        // yet" handling stays exactly as-is until those screens migrate.
        setSelectedHostId(null);
        setLoading(false);
        return;
      }

      if (owned.length === 1) {
        // The overwhelmingly common case today, and the one that must
        // look and behave identically to before this context existed —
        // no picker, no extra step, just the one listing.
        const onlyId = owned[0].id;
        setSelectedHostId(onlyId);
        setLoading(false);
        AsyncStorage.setItem(storageKey(userId), onlyId).catch(() => {});
        return;
      }

      // Multiple listings — try to restore the last-selected one, but
      // never trust a stored id blindly: it's only honored if it's still
      // present in this account's freshly-fetched owned list.
      let nextId: string | null = null;
      try {
        const stored = await AsyncStorage.getItem(storageKey(userId));
        if (cancelled) return;
        if (stored && owned.some(h => h.id === stored)) {
          nextId = stored;
        }
      } catch {
        // AsyncStorage failure — fall through to the default below rather
        // than leaving selection unset.
      }

      // Default to the original listing — the one row that still carries
      // `user_id` under the Option A ownership model — rather than an
      // arbitrary one, if nothing was restored above. If that can't be
      // identified for some unexpected reason, fall back to the first
      // listing by creation order (deterministic, never crashes). Read as
      // a fresh const rather than narrowing `nextId` in place — TS can't
      // carry the null-check through the try/catch above, and this is
      // clearer than a non-null assertion.
      const original = owned.find(h => h.user_id === userId);
      const resolvedId: string = nextId ?? original?.id ?? owned[0].id;

      setSelectedHostId(resolvedId);
      setLoading(false);
      AsyncStorage.setItem(storageKey(userId), resolvedId).catch(() => {});
    })();

    return () => { cancelled = true; };
  }, [user, authLoading]);

  const selectListing = useCallback((id: string) => {
    if (!user) return;
    // Reject anything not actually in this account's owned list — never
    // select or persist an unvalidated id.
    if (!hosts.some(h => h.id === id)) return;
    setSelectedHostId(id);
    AsyncStorage.setItem(storageKey(user.id), id).catch(() => {});
  }, [user, hosts]);

  const selectedHost = hosts.find(h => h.id === selectedHostId) ?? null;

  return (
    <HostContext.Provider value={{ hosts, selectedHostId, selectedHost, selectListing, loading, error }}>
      {children}
    </HostContext.Provider>
  );
}

export const useSelectedHost = () => useContext(HostContext);
