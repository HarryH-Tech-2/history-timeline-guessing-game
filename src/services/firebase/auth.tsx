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
import { track } from '@/services/analytics';
import { loadGoogleSignin } from '@/services/googleSignin';
import { requestPlayGamesServerAuthCode, warmUpPlayGames } from '@/services/playGames';

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
  /** True when signed in with a real account (Google), not as a guest. */
  hasAccount: boolean;
}

/** Auth state plus the account actions surfaced in the profile UI. */
export interface AuthApi extends AuthState {
  /** Sign in with Google (guest progress is linked when possible). */
  signInWithGoogle: () => Promise<void>;
  /** Sign out of the account and fall back to a fresh guest session. */
  signOutToGuest: () => Promise<void>;
  /**
   * Prove the current session is fresh, as Firebase demands before sensitive
   * operations. Google accounts are re-verified silently (falling back to the
   * account picker). Legacy password accounts — email sign-up was removed in
   * September 2026 but existing sessions persist — must still supply their
   * password so they can delete their account.
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
  signInWithGoogle: () => Promise.reject(OFFLINE_ERROR),
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

/** Translate Firebase auth error codes into copy fit for the account screens. */
function friendlyAuthError(error: unknown): Error {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';
  switch (code) {
    case 'auth/credential-already-in-use':
      return new Error('That Google account is already linked to another player.');
    // Legacy password accounts can still re-authenticate to delete themselves.
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
 * that guest to a real account (Google). Upgrades use
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
   * Play Games → Firebase bridge: prove the device's Play Games identity to
   * our Cloud Function and follow its verdict — bind this uid to the player
   * (first sighting) or sign into the uid the player was bound to on another
   * device. Resolves true when the Firebase session changed. Throws only for
   * unexpected failures; "no Play Games session" is a quiet false.
   */
  const linkPlayGames = useCallback(async (forceToken = false): Promise<boolean> => {
    const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    if (!webClientId) return false;
    if (!(await warmUpPlayGames())) return false;
    const code = await requestPlayGamesServerAuthCode(webClientId);
    if (code === null) return false;
    const { exchangePlayGamesCode } = await import('./playGamesBridge');
    const result = await exchangePlayGamesCode(code, { forceToken });
    if (result.token === null) return false;
    const { auth, authModule } = await loadAuth();
    await authModule.signInWithCustomToken(auth, result.token);
    track('sign_in_completed', { method: 'playgames' });
    return true;
  }, []);

  /**
   * Zero-tap account restore, once per launch, keyed on the FIRST resolved
   * user (never re-run after an explicit sign-out this session). Two steps,
   * in order:
   *  1. Returning Google users: if the device has a saved Google credential
   *     and the session is a guest, upgrade it silently (link, or switch on
   *     credential-already-in-use). This runs first so step 2 binds the Play
   *     identity to the Google-backed uid, not to a throwaway guest.
   *  2. Play Games bridge: with a Play Games session, bind or restore via the
   *     Cloud Function. Runs for guests and real accounts alike so the
   *     mapping exists before the player ever changes phone.
   * Best-effort: any failure leaves the current session in place.
   */
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    if (state.user === null || silentRestoreDone.current) return;
    silentRestoreDone.current = true;
    const wasGuest = state.user.isAnonymous;

    void (async () => {
      if (wasGuest) {
        try {
          const GoogleSignin = await loadGoogleSignin();
          const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
          if (GoogleSignin !== null && webClientId) {
            GoogleSignin.configure({ webClientId });
            const response = await GoogleSignin.signInSilently();
            const idToken = response.type === 'success' ? response.data.idToken : null;
            if (idToken) await applyGoogleIdToken(idToken);
          }
        } catch {
          // No saved credential / offline / native module quirks — stay a guest.
        }
      }
      try {
        await linkPlayGames();
      } catch {
        // Offline, function not deployed yet, or Play Games declined — no change.
      }
    })();
  }, [state.user, applyGoogleIdToken, linkPlayGames]);

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
    track('sign_in_completed', { method: 'google' });
  }, [applyGoogleIdToken]);

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
      if (providers.length === 0) {
        // A Play Games-bridged account (custom-token session): a fresh bridge
        // sign-in with a token for this same uid counts as a recent login.
        const uidBefore = user.uid;
        const ok = await linkPlayGames(true);
        if (!ok || auth.currentUser?.uid !== uidBefore) {
          throw new Error('Could not verify your Play Games sign-in. Try again.');
        }
        return;
      }
      throw new Error('This account cannot be verified from the app.');
    } catch (error) {
      throw friendlyAuthError(error);
    }
  }, [linkPlayGames]);

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
      signInWithGoogle,
      signOutToGuest,
      reauthenticate,
      deleteAccount,
    }),
    [
      state,
      signInWithGoogle,
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
