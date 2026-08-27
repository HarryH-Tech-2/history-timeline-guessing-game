import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { isFirebaseConfigured } from '@/config/env';
import { loadGoogleSignin } from '@/services/googleSignin';

/** Profile fields the rest of the app can show for the signed-in player. */
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
  /** Firebase provider ids linked to the account, e.g. 'password', 'google.com'. */
  providerIds: string[];
}

/** What the rest of the app knows about the signed-in player. */
export interface AuthState {
  /** Firebase uid of the current user, or null before sign-in / offline. */
  uid: string | null;
  /** False while the first sign-in is in flight. */
  isLoading: boolean;
  /** True once we have a uid to attach cloud reads/writes to (incl. guests). */
  isSignedIn: boolean;
  /** Profile of the current user, or null before sign-in / offline. */
  user: AuthUser | null;
  /** True when signed in with a real account (email or Google), not as a guest. */
  hasAccount: boolean;
}

/** Auth state plus the account actions surfaced in the profile UI. */
export interface AuthApi extends AuthState {
  /** Create an email/password account (guest progress is linked onto it). */
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  /** Sign in to an existing email/password account. */
  signInWithEmail: (email: string, password: string) => Promise<void>;
  /** Sign in with Google (guest progress is linked when possible). */
  signInWithGoogle: () => Promise<void>;
  /** Email a password-reset link. */
  sendPasswordReset: (email: string) => Promise<void>;
  /** Sign out of the account and fall back to a fresh guest session. */
  signOutToGuest: () => Promise<void>;
  /**
   * Prove the current session is fresh, as Firebase demands before sensitive
   * operations. Password accounts must supply their password; Google accounts
   * are re-verified silently (falling back to the account picker).
   */
  reauthenticate: (password?: string) => Promise<void>;
  /**
   * Permanently delete the signed-in account: its cloud saves, leaderboard
   * row and the Firebase user. Call `reauthenticate` first. On success the
   * auth listener starts a fresh guest session.
   */
  deleteAccount: () => Promise<void>;
}

const OFFLINE_ERROR = new Error(
  'Accounts need a connection and are not available in this build.',
);

const OFFLINE_STATE: AuthState = {
  uid: null,
  isLoading: false,
  isSignedIn: false,
  user: null,
  hasAccount: false,
};

const OFFLINE_API: AuthApi = {
  ...OFFLINE_STATE,
  signUpWithEmail: () => Promise.reject(OFFLINE_ERROR),
  signInWithEmail: () => Promise.reject(OFFLINE_ERROR),
  signInWithGoogle: () => Promise.reject(OFFLINE_ERROR),
  sendPasswordReset: () => Promise.reject(OFFLINE_ERROR),
  signOutToGuest: () => Promise.resolve(),
  reauthenticate: () => Promise.reject(OFFLINE_ERROR),
  deleteAccount: () => Promise.reject(OFFLINE_ERROR),
};

const AuthContext = createContext<AuthApi>(OFFLINE_API);

/**
 * Lazy access to the firebase auth module + instance, so unconfigured builds
 * (Expo Go, CI) never import firebase at all.
 */
async function loadAuth() {
  const [{ getFirebaseAuth }, authModule] = await Promise.all([
    import('./client'),
    import('firebase/auth'),
  ]);
  return { auth: getFirebaseAuth(), authModule };
}

/** Translate Firebase auth error codes into copy fit for the sign-in screen. */
function friendlyAuthError(error: unknown): Error {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';
  switch (code) {
    case 'auth/invalid-email':
      return new Error('That email address does not look right.');
    case 'auth/email-already-in-use':
    case 'auth/credential-already-in-use':
      return new Error('An account already exists for that email — try signing in instead.');
    case 'auth/weak-password':
      return new Error('Password is too weak — use at least 6 characters.');
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return new Error('Email or password is incorrect.');
    case 'auth/requires-recent-login':
      return new Error('Please sign in again before deleting your account.');
    case 'auth/too-many-requests':
      return new Error('Too many attempts — wait a moment and try again.');
    case 'auth/network-request-failed':
      return new Error('No connection — check your network and try again.');
    default:
      return error instanceof Error ? error : new Error('Sign-in failed. Please try again.');
  }
}

