import type { ProgressionState } from '@/domain';

import type { LeaderboardEntry } from './types';

/** The three rankings the leaderboard screen can show. */
export type Board = 'today' | 'week' | 'all';

export const BOARDS: readonly Board[] = ['today', 'week', 'all'];

export const BOARD_LABEL: Record<Board, string> = {
  today: 'Today',
  week: 'Week',
  all: 'All time',
};

export const BOARD_BLURB: Record<Board, string> = {
  today: 'Today’s Daily — the same eight questions for everyone',
  week: 'XP earned since Monday',
  all: 'Top history buffs by XP',
};

/** The calendar keys a board is scoped to: today's `YYYY-MM-DD` and this ISO week. */
export interface BoardContext {
  today: string;
  week: string;
}

/**
 * The number a row is ranked by on a board, or null when the row doesn't
 * compete there (no Daily today, no XP banked this week).
 */
export function boardValue(
  entry: Pick<LeaderboardEntry, 'xp' | 'weekKey' | 'weekXp' | 'dailyDate' | 'dailyScore'>,
  board: Board,
  ctx: BoardContext,
): number | null {
  switch (board) {
    case 'all':
      return entry.xp;
    case 'week':
      return entry.weekKey === ctx.week && entry.weekXp !== undefined ? entry.weekXp : null;
    case 'today':
      return entry.dailyDate === ctx.today && entry.dailyScore !== undefined
        ? entry.dailyScore
        : null;
  }
}

/** The player's own standing on a board, from their local progression. */
export function myBoardValue(
  state: Pick<ProgressionState, 'xp' | 'weekly' | 'lastDaily'>,
  board: Board,
  ctx: BoardContext,
): number | null {
  return boardValue(
    {
      xp: state.xp,
      weekKey: state.weekly.key,
      weekXp: state.weekly.xp,
      dailyDate: state.lastDaily?.date,
      dailyScore: state.lastDaily?.score,
    },
    board,
    ctx,
  );
}

export function boardUnit(board: Board): string {
  return board === 'today' ? 'pts' : 'XP';
}

export function formatBoardValue(value: number, board: Board): string {
  return `${value.toLocaleString()} ${boardUnit(board)}`;
}

/** uid → rank for a fetched ranking, 1-based from `offset`. */
export function ranksOf(entries: readonly { uid: string }[], offset = 1): Record<string, number> {
  const ranks: Record<string, number> = {};
  entries.forEach((e, i) => {
    ranks[e.uid] = i + offset;
  });
  return ranks;
}

/**
 * Places moved since the last visit: positive is up the board, negative is
 * down, 0 unchanged, null when the row wasn't in the last ranking we saw.
 */
export function movementFor(
  previous: Record<string, number> | undefined,
  uid: string,
  rank: number,
): number | null {
  const before = previous?.[uid];
  if (before === undefined) return null;
  return before - rank;
}
