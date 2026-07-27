import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { isFirebaseConfigured } from '@/config/env';

/** What the rest of the app knows about the signed-in player. */
export interface AuthState {
  /** Firebase uid of the current (anonymous) user, or null before sign-in / offline. */
  uid: string | null;
  /** False while the first anonymous sign-in is in flight. */
  isLoading: boolean;
  /** True once we have a uid to attach cloud reads/writes to. */
  isSignedIn: boolean;
}

const OFFLINE_STATE: AuthState = { uid: null, isLoading: false, isSignedIn: false };

const AuthContext = createContext<AuthState>(OFFLINE_STATE);

/**
 * Signs the player in anonymously and exposes their uid.
 *
 * Auth is the foundation later slices build on (cloud saves, leaderboards,
 * entitlements), so we establish an identity as early as possible. When Firebase
 * isn't configured the provider is a transparent pass-through in the "offline"
 * state — the game is fully playable without an account, and no firebase module
 * is even imported in that case.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(
    isFirebaseConfigured ? { uid: null, isLoading: true, isSignedIn: false } : OFFLINE_STATE,
  );

  useEffect(() => {
    if (!isFirebaseConfigured) return;

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    // Import lazily so the firebase auth module is only pulled in for
    // configured builds, keeping it out of the offline/Expo Go path.
    void (async () => {
      const [{ getFirebaseAuth }, { onAuthStateChanged, signInAnonymously }] = await Promise.all([
        import('./client'),
        import('firebase/auth'),
      ]);
      if (cancelled) return;
      const auth = getFirebaseAuth();

      unsubscribe = onAuthStateChanged(auth, (user) => {
        if (cancelled) return;
        setState({
          uid: user?.uid ?? null,
          isLoading: false,
          isSignedIn: user !== null,
        });
      });

      if (auth.currentUser === null) {
        try {
          await signInAnonymously(auth);
        } catch {
          // Network/config failure: degrade to offline rather than blocking play.
          if (!cancelled) setState(OFFLINE_STATE);
        }
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const value = useMemo(() => state, [state]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Read the current auth state. Safe to call anywhere under `AuthProvider`. */
export function useAuth(): AuthState {
  return useContext(AuthContext);
}
