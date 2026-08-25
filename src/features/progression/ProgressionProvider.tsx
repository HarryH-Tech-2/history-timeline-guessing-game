import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { INITIAL_PROGRESSION, type ProgressionState, type RoundResult } from '@/domain';
import { useSaves } from '@/features/save';
import { dateKey } from '@/utils/date';

import {
  applyDailyComplete,
  applyGameComplete,
  applyRound,
  buyStreakFreeze,
  spendCoins,
  type DailyCompleteOutcome,
  type RoundOutcome,
} from './reducer';

export interface ProgressionApi {
  state: ProgressionState;
  /** True until the persisted profile has been read on launch. */
  isLoading: boolean;
  /** Bank a round's rewards. `streak` is the combo length including this round. */
  awardRound: (result: RoundResult, streak: number) => RoundOutcome;
  /** Record a finished game; returns any newly unlocked achievement ids. */
  completeGame: () => readonly string[];
  /** Fold a finished Daily into the streak (idempotent per calendar day). */
  recordDailyCompleted: () => DailyCompleteOutcome;
  /** Buy one streak freeze with coins; false when broke or at the cap. */
  buyFreeze: () => boolean;
  /** Attempt to spend coins; false if unaffordable. */
  spend: (amount: number) => boolean;
}

/**
 * Default API used when no provider is mounted (e.g. isolated component tests).
 * It computes correct reward shapes for display but never persists, so screens
 * render and play without a real wallet behind them.
 */
const OFFLINE_API: ProgressionApi = {
  state: INITIAL_PROGRESSION,
  isLoading: false,
  awardRound: (result, streak) => applyRound(INITIAL_PROGRESSION, result, streak, dateKey()),
  completeGame: () => [],
  recordDailyCompleted: () => applyDailyComplete(INITIAL_PROGRESSION, dateKey()),
  buyFreeze: () => false,
  spend: () => false,
};

const ProgressionContext = createContext<ProgressionApi>(OFFLINE_API);

/**
 * Owns the signed-in account's persisted progression and exposes mutators that keep
 * React state, a synchronous ref mirror, and AsyncStorage in step. The ref lets
 * mutators fold onto the freshest value even when several fire in one tick
 * (a round award immediately followed by a game-complete, say).
 */
export function ProgressionProvider({ children }: { children: ReactNode }) {
  const { uid, isReady, progression: store } = useSaves();
  const [state, setState] = useState<ProgressionState>(INITIAL_PROGRESSION);
  const [isLoading, setIsLoading] = useState(true);
  const ref = useRef<ProgressionState>(INITIAL_PROGRESSION);
  // Mirrors `isLoading` synchronously for `commit` to read. `isLoading` state
  // only updates on the next render, so a mutator that fires in the window
  // between the uid-change reset and the read landing would otherwise still
  // see the stale `isLoading` closure and persist a write built on
  // `INITIAL_PROGRESSION` over the new account's real save.
  const loadingRef = useRef(true);

  // (Re)load whenever the account changes. Reset first so a screen can never
  // show the previous account's numbers while the new one is being read.
  useEffect(() => {
    ref.current = INITIAL_PROGRESSION;
    setState(INITIAL_PROGRESSION);
    setIsLoading(true);
    loadingRef.current = true;
    if (!isReady) return;

    let cancelled = false;
    void store.read().then((loaded) => {
      if (cancelled) return;
      ref.current = loaded;
      setState(loaded);
      setIsLoading(false);
      loadingRef.current = false;
    });
    return () => {
      cancelled = true;
    };
  }, [uid, isReady, store]);

  const commit = useCallback(
    (next: ProgressionState) => {
      ref.current = next;
      setState(next);
      // Never persist a mutation computed before the account's real save has
      // loaded — it would be built on INITIAL_PROGRESSION and clobber the
      // save that's about to be revealed. The in-memory state above still
      // updates so callers get a correct outcome; only the write is skipped.
      if (loadingRef.current) return;
      void store.write(next);
    },
    [store],
  );

  const awardRound = useCallback(
    (result: RoundResult, streak: number): RoundOutcome => {
      const outcome = applyRound(ref.current, result, streak, dateKey());
      commit(outcome.state);
      return outcome;
    },
    [commit],
  );

  const completeGame = useCallback((): readonly string[] => {
    const { state: next, unlocked } = applyGameComplete(ref.current);
    commit(next);
    return unlocked;
  }, [commit]);

  const recordDailyCompleted = useCallback((): DailyCompleteOutcome => {
    const outcome = applyDailyComplete(ref.current, dateKey());
    commit(outcome.state);
    return outcome;
  }, [commit]);

  const buyFreeze = useCallback((): boolean => {
    const { state: next, ok } = buyStreakFreeze(ref.current);
    if (ok) commit(next);
    return ok;
  }, [commit]);

  const spend = useCallback(
    (amount: number): boolean => {
      const { state: next, ok } = spendCoins(ref.current, amount);
      if (ok) commit(next);
      return ok;
    },
    [commit],
  );

  const value = useMemo<ProgressionApi>(
    () => ({ state, isLoading, awardRound, completeGame, recordDailyCompleted, buyFreeze, spend }),
    [state, isLoading, awardRound, completeGame, recordDailyCompleted, buyFreeze, spend],
  );

  return <ProgressionContext.Provider value={value}>{children}</ProgressionContext.Provider>;
}

/** Read the progression API. Safe to call without a provider (offline no-op). */
export function useProgression(): ProgressionApi {
  return useContext(ProgressionContext);
}
