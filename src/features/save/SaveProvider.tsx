import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { isFirebaseConfigured } from '@/config/env';
import type { ProgressionState } from '@/domain';
import {
  bestScoresSaves,
  campaignSaves,
  dailySaves,
  type BestScores,
  type CampaignProgress,
  type DailyRecord,
} from '@/features/modes/persistence';
import { LOCAL_UID, progressionSaves } from '@/features/progression/persistence';
import { useAuth } from '@/services/firebase/auth';
import type { Store } from '@/storage';

export interface SaveContextValue {
  /** The uid every save is filed under right now (`'local'` offline). */
  uid: string;
  /** False until every store has been hydrated for `uid`. Do not read before then. */
  isReady: boolean;
  progression: Store<ProgressionState>;
  bestScores: Store<BestScores>;
  daily: Store<DailyRecord | null>;
  campaign: Store<CampaignProgress>;
}

function storesFor(uid: string) {
  return {
    progression: progressionSaves.forUser(uid),
    bestScores: bestScoresSaves.forUser(uid),
    daily: dailySaves.forUser(uid),
    campaign: campaignSaves.forUser(uid),
  };
}

/** Default when no provider is mounted (isolated tests, storybook-style renders). */
const LOCAL_VALUE: SaveContextValue = { uid: LOCAL_UID, isReady: true, ...storesFor(LOCAL_UID) };

const SaveContext = createContext<SaveContextValue>(LOCAL_VALUE);

/**
 * Routes every save to the signed-in account. On each uid change it hydrates
 * all stores (cloud copy wins, else local, else one-time legacy adoption) and
 * only then flips `isReady`, so no consumer ever reads the previous account's
 * data or a pre-hydration copy. Unconfigured builds use the `'local'` uid.
 */
export function SaveProvider({ children }: { children: ReactNode }) {
  const { uid: authUid, isLoading } = useAuth();

  // null = we don't know who the player is yet.
  const uid: string | null = !isFirebaseConfigured
    ? LOCAL_UID
    : (authUid ?? (isLoading ? null : LOCAL_UID));

  const [readyUid, setReadyUid] = useState<string | null>(null);

  useEffect(() => {
    if (uid === null) return;
    let cancelled = false;
    void Promise.all([
      progressionSaves.hydrate(uid),
      bestScoresSaves.hydrate(uid),
      dailySaves.hydrate(uid),
      campaignSaves.hydrate(uid),
    ]).then(() => {
      if (!cancelled) setReadyUid(uid);
    });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const value = useMemo<SaveContextValue>(() => {
    const effective = uid ?? LOCAL_UID;
    return {
      uid: effective,
      isReady: uid !== null && readyUid === uid,
      ...storesFor(effective),
    };
  }, [uid, readyUid]);

  return <SaveContext.Provider value={value}>{children}</SaveContext.Provider>;
}

/** The current account's stores. Safe without a provider (local, ready). */
export function useSaves(): SaveContextValue {
  return useContext(SaveContext);
}
