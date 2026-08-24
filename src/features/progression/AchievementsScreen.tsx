import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Screen } from '@/components/ui';
import { levelForXp } from '@/domain';
import { palette } from '@/theme/tokens';

import { ACHIEVEMENTS, type Achievement } from './achievements';
import { useProgression } from './ProgressionProvider';

function AchievementRow({
  achievement,
  earned,
  index,
}: {
  achievement: Achievement;
  earned: boolean;
  index: number;
}) {
  return (
    <Animated.View entering={FadeInUp.delay(index * 40).springify().damping(18)}>
      <View
        testID={`achievement-${achievement.id}`}
        className="flex-row items-center gap-4 border border-hair bg-bg-raised p-4"
        style={{ opacity: earned ? 1 : 0.45 }}
      >
        <Text className="text-3xl">{earned ? achievement.icon : '🔒'}</Text>
        <View className="flex-1">
          <Text className="text-base font-bold text-ink-primary">{achievement.title}</Text>
          <Text className="text-sm text-ink-secondary">{achievement.description}</Text>
        </View>
        {earned && (
          <Text className="text-sm font-bold" style={{ color: palette.success }}>
            ✓
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

/** Gallery of every achievement, earned ones lit and the rest locked. */
export function AchievementsScreen() {
  const router = useRouter();
  const { state } = useProgression();
  const unlocked = new Set(state.unlocked);
  const earnedCount = ACHIEVEMENTS.filter((a) => unlocked.has(a.id)).length;

  return (
    <Screen>
      <ScrollView
        contentContainerClassName="px-5 pt-6 pb-10 gap-3"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-2 flex-row items-center justify-between">
          <View>
            <Text className="text-3xl font-extrabold text-ink-primary">Achievements</Text>
            <Text className="text-base text-ink-secondary">
              {earnedCount} of {ACHIEVEMENTS.length} earned · Level {levelForXp(state.xp)}
            </Text>
          </View>
          {router.canGoBack() && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              testID="achievements-back"
              onPress={() => router.back()}
            >
              <Text className="text-2xl text-ink-muted">✕</Text>
            </Pressable>
          )}
        </View>

        {ACHIEVEMENTS.map((achievement, index) => (
          <AchievementRow
            key={achievement.id}
            achievement={achievement}
            earned={unlocked.has(achievement.id)}
            index={index}
          />
        ))}
      </ScrollView>
    </Screen>
  );
}
