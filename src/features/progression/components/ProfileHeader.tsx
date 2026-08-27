import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { heartsAvailable, levelForXp, levelProgress } from '@/domain';
import { usePremium } from '@/features/premium';
import { palette } from '@/theme/tokens';

import { useProgression } from '../ProgressionProvider';

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
      accessibilityLabel="View achievements"
      testID="profile-header"
      onPress={() => router.push('/achievements')}
      className="flex-row items-center gap-4 border border-hair bg-bg-raised p-4"
    >
      <View
        className="h-12 w-12 items-center justify-center rounded-full"
        style={{ backgroundColor: palette.accent.soft }}
      >
        <Text className="text-lg font-extrabold" style={{ color: palette.accent.default }}>
          {level}
        </Text>
      </View>

      <View className="flex-1">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-bold text-ink-primary">Level {level}</Text>
          <View className="flex-row items-center gap-3">
            <Text
              className="text-sm font-bold text-ink-primary"
              accessibilityLabel={hearts.unlimited ? 'Unlimited hearts' : `${hearts.count} hearts`}
              testID="header-hearts"
            >
              ❤️ {hearts.unlimited ? '∞' : hearts.count}
            </Text>
            <Text className="text-sm font-bold" style={{ color: palette.warning }}>
              {state.coins.toLocaleString()} 🪙
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
          {progress.xpIntoLevel} / {progress.xpForNextLevel} XP to next
        </Text>
      </View>

      <Text className="text-xl text-ink-muted">›</Text>
    </Pressable>
  );
}
