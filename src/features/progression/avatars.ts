import { t } from '@/i18n/translate';
import type { TranslationKey } from '@/i18n/types';

import { achievementTitle, type AchievementId } from './achievements';

/** How an avatar becomes available. Era and achievement unlocks are permanent. */
export type AvatarUnlock =
  | { kind: 'free' }
  | { kind: 'era'; eraId: string }
  | { kind: 'achievement'; achievementId: AchievementId }
  | { kind: 'premium' };

export interface Avatar {
  id: string;
  emoji: string;
  unlock: AvatarUnlock;
}

/**
 * The profile avatars, in picker order: a few free faces, one per campaign
 * era, a handful earned through achievements, and a Premium set.
 */
export const AVATARS: readonly Avatar[] = [
  { id: 'owl', emoji: '🦉', unlock: { kind: 'free' } },
  { id: 'scribe', emoji: '📜', unlock: { kind: 'free' } },
  { id: 'explorer', emoji: '🧭', unlock: { kind: 'free' } },
  { id: 'archaeologist', emoji: '🏺', unlock: { kind: 'free' } },
  { id: 'senator', emoji: '🏛️', unlock: { kind: 'era', eraId: 'ancient' } },
  { id: 'knight', emoji: '⚔️', unlock: { kind: 'era', eraId: 'medieval' } },
  { id: 'navigator', emoji: '⛵', unlock: { kind: 'era', eraId: 'early-modern' } },
  { id: 'inventor', emoji: '💡', unlock: { kind: 'era', eraId: 'nineteenth' } },
  { id: 'astronaut', emoji: '🚀', unlock: { kind: 'era', eraId: 'modern' } },
  { id: 'sharpshooter', emoji: '🎯', unlock: { kind: 'achievement', achievementId: 'bullseye' } },
  { id: 'centurion', emoji: '🛡️', unlock: { kind: 'achievement', achievementId: 'centurion' } },
  { id: 'torchbearer', emoji: '🔥', unlock: { kind: 'achievement', achievementId: 'daily-streak-7' } },
  { id: 'curator', emoji: '🖼️', unlock: { kind: 'achievement', achievementId: 'curator' } },
  { id: 'scholar', emoji: '🎓', unlock: { kind: 'achievement', achievementId: 'scholar' } },
  { id: 'monarch', emoji: '👑', unlock: { kind: 'premium' } },
  { id: 'dragon', emoji: '🐉', unlock: { kind: 'premium' } },
  { id: 'lion', emoji: '🦁', unlock: { kind: 'premium' } },
];

export const DEFAULT_AVATAR: Avatar = AVATARS[0]!;

/** What the player has done, as far as avatars care. */
export interface AvatarProgress {
  isPremium: boolean;
  /** Achievement ids the player has earned. */
  achievements: ReadonlySet<string>;
  /** Campaign era ids whose main path is complete. */
  completedEras: ReadonlySet<string>;
}

export function isAvatarUnlocked(avatar: Avatar, progress: AvatarProgress): boolean {
  switch (avatar.unlock.kind) {
    case 'free':
      return true;
    case 'era':
      return progress.completedEras.has(avatar.unlock.eraId);
    case 'achievement':
      return progress.achievements.has(avatar.unlock.achievementId);
    case 'premium':
      return progress.isPremium;
  }
}

/**
 * The avatar to show for a saved choice. Unknown ids fall back to the owl, and
 * so does a Premium avatar once Premium has lapsed; earned ones stay earned.
 */
export function resolveAvatar(avatarId: string | null, isPremium: boolean): Avatar {
  const avatar = AVATARS.find((a) => a.id === avatarId);
  if (avatar === undefined) return DEFAULT_AVATAR;
  if (avatar.unlock.kind === 'premium' && !isPremium) return DEFAULT_AVATAR;
  return avatar;
}

export function avatarName(avatar: Avatar): string {
  return t(`profile.avatar.names.${avatar.id}` as TranslationKey);
}

/** How to unlock a locked avatar, e.g. "Complete The Middle Ages". */
export function avatarUnlockHint(avatar: Avatar, eraName: (eraId: string) => string): string {
  switch (avatar.unlock.kind) {
    case 'free':
      return '';
    case 'era':
      return t('profile.avatar.hintEra', { era: eraName(avatar.unlock.eraId) });
    case 'achievement':
      return t('profile.avatar.hintAchievement', { name: achievementTitle(avatar.unlock.achievementId) });
    case 'premium':
      return t('profile.avatar.hintPremium');
  }
}
