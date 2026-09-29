import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/services/firebase/auth';

import * as api from './api';
import type { SocialState } from './types';

/** How many of the player's challenges have more entries than they last saw. */
export function unseenCount(state: SocialState, counts: Record<string, number>): number {
  return state.challengeCodes.filter((code) => (counts[code] ?? 0) > (state.seen[code] ?? 0)).length;
}

const CHECK_EVERY_MS = 60_000;
/** Only the newest challenges are checked, to bound the reads per check. */
const RECENT = 20;

/**
 * Shared badge state: the last check's entry counts plus the seen marks, so
 * the Challenges panel can clear the dot the moment it marks rows seen
 * instead of waiting for the next (throttled) foreground check.
 */
type Snapshot = { uid: string; counts: Record<string, number>; seen: Record<string, number> };

let snapshot: Snapshot | null = null;
const listeners = new Set<() => void>();

function publish(next: Snapshot | null) {
  snapshot = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => snapshot;

/** Record that `uid` has now seen `count` entries on `code` (call alongside api.markSeen). */
export function noteChallengeSeen(uid: string, code: string, count: number): void {
  if (!snapshot || snapshot.uid !== uid) return;
  if ((snapshot.seen[code] ?? 0) >= count) return;
  publish({ ...snapshot, seen: { ...snapshot.seen, [code]: count } });
}

/** Test hook: forget the shared state between cases. */
export function resetSocialBadgeForTests(): void {
  snapshot = null;
  listeners.clear();
}

/** Entry count for a code, or null when the challenge can't be loaded (the panel skips those rows too). */
async function entryCount(code: string): Promise<readonly [string, number] | null> {
  try {
    const [challenge, entries] = await Promise.all([api.fetchChallenge(code), api.fetchEntries(code)]);
    return challenge ? ([code, entries.length] as const) : null;
  } catch {
    return null;
  }
}

async function check(uid: string): Promise<void> {
  const state = await api.fetchSocialState(uid);
  const loaded = await Promise.all(state.challengeCodes.slice(-RECENT).map(entryCount));
  const counts = Object.fromEntries(loaded.filter((e) => e !== null));
  // Keep seen marks noted locally while this check was in flight (the server copy may lag).
  const seen = { ...state.seen };
  if (snapshot?.uid === uid) {
    for (const [code, n] of Object.entries(snapshot.seen)) seen[code] = Math.max(seen[code] ?? 0, n);
  }
  publish({ uid, counts, seen });
}

/** True when a challenge has results the player hasn't opened. Checked on foreground, at most once a minute. */
export function useSocialBadge(): boolean {
  const { uid } = useAuth();
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (!uid) return;
    let last = 0;
    const run = () => {
      const now = Date.now();
      if (last !== 0 && now - last < CHECK_EVERY_MS) return;
      last = now;
      // Offline or unreadable: keep the last value, never surface an error.
      check(uid).catch(() => undefined);
    };
    run();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') run();
    });
    return () => sub.remove();
  }, [uid]);

  if (!uid || !current || current.uid !== uid) return false;
  return (
    unseenCount({ groupIds: [], challengeCodes: Object.keys(current.counts), seen: current.seen }, current.counts) > 0
  );
}
