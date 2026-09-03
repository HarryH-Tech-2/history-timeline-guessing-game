import { requireOptionalNativeModule } from 'expo';

/**
 * Native bridge to Play Games Services v2 sign-in (Android only).
 *
 * Resolved with `requireOptionalNativeModule` so that evaluating this file is
 * always safe: in builds without the module (Expo Go, a dev client built
 * before it was added, web, Jest) the export is `null` rather than a throw.
 * That matters because Metro reports an exception thrown during module
 * evaluation as a FATAL error even when the triggering `import()` is wrapped
 * in try/catch — a throw here would crash the app on launch. Always go through
 * `src/services/playGames.ts`, which handles the `null` case.
 */
export interface ExpoPlayGamesNativeModule {
  /** True when the player has a Play Games session (incl. via auto sign-in). */
  isAuthenticated(): Promise<boolean>;
  /** Show the Play Games sign-in prompt; resolves with the resulting state. */
  signIn(): Promise<boolean>;
  /** Single-use server auth code for the given web OAuth client id. */
  requestServerSideAccess(webClientId: string): Promise<string>;
  /**
   * Unlock the achievement with this Play Console id. Resolves once Play has
   * accepted it; rejects when there is no Play Games session or no Activity.
   */
  unlockAchievement(achievementId: string): Promise<void>;
  /** Open Play Games' achievements UI over the app. */
  showAchievements(): Promise<void>;
}

export default requireOptionalNativeModule<ExpoPlayGamesNativeModule>('ExpoPlayGames');
