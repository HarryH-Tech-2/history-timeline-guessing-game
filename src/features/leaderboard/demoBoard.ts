import { AVATARS } from '@/features/progression/avatars';

import { boardValue, type Board, type BoardContext } from './boards';
import { houseRows } from './houseRows';
import type { LeaderboardEntry } from './types';

/**
 * The board the dev-only demo profile sees (features/save/demoProfile): house
 * names only, so store screenshots never show a real player, and no Firestore.
 */
function demoEntries(ctx: BoardContext): LeaderboardEntry[] {
  return houseRows({ count: 56, maxXp: 24_000, today: ctx.today, week: ctx.week, now: Date.now() }).map(
    ({ house: _house, ...row }, i) => ({
      ...row,
      uid: `demo-${i}`,
      avatar: AVATARS[(i * 7) % AVATARS.length]?.id,
    }),
  );
}

function ranked(board: Board, ctx: BoardContext): { entry: LeaderboardEntry; value: number }[] {
  return demoEntries(ctx)
    .map((entry) => ({ entry, value: boardValue(entry, board, ctx) }))
    .filter((r): r is { entry: LeaderboardEntry; value: number } => r.value !== null && r.value > 0)
    .sort((a, b) => b.value - a.value);
}

export function demoTop(max: number, board: Board, ctx: BoardContext): LeaderboardEntry[] {
  return ranked(board, ctx)
    .slice(0, max)
    .map((r) => r.entry);
}

export function demoRank(board: Board, ctx: BoardContext, myValue: number): number {
  return ranked(board, ctx).filter((r) => r.value > myValue).length + 1;
}
