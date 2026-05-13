import * as React from "react";
import type { ReactElement, ReactNode } from "react";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Auth context. Wraps Supabase Auth's session state in a React-shaped
 * subscription so the App can branch on signed-in vs anonymous and grab
 * the user id for SupabaseRepository.
 */

export interface AuthContextValue {
  client: SupabaseClient;
  session: Session | null;
  user: User | null;
  loading: boolean;
  /** Email + password sign in. Returns null on success, error message on failure. */
  signIn: (email: string, password: string) => Promise<string | null>;
  /** Email + password sign up. Returns null on success, error message on failure. */
  signUp: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthCtx = React.createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  client: SupabaseClient;
  children: ReactNode;
}

export function AuthProvider(props: AuthProviderProps): ReactElement {
  const { client, children } = props;
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    // 1. Read the existing session (from localStorage / OAuth callback).
    client.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      setLoading(false);
    });
    // 2. Subscribe so we react to auth events from other tabs / refresh / sign-out.
    const { data: sub } = client.auth.onAuthStateChange((_event, next_session) => {
      setSession(next_session);
      setLoading(false);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [client]);

  const signIn = React.useCallback(
    async (email: string, password: string): Promise<string | null> => {
      const { error } = await client.auth.signInWithPassword({ email, password });
      return error ? error.message : null;
    },
    [client],
  );

  const signUp = React.useCallback(
    async (email: string, password: string): Promise<string | null> => {
      const { error } = await client.auth.signUp({ email, password });
      return error ? error.message : null;
    },
    [client],
  );

  const signOut = React.useCallback(async () => {
    await client.auth.signOut();
  }, [client]);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      client,
      session,
      user: session?.user ?? null,
      loading,
      signIn,
      signUp,
      signOut,
    }),
    [client, session, loading, signIn, signUp, signOut],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthContextValue {
  const v = React.useContext(AuthCtx);
  if (!v) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return v;
}
