import { Platform } from 'react-native';

/**
 * Sign in with Apple, for iOS builds. Apple requires it of any app that also
 * offers Google sign-in (App Review guideline 4.8).
 *
 * `expo-apple-authentication` resolves its native module the moment it is
 * evaluated, and there is none on Android, where Metro would report the throw
 * as FATAL even inside try/catch (see googleSignin.ts). So the package is only
 * ever imported on iOS.
 */

export type AppleAuthenticationModule = typeof import('expo-apple-authentication');

/**
 * The native module, required on first use rather than at import time, and
 * only ever on iOS (callers check the platform first).
 */
export function loadAppleAuthentication(): AppleAuthenticationModule {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-apple-authentication') as AppleAuthenticationModule;
}

function loadCrypto(): typeof import('expo-crypto') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-crypto') as typeof import('expo-crypto');
}

/** What Firebase needs to sign in, plus what Apple needs to revoke later. */
export interface AppleCredential {
  /** Apple's identity token (a JWT), handed to Firebase. */
  identityToken: string;
  /** The unhashed nonce; Apple saw only its SHA-256, Firebase checks both. */
  rawNonce: string;
  /** Short-lived code Firebase can trade to revoke the account's Apple tokens. */
  authorizationCode: string | null;
}

/** True where the Sign in with Apple sheet can be shown (iOS 13+). */
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    return await loadAppleAuthentication().isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Show Apple's sign-in sheet. Resolves null when the player cancels. Only the
 * email scope is requested: the app never shows a provider's real name (see
 * the player-names policy), so it doesn't ask for one.
 */
export async function requestAppleCredential(): Promise<AppleCredential | null> {
  if (Platform.OS !== 'ios') throw new Error('Sign in with Apple is only available on iPhone.');
  const AppleAuthentication = loadAppleAuthentication();
  const Crypto = loadCrypto();
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
      nonce: hashedNonce,
    });
    if (!credential.identityToken) throw new Error('Sign in with Apple did not return a token.');
    return {
      identityToken: credential.identityToken,
      rawNonce,
      authorizationCode: credential.authorizationCode,
    };
  } catch (error) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code: unknown }).code)
        : '';
    if (code === 'ERR_REQUEST_CANCELED') return null;
    throw error;
  }
}