/**
 * Owns the player's identity. On launch the player is signed in anonymously so
 * cloud features work with zero friction; the profile screen can then upgrade
 * that guest to a real account (email/password or Google). Upgrades use
 * credential *linking* wherever possible so the uid — and with it the
 * leaderboard entry and any cloud data — survives the transition. When Firebase
 * isn't configured the provider is a transparent offline pass-through.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(
    isFirebaseConfigured ? { ...OFFLINE_STATE, isLoading: true } : OFFLINE_STATE,
  );
  // Silent Google restore is attempted at most once per app launch.
  const silentRestoreDone = useRef(false);

  useEffect(() => {
    if (!isFirebaseConfigured) return;

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    void (async () => {
      const { auth, authModule } = await loadAuth();
      if (cancelled) return;

      unsubscribe = authModule.onAuthStateChanged(auth, (user) => {
        if (cancelled) return;
        if (user === null) {
          // Covers both first launch and post-sign-out: fall back to a guest
          // session rather than a signed-out dead end.
          authModule.signInAnonymously(auth).catch(() => {
            if (!cancelled) setState(OFFLINE_STATE);
          });
          return;
        }
        setState({
          uid: user.uid,
          isLoading: false,
          isSignedIn: true,
          user: {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            isAnonymous: user.isAnonymous,
            providerIds: user.providerData.map((p) => p.providerId),
          },
          hasAccount: !user.isAnonymous,
        });
      });
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  /**
   * Linking and profile updates keep the same uid, so onAuthStateChanged stays
   * silent — after those we re-read currentUser and publish the state manually.
   */
  const refreshFromCurrentUser = useCallback(async () => {
    const { auth } = await loadAuth();
    const user = auth.currentUser;
    if (user === null) return;
    setState({
      uid: user.uid,
      isLoading: false,
      isSignedIn: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        isAnonymous: user.isAnonymous,
        providerIds: user.providerData.map((p) => p.providerId),
      },
      hasAccount: !user.isAnonymous,
    });
  }, []);

  /**
   * Turn a Google idToken into the signed-in Firebase user: guests are
   * upgraded in place via credential linking (uid preserved); a Google account
   * that already has its own player switches to it instead of failing (the
   * guest's local progress stays on-device).
   */
  const applyGoogleIdToken = useCallback(
    async (idToken: string) => {
      const { auth, authModule } = await loadAuth();
      const credential = authModule.GoogleAuthProvider.credential(idToken);
      const current = auth.currentUser;
      if (current?.isAnonymous) {
        try {
          await authModule.linkWithCredential(current, credential);
          await refreshFromCurrentUser();
          return;
        } catch (error) {
          const code =
            typeof error === 'object' && error !== null && 'code' in error
              ? String((error as { code: unknown }).code)
              : '';
          if (code !== 'auth/credential-already-in-use') throw error;
        }
      }
      await authModule.signInWithCredential(auth, credential);
    },
    [refreshFromCurrentUser],
  );

  /**
   * Zero-tap account restore: if the device has a saved Google credential
   * (the player signed in with Google before), upgrade the guest session to
   * that account automatically on launch. Runs once per launch, and only when
   * the FIRST resolved user is a guest — never after an explicit sign-out,
   * and never over an existing real account. Best-effort: any failure just
   * leaves the guest session in place.
   */
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    if (state.user === null || silentRestoreDone.current) return;
    silentRestoreDone.current = true;
    if (!state.user.isAnonymous) return;

    void (async () => {
      try {
        const GoogleSignin = await loadGoogleSignin();
        if (GoogleSignin === null) return;
        const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
        if (!webClientId) return;
        GoogleSignin.configure({ webClientId });
        const response = await GoogleSignin.signInSilently();
        if (response.type !== 'success') return;
        const idToken = response.data.idToken;
        if (!idToken) return;
        await applyGoogleIdToken(idToken);
      } catch {
        // No saved credential / offline / native module quirks — stay a guest.
      }
    })();
  }, [state.user, applyGoogleIdToken]);

  const signUpWithEmail = useCallback(
    async (email: string, password: string) => {
      if (!isFirebaseConfigured) throw OFFLINE_ERROR;
      const { auth, authModule } = await loadAuth();
      const current = auth.currentUser;
      try {
        if (current?.isAnonymous) {
          const credential = authModule.EmailAuthProvider.credential(email.trim(), password);
          await authModule.linkWithCredential(current, credential);
        } else {
          await authModule.createUserWithEmailAndPassword(auth, email.trim(), password);
        }
      } catch (error) {
        throw friendlyAuthError(error);
      }
      await refreshFromCurrentUser();
    },
    [refreshFromCurrentUser],
  );

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      if (!isFirebaseConfigured) throw OFFLINE_ERROR;
      const { auth, authModule } = await loadAuth();
      try {
        await authModule.signInWithEmailAndPassword(auth, email.trim(), password);
      } catch (error) {
        throw friendlyAuthError(error);
      }
    },
    [],
  );

  const signInWithGoogle = useCallback(async () => {
    if (!isFirebaseConfigured) throw OFFLINE_ERROR;

    // The native module only exists in dev/production builds, never Expo Go.
    const GoogleSignin = await loadGoogleSignin();
    if (GoogleSignin === null) {
      throw new Error('Google sign-in needs a development or production build of the app.');
    }

    const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    if (!webClientId) {
      throw new Error('Google sign-in is not configured for this build.');
    }

    GoogleSignin.configure({ webClientId });
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (response.type !== 'success') return; // user cancelled the picker
    const idToken = response.data.idToken;
    if (!idToken) throw new Error('Google sign-in did not return a token.');

    try {
      await applyGoogleIdToken(idToken);
    } catch (error) {
      throw friendlyAuthError(error);
    }
  }, [applyGoogleIdToken]);

  const sendPasswordReset = useCallback(async (email: string) => {
    if (!isFirebaseConfigured) throw OFFLINE_ERROR;
    const { auth, authModule } = await loadAuth();
    try {
      await authModule.sendPasswordResetEmail(auth, email.trim());
    } catch (error) {
      throw friendlyAuthError(error);
    }
  }, []);

  const reauthenticate = useCallback(async (password?: string) => {
    if (!isFirebaseConfigured) throw OFFLINE_ERROR;
    const { auth, authModule } = await loadAuth();
    const user = auth.currentUser;
    if (user === null || user.isAnonymous) throw new Error('No account is signed in.');

    const providers = user.providerData.map((p) => p.providerId);
    try {
      if (providers.includes('password')) {
        if (!password || user.email === null) {
          throw new Error('Enter your password to continue.');
        }
        const credential = authModule.EmailAuthProvider.credential(user.email, password);
        await authModule.reauthenticateWithCredential(user, credential);
        return;
      }
      if (providers.includes('google.com')) {
        const GoogleSignin = await loadGoogleSignin();
        if (GoogleSignin === null) {
          throw new Error('Google sign-in needs a development or production build of the app.');
        }
        const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
        if (!webClientId) throw new Error('Google sign-in is not configured for this build.');
        GoogleSignin.configure({ webClientId });
        let idToken: string | null | undefined;
        try {
          idToken = (await GoogleSignin.signInSilently()).data?.idToken;
        } catch {
          // No cached Google session - fall through to an interactive prompt.
        }
        if (!idToken) {
          const response = await GoogleSignin.signIn();
          if (response.type !== 'success') throw new Error('Google sign-in was cancelled.');
          idToken = response.data.idToken;
        }
        if (!idToken) throw new Error('Google sign-in did not return a token.');
        const credential = authModule.GoogleAuthProvider.credential(idToken);
        await authModule.reauthenticateWithCredential(user, credential);
        return;
      }
      throw new Error('This account cannot be verified from the app.');
    } catch (error) {
      throw friendlyAuthError(error);
    }
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!isFirebaseConfigured) throw OFFLINE_ERROR;
    const { auth, authModule } = await loadAuth();
    const user = auth.currentUser;
    if (user === null || user.isAnonymous) throw new Error('No account is signed in.');

    // Cloud data first: if this fails the account survives and nothing is orphaned.
    const { deleteCloudAccountData } = await import('./accountData');
    try {
      await deleteCloudAccountData(user.uid);
      await authModule.deleteUser(user);
    } catch (error) {
      throw friendlyAuthError(error);
    }
    try {
      const GoogleSignin = await loadGoogleSignin();
      if (GoogleSignin !== null) await GoogleSignin.signOut();
    } catch {
      // No Google session - nothing to do.
    }
    // onAuthStateChanged sees the null user and starts a fresh guest session.
  }, []);

  const signOutToGuest = useCallback(async () => {
    if (!isFirebaseConfigured) return;
    const { auth, authModule } = await loadAuth();
    try {
      const GoogleSignin = await loadGoogleSignin();
      if (GoogleSignin !== null) await GoogleSignin.signOut();
    } catch {
      // No Google session — nothing to do.
    }
    // onAuthStateChanged sees the null user and starts a fresh guest session.
    await authModule.signOut(auth);
  }, []);

  const value = useMemo<AuthApi>(
    () => ({
      ...state,
      signUpWithEmail,
      signInWithEmail,
      signInWithGoogle,
      sendPasswordReset,
      signOutToGuest,
      reauthenticate,
      deleteAccount,
    }),
    [
      state,
      signUpWithEmail,
      signInWithEmail,
      signInWithGoogle,
      sendPasswordReset,
      signOutToGuest,
      reauthenticate,
      deleteAccount,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Read the current auth state and actions. Safe without a provider (offline no-op). */
export function useAuth(): AuthApi {
  return useContext(AuthContext);
}
