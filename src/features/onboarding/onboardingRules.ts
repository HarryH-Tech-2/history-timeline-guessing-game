/**
 * Whether to show the first-run flow. Only a device that has never completed
 * it AND a profile that has never finished a game sees it: an existing player
 * on a fresh install, or anyone who played before this build, goes straight
 * to the hub.
 */
export function shouldShowOnboarding({
  completedAt,
  gamesPlayed,
}: {
  completedAt: number | null;
  gamesPlayed: number;
}): boolean {
  return completedAt === null && gamesPlayed === 0;
}

export type OnboardingDecision = 'show' | 'skip' | 'wait';

/**
 * The launch-time decision, made from what the device already knows so a
 * brand-new player is never kept waiting on the network.
 *
 * - The device flag is set → skip, instantly.
 * - No flag and no save of any account on this device → a fresh install:
 *   show, instantly. (Anonymous sign-in, which the profile load waits on,
 *   is a network round trip on a fresh install — the second-long pause
 *   before onboarding used to appear.)
 * - No flag but a save exists → someone played here before this build; wait
 *   for that profile and let `gamesPlayed` decide. Its auth session is
 *   already on disk, so this wait is a local read, not a network call.
 */
export function decideOnboarding({
  completedAt,
  hasLocalSaves,
  gamesPlayed,
}: {
  completedAt: number | null;
  hasLocalSaves: boolean;
  /** The loaded profile's count, or 'loading' while it is still being read. */
  gamesPlayed: number | 'loading';
}): OnboardingDecision {
  if (completedAt !== null) return 'skip';
  if (!hasLocalSaves) return 'show';
  if (gamesPlayed === 'loading') return 'wait';
  return shouldShowOnboarding({ completedAt, gamesPlayed }) ? 'show' : 'skip';
}
