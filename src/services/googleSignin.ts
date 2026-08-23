import { Platform, TurboModuleRegistry } from 'react-native';

/**
 * Lazy access to `@react-native-google-signin/google-signin`.
 *
 * The package calls `TurboModuleRegistry.getEnforcing('RNGoogleSignin')` the
 * moment it is evaluated, and Metro reports an exception thrown during module
 * evaluation as a FATAL error — even when the `import()` sits inside
 * try/catch. So in builds without the native module (Expo Go, older dev
 * clients, web) we must not import the package at all. Check the registry
 * first (non-enforcing `get` returns null instead of throwing), then import.
 */
export type GoogleSigninModule =
  typeof import('@react-native-google-signin/google-signin').GoogleSignin;

const NATIVE_MODULE_NAME = 'RNGoogleSignin';

/** True when the Google Sign-In native module is linked into this binary. */
export function isGoogleSigninAvailable(): boolean {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return false;
  try {
    return TurboModuleRegistry.get(NATIVE_MODULE_NAME) != null;
  } catch {
    return false;
  }
}

/**
 * The Google Sign-In module, or null in environments without it. Callers
 * treat null as "Google sign-in unavailable".
 */
export async function loadGoogleSignin(): Promise<GoogleSigninModule | null> {
  if (!isGoogleSigninAvailable()) return null;
  try {
    const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
    return GoogleSignin;
  } catch {
    return null;
  }
}
