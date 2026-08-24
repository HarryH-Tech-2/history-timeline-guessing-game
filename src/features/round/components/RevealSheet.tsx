import { ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button } from '@/components/ui';
import type { RoundResult } from '@/domain';
import { formatYear } from '@/features/timeline/math';
import { useCountUp } from '@/hooks/useCountUp';
import { palette } from '@/theme/tokens';

interface RevealSheetProps {
  result: RoundResult;
  categoryColour: string;
  onNext: () => void;
  nextLabel?: string;
  /** XP and coins banked for this round, when a progression profile is active. */
  reward?: { xp: number; coins: number } | null;
  /** Titles of achievements unlocked this session, shown as a subtle callout. */
  unlockedTitles?: readonly string[];
  /** True when this round just added the question's artefact to the museum. */
  acquired?: boolean;
}

function headline(result: RoundResult): string {
  if (result.isPerfect) return 'Perfect!';
  const { errorYears } = result;
  if (errorYears <= 2) return 'So close!';
  if (errorYears <= 10) return 'Nicely done';
  if (errorYears <= 50) return 'Not bad';
  return 'Way off';
}

function distanceLabel(result: RoundResult): string {
  if (result.isPerfect) return 'You nailed the exact year';
  const years = result.errorYears;
  // Name the guess so the distance can be sanity-checked against the marker.
  return `You guessed ${formatYear(result.guessYear)} — ${years} ${years === 1 ? 'year' : 'years'} away`;
}

/** Post-submission panel: the correct year, the score, and the teaching moment. */
export function RevealSheet({
  result,
  categoryColour,
  onNext,
  nextLabel = 'Next',
  reward,
  unlockedTitles,
  acquired = false,
}: RevealSheetProps) {
  const animatedScore = useCountUp(result.score.total);
  const { question } = result;

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(18)}
      className="border-t border-hair bg-bg-overlay p-6"
    >
      <View className="mb-4 flex-row items-end justify-between">
        <View>
          <Text className="text-sm font-medium text-ink-muted">{headline(result)}</Text>
          <Text className="text-4xl font-extrabold text-ink-primary">
            {formatYear(question.year)}
          </Text>
          <Text className="mt-1 text-sm text-ink-secondary">{distanceLabel(result)}</Text>
        </View>
        <View className="items-end">
          <Text className="text-xs font-medium text-ink-muted">Score</Text>
          <Text
            className="text-3xl font-extrabold"
            style={{ color: categoryColour }}
            accessibilityLabel={`Score ${result.score.total}`}
          >
            +{animatedScore}
          </Text>
        </View>
      </View>

      {reward !== undefined && reward !== null && (reward.xp > 0 || reward.coins > 0) && (
        <View className="mb-3 flex-row gap-2" accessibilityLabel={`Earned ${reward.xp} XP and ${reward.coins} coins`}>
          <View className="border border-hair bg-bg-raised px-3 py-1">
            <Text className="text-xs font-bold" style={{ color: palette.accent.default }}>
              +{reward.xp} XP
            </Text>
          </View>
          {reward.coins > 0 && (
            <View className="border border-hair bg-bg-raised px-3 py-1">
              <Text className="text-xs font-bold" style={{ color: palette.warning }}>
                +{reward.coins} 🪙
              </Text>
            </View>
          )}
        </View>
      )}

      {acquired && (
        <View className="mb-3" testID="museum-acquired">
          <Text className="text-sm font-semibold" style={{ color: palette.accent.default }}>
            🏛️ Added to your museum
          </Text>
        </View>
      )}

      {unlockedTitles !== undefined && unlockedTitles.length > 0 && (
        <View className="mb-3">
          {unlockedTitles.map((title) => (
            <Text key={title} className="text-sm font-semibold" style={{ color: palette.success }}>
              🏆 Unlocked: {title}
            </Text>
          ))}
        </View>
      )}

      <ScrollView className="max-h-40" showsVerticalScrollIndicator={false}>
        <Text className="text-[15px] leading-6 text-ink-secondary">
          {question.longDescription}
        </Text>
      </ScrollView>

      <Button label={nextLabel} onPress={onNext} className="mt-5" testID="next-button" />
    </Animated.View>
  );
}
