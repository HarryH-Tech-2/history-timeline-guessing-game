import { isFirebaseConfigured } from '@/config/env';

import { boardValue, type Board, type BoardContext } from './boards';
import {
  LeaderboardEntrySchema,
  qualifiesForLeaderboard,
  type LeaderboardEntry,
  type LeaderboardWrite,
} from './types';

const COLLECTION = 'leaderboard';

/** The field each board ranks by, and the equality that scopes it to today / this week. */
const BOARD_QUERY: Record<Board, { value: string; scope?: (ctx: BoardContext) => [string, string] }> = {
  all: { value: 'xp' },
  week: { value: 'weekXp', scope: (ctx) => ['weekKey', ctx.week] },
  today: { value: 'dailyScore', scope: (ctx) => ['dailyDate', ctx.today] },
};

/** Whether a parsed row belongs on a board at all. */
function competes(entry: LeaderboardEntry, board: Board, ctx: BoardContext): boolean {
  if (board === 'all') return qualifiesForLeaderboard(entry.xp);
  return boardValue(entry, board, ctx) !== null;
}

/**
 * Upsert the signed-in player's leaderboard row. Best-effort: any failure
 * (offline, rules, transient network) is swallowed so publishing a score can
 * never disrupt play. No-op when Firebase isn't configured for the build.
 */
export async function publishEntry(uid: string, entry: LeaderboardWrite): Promise<void> {
  if (!isFirebaseConfigured) return;
  try {
    const [{ getFirebaseDb }, { doc, setDoc }] = await Promise.all([
      import('@/services/firebase/client'),
      import('firebase/firestore'),
    ]);
    await setDoc(doc(getFirebaseDb(), COLLECTION, uid), entry, { merge: true });
  } catch {
    // Intentionally ignored — the local profile is the source of truth.
  }
}

/**
 * Fetch the top players by XP. Returns an empty list offline or on error, and
 * drops any malformed remote row rather than failing the whole board. Rows
 * under MIN_LEADERBOARD_XP (published by older builds, or a fresh account) are
 * dropped too, so the board only lists people who have actually played.
 */
export async function fetchTop(
  max = 50,
  board: Board = 'all',
  ctx: BoardContext = { today: '', week: '' },
): Promise<readonly LeaderboardEntry[]> {
  if (!isFirebaseConfigured) return [];
  try {
    const [{ getFirebaseDb }, { collection, getDocs, limit, orderBy, query, where }] =
      await Promise.all([import('@/services/firebase/client'), import('firebase/firestore')]);
    const { value, scope } = BOARD_QUERY[board];
    const scoped = scope?.(ctx);
    const base = collection(getFirebaseDb(), COLLECTION);
    const q = scoped
      ? query(base, where(scoped[0], '==', scoped[1]), orderBy(value, 'desc'), limit(max))
      : query(base, orderBy(value, 'desc'), limit(max));
    const snapshot = await getDocs(q);
    const entries: LeaderboardEntry[] = [];
    for (const docSnap of snapshot.docs) {
      const parsed = LeaderboardEntrySchema.safeParse({ uid: docSnap.id, ...docSnap.data() });
      if (parsed.success && competes(parsed.data, board, ctx)) entries.push(parsed.data);
    }
    return entries;
  } catch {
    return [];
  }
}

/**
 * The player's 1-based rank on a board given their own value: one more than
 * the number of rows strictly above them. A server-side count, so it costs one
 * aggregation read rather than a scan. Null offline or on error.
 */
export async function fetchRank(
  board: Board,
  ctx: BoardContext,
  myValue: number,
): Promise<number | null> {
  if (!isFirebaseConfigured) return null;
  try {
    const [{ getFirebaseDb }, { collection, getCountFromServer, query, where }] =
      await Promise.all([import('@/services/firebase/client'), import('firebase/firestore')]);
    const { value, scope } = BOARD_QUERY[board];
    const scoped = scope?.(ctx);
    const base = collection(getFirebaseDb(), COLLECTION);
    const q = scoped
      ? query(base, where(scoped[0], '==', scoped[1]), where(value, '>', myValue))
      : query(base, where(value, '>', myValue));
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count + 1;
  } catch {
    return null;
  }
}
