import { getQuestions } from '@/data';
import { INITIAL_PROGRESSION, type ProgressionState } from '@/domain';
import { earnedAchievementIds } from '@/features/progression/achievements';
import { CAMPAIGN, worldStages } from '@/features/modes/campaign/campaignMap';
import type { CampaignProgress } from '@/features/modes/persistence';
import { dateKey, weekKey } from '@/utils/date';

/**
 * A well-travelled player, for store screenshots and promo recordings only.
 *
 * Active solely in a Metro dev session started with EXPO_PUBLIC_DEMO_PROFILE=1
 * (see `demoProfile` in config/env). It lives under its own save uid, which is
 * never mirrored to the cloud and never adopted by a real account, and the
 * leaderboard publish and Play Games sync are switched off while it is on — so
 * none of this reaches Firestore, the boards or real players.
 */
export { DEMO_UID } from '@/storage/createScopedStore';

/**
 * Roughly `share` of the questions, scattered (not every n-th, which lines up
 * with the museum grid columns and leaves whole columns empty).
 */
function collection(share: number): Record<string, number> {
  const out: Record<string, number> = {};
  getQuestions().forEach((q, i) => {
    if (((i * 37 + 11) % 100) / 100 < share) out[q.id] = i % 7;
  });
  return out;
}

export function demoProgression(now: Date = new Date()): ProgressionState {
  const base: ProgressionState = {
    ...INITIAL_PROGRESSION,
    xp: 9_850,
    coins: 640,
    stats: { rounds: 612, perfectRounds: 74, gamesPlayed: 96, bestStreak: 23, bestDailyStreak: 15 },
    // Last played yesterday: the streak is alive and today's Daily is still to play.
    streak: { count: 15, lastDate: dateKey(new Date(now.getTime() - 86_400_000)), freezes: 2 },
    collection: collection(0.6),
    displayName: 'Minerva Fan',
    avatar: 'senator',
    weekly: { key: weekKey(now), xp: 1_240 },
    lastDaily: null,
  };
  // Unlocks follow the real rules, so the achievements screen agrees with the stats.
  return { ...base, unlocked: [...earnedAchievementIds(base)] };
}

/** The Ancient World fully starred bar its last two stages, so the map shows a road in progress. */
export function demoCampaign(): CampaignProgress {
  const out: CampaignProgress = {};
  const ancient = CAMPAIGN[0];
  if (ancient === undefined) return out;
  const stages = worldStages(ancient);
  stages.slice(0, Math.max(0, stages.length - 2)).forEach((s, i) => {
    out[s.id] = { stars: i % 4 === 3 ? 2 : 3, bestScore: 4_200 + ((i * 377) % 900) };
  });
  return out;
}
