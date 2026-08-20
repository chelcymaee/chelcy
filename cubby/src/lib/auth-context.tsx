import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';
import { registerPushToken } from './notifications';

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
  // registration call below only fires when identity actually changes
  // (fresh signup, fresh login, or session restore) — not on every auth
  // event, e.g. TOKEN_REFRESHED for a still-logged-in user. `undefined`
  // (distinct from `null`) means "not yet checked", harmless here since
  // registration only cares about a real id appearing.
  //
  // Push-token *cleanup* on sign-out deliberately does NOT live here —
  // push_tokens' RLS policy requires auth.uid() = user_id, and by the time
  // this listener observes session -> null, supabase.auth.signOut() has
  // already invalidated the session, so a delete attempted at this point
  // would silently match zero rows. See signOutAndCleanupPushToken() in
  // notifications.ts, which runs cleanup *before* signOut() instead.
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
      if (previousUserId !== newUserId && newUserId) {
        // Covers fresh signup, fresh login, and persisted-session restore
        // on cold launch — registerPushToken() already fails silently.
        registerPushToken().catch(() => {});
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
