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
