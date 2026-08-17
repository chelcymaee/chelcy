import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';
import { registerPushToken, unregisterPushToken } from './notifications';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({ session: null, user: null, loading: false });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  // Tracks the last known authenticated user id so the push-token
  // register/cleanup calls below only fire when identity actually changes
  // (fresh signup, fresh login, session restore, or sign-out) — not on
  // every auth event, e.g. TOKEN_REFRESHED for a still-logged-in user.
  // `undefined` (distinct from `null`) means "not yet checked", so the very
  // first callback firing on a cold start with no session doesn't get
  // mistaken for a real sign-out with a previous user to clean up.
  const previousUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    }).catch(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);

      const newUserId = session?.user?.id ?? null;
      const previousUserId = previousUserIdRef.current;
      if (previousUserId !== newUserId) {
        if (newUserId) {
          // Covers fresh signup, fresh login, and persisted-session restore
          // on cold launch — registerPushToken() already fails silently.
          registerPushToken().catch(() => {});
        } else if (previousUserId) {
          // Real sign-out transition (not the initial "never logged in"
          // check) — clean up so this device stops being associated with
          // the outgoing account. unregisterPushToken() fails silently.
          unregisterPushToken(previousUserId).catch(() => {});
        }
      }
      previousUserIdRef.current = newUserId;
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
