import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { heartsAvailable, levelForXp, levelProgress } from '@/domain';
import { usePremium } from '@/features/premium';
import { formatNumber, t } from '@/i18n';
import { palette } from '@/theme/tokens';

import { resolveAvatar } from '../avatars';
import { useProgression } from '../ProgressionProvider';
import { AvatarBadge } from './AvatarBadge';

/**
 * The home-screen player card: current level, a progress bar toward the next
 * level, and the coin balance. Tapping it opens the achievements gallery.
 */
export function ProfileHeader() {
  const router = useRouter();
  const { state } = useProgression();
  const { isPremium } = usePremium();
  // Computed inline (not via useHearts) to keep progression free of a cycle
  // with the hearts feature; the header re-renders on every profile change.
  const hearts = {
    unlimited: isPremium,
    count: heartsAvailable(state.hearts, Date.now()),
  };

  const level = levelForXp(state.xp);
  const progress = levelProgress(state.xp);
  const pct = Math.round(progress.fraction * 100);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('achievements.ui.header.viewLabel')}
      testID="profile-header"
      onPress={() => router.push({ pathname: '/(tabs)/museum', params: { tab: 'achievements' } })}
      className="flex-row items-center gap-4 border border-hair bg-bg-raised p-4"
    >
      <AvatarBadge avatar={resolveAvatar(state.avatar, isPremium)} level={level} size="md" />

      <View className="flex-1">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-bold text-ink-primary">{t('common.level', { level })}</Text>
          <View className="flex-row items-center gap-3">
            <Text
              className="text-sm font-bold text-ink-primary"
              accessibilityLabel={
                hearts.unlimited
                  ? t('achievements.ui.header.unlimitedHearts')
                  : t('achievements.ui.header.hearts', { count: hearts.count })
              }
              testID="header-hearts"
            >
              ❤️ {hearts.unlimited ? '∞' : hearts.count}
            </Text>
            <Text
              className="text-sm font-bold"
              style={{ color: palette.warning }}
              accessibilityLabel={
                isPremium ? t('common.unlimitedCoins') : t('common.coins', { count: state.coins })
              }
              testID="header-coins"
            >
              {isPremium ? '∞' : formatNumber(state.coins)} 🪙
            </Text>
          </View>
        </View>

        <View className="mt-2 h-2 overflow-hidden rounded-full bg-bg-overlay">
          <View
            className="h-full rounded-full"
            style={{ width: `${pct}%`, backgroundColor: palette.accent.default }}
          />
        </View>
        <Text className="mt-1 text-xs text-ink-muted">
          {t('profile.xpToNext', { into: progress.xpIntoLevel, needed: progress.xpForNextLevel })}
        </Text>
      </View>

      <Text className="text-xl text-ink-muted">›</Text>
    </Pressable>
  );
}
