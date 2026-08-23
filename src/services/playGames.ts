import { Platform } from 'react-native';

/**
 * Play Games Services v2 access, safe to call from any environment.
 *
 * The native module only exists in Android dev/production builds that include
 * it; everywhere else (Expo Go, older dev clients, web, tests) these helpers
 * report "unavailable" instead of throwing. Merely touching the module also forces its native OnCreate to run
 * `PlayGamesSdk.initialize`, which is what arms games-v2's automatic zero-tap
 * sign-in prompt — so `warmUpPlayGames` should be called once at app launch.
 */

type PlayGamesModule = import('../../modules/expo-play-games').ExpoPlayGamesNativeModule;

async function loadPlayGames(): Promise<PlayGamesModule | null> {
  if (Platform.OS !== 'android') return null;
  try {
    // The bridge resolves to null (never throws) when the build lacks the module.
    return (await import('../../modules/expo-play-games')).default;
  } catch {
    return null; // Defensive: bundling/resolution failures.
  }
}

/**
 * Kick the Play Games SDK on launch and report whether the player ended up
 * signed in. Fire-and-forget friendly: never throws, resolves false when
 * Play Games is unavailable.
 */
export async function warmUpPlayGames(): Promise<boolean> {
  const playGames = await loadPlayGames();
  if (playGames === null) return false;
  try {
    return await playGames.isAuthenticated();
  } catch {
    return false;
  }
}

/** Show the Play Games sign-in prompt (no-op false when unavailable). */
export async function signInToPlayGames(): Promise<boolean> {
  const playGames = await loadPlayGames();
  if (playGames === null) return false;
  try {
    return await playGames.signIn();
  } catch {
    return false;
  }
}
