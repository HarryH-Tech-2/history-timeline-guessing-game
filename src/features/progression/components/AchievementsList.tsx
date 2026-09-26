import { Platform, Pressable, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { levelForXp } from '@/domain';
import { showPlayGamesAchievements } from '@/services/playGames';
import { palette } from '@/theme/tokens';

import { ACHIEVEMENTS, achievementProgress, type Achievement } from '../achievements';
import { useProgression } from '../ProgressionProvider';

function AchievementRow({
  achievement,
  earned,
  current,
  index,
}: {
  achievement: Achievement;
  earned: boolean;
  /** Live progress toward the target (clamped to it). */
  current: number;
  index: number;
}) {
  const pct = Math.min(100, Math.round((current / achievement.target) * 100));

  return (
    <Animated.View entering={FadeInUp.delay(Math.min(index, 12) * 40).springify().damping(18)}>
      <View
        testID={`achievement-${achievement.id}`}
        className="flex-row items-center gap-4 border border-hair bg-bg-raised p-4"
        style={{ opacity: earned ? 1 : 0.6 }}
      >
        <Text className="text-3xl">{earned ? achievement.icon : '🔒'}</Text>
        <View className="flex-1">
          <Text className="text-base font-bold text-ink-primary">{achievement.title}</Text>
          <Text className="text-sm text-ink-secondary">{achievement.description}</Text>
          {!earned && (
            <View className="mt-2 h-1 overflow-hidden bg-bg-overlay">
              <View
                className="h-full bg-accent"
                style={{ width: `${pct}%` }}
                testID={`achievement-progress-${achievement.id}`}
              />
            </View>
          )}
        </View>
        {earned ? (
          <Text className="text-sm font-bold" style={{ color: palette.success }}>
            ✓
          </Text>
        ) : (
          <Text
            className="text-xs font-semibold text-ink-muted"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {current.toLocaleString()} / {achievement.target.toLocaleString()}
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

/**
 * Every achievement, earned ones lit and the rest showing how close they are.
 * Lives inside the Museum's Achievements tab; the caller provides the scroll.
 */
export function AchievementsList() {
  const { state } = useProgression();
  const unlocked = new Set(state.unlocked);
  const earnedCount = ACHIEVEMENTS.filter((a) => unlocked.has(a.id)).length;

  return (
    <View className="gap-3" testID="achievements-list">
      <Text className="text-sm font-semibold text-accent">
        {earnedCount} of {ACHIEVEMENTS.length} earned · Level {levelForXp(state.xp)}
      </Text>

      {Platform.OS === 'android' && (
        <Pressable
          onPress={() => {
            void showPlayGamesAchievements();
          }}
          accessibilityRole="button"
          accessibilityLabel="Open your achievements in Google Play Games"
          testID="achievements-play-games"
          className="mb-1 flex-row items-center justify-between border border-hair bg-bg-raised px-4 py-3"
        >
          <View className="flex-1 pr-3">
            <Text className="text-sm font-semibold text-ink-primary">Google Play Games</Text>
            <Text className="mt-0.5 text-xs text-ink-muted">
              Everything you earn here unlocks on your Play Games profile too.
            </Text>
          </View>
          <Text className="text-xl text-ink-muted">›</Text>
        </Pressable>
      )}

      {ACHIEVEMENTS.map((achievement, index) => (
        <AchievementRow
          key={achievement.id}
          achievement={achievement}
          earned={unlocked.has(achievement.id)}
          current={achievementProgress(achievement, state).current}
          index={index}
        />
      ))}
    </View>
  );
}
