export const CHALLENGE_SIZE = 8;
export const CHALLENGE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_GROUP_MEMBERS = 30;
export const MAX_GROUPS_PER_PLAYER = 10;
/** Guesses outside the timeline can't come from the app. */
const MIN_GUESS = -3000;
const MAX_GUESS = 2100;

export function validateGuessYears(raw: unknown): number[] | null {
  if (!Array.isArray(raw) || raw.length !== CHALLENGE_SIZE) return null;
  for (const y of raw) {
    if (typeof y !== 'number' || !Number.isInteger(y) || y < MIN_GUESS || y > MAX_GUESS) {
      return null;
    }
  }
  return raw as number[];
}

/** Fisher–Yates over a copy; the first CHALLENGE_SIZE ids. */
export function pickQuestionIds(
  pool: readonly string[],
  random: () => number = Math.random,
): string[] {
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy.slice(0, CHALLENGE_SIZE);
}

export function canJoinGroup(
  group: { memberUids: string[] },
  uid: string,
  playerGroupCount: number,
): 'ok' | 'full' | 'already-member' | 'too-many-groups' {
  if (group.memberUids.includes(uid)) return 'already-member';
  if (group.memberUids.length >= MAX_GROUP_MEMBERS) return 'full';
  if (playerGroupCount >= MAX_GROUPS_PER_PLAYER) return 'too-many-groups';
  return 'ok';
}

/** Member order is join order, so index 0 after removal is the longest-standing. */
export function afterLeave(
  group: { ownerUid: string; memberUids: string[] },
  uid: string,
): { kind: 'delete' } | { kind: 'update'; ownerUid: string; memberUids: string[] } {
  const memberUids = group.memberUids.filter((m) => m !== uid);
  if (memberUids.length === 0) return { kind: 'delete' };
  const ownerUid = group.ownerUid === uid ? memberUids[0]! : group.ownerUid;
  return { kind: 'update', ownerUid, memberUids };
}
