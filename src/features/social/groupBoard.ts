import { HOUSE_PREFIX } from '@/features/leaderboard/houseRows';

export interface MemberRow {
  uid: string;
  name: string;
  weekXp: number;
}

/**
 * A group's weekly board from members' public leaderboard rows. Members with
 * no row (under the 20 XP floor), a row from an older build, or last week's
 * numbers count as 0; house rows are never members, but are dropped
 * defensively. Ties share a rank.
 */
export function rankGroup(
  memberUids: readonly string[],
  rows: readonly { uid: string; displayName: string; weekKey?: string; weekXp?: number }[],
  week: string,
  fallbackName: (uid: string) => string,
): (MemberRow & { rank: number })[] {
  const byUid = new Map(rows.map((r) => [r.uid, r]));
  const members = memberUids
    .filter((uid) => !uid.startsWith(HOUSE_PREFIX))
    .map((uid) => {
      const row = byUid.get(uid);
      return {
        uid,
        name: row?.displayName || fallbackName(uid),
        weekXp: row && row.weekKey === week ? (row.weekXp ?? 0) : 0,
      };
    })
    .sort((a, b) => b.weekXp - a.weekXp || a.name.localeCompare(b.name));
  let rank = 0;
  let last = Number.NaN;
  return members.map((m, i) => {
    if (m.weekXp !== last) {
      rank = i + 1;
      last = m.weekXp;
    }
    return { ...m, rank };
  });
}
