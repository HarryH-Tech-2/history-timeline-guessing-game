import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button } from '@/components/ui';
import type { RoundResult } from '@/domain';
import { formatYear } from '@/features/timeline/math';
import { useCountUp } from '@/hooks/useCountUp';

interface RevealSheetProps {
  result: RoundResult;
  categoryColour: string;
  onNext: () => void;
  nextLabel?: string;
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
  return `You were ${years} ${years === 1 ? 'year' : 'years'} away`;
}

/** Post-submission panel: the correct year, the score, and the teaching moment. */
export function RevealSheet({
  result,
  categoryColour,
  onNext,
  nextLabel = 'Next',
}: RevealSheetProps) {
  const animatedScore = useCountUp(result.score.total);
  const { question } = result;

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(18)}
      className="rounded-t-3xl border-t border-hair bg-bg-overlay p-6"
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

      <ScrollView className="max-h-40" showsVerticalScrollIndicator={false}>
        <Text className="text-[15px] leading-6 text-ink-secondary">
          {question.longDescription}
        </Text>
        {question.source !== undefined && (
          <Pressable
            accessibilityRole="link"
            onPress={() => {
              if (question.source) void Linking.openURL(question.source);
            }}
            className="mt-3 self-start"
          >
            <Text className="text-sm font-semibold text-accent">Read more →</Text>
          </Pressable>
        )}
      </ScrollView>

      <Button label={nextLabel} onPress={onNext} className="mt-5" testID="next-button" />
    </Animated.View>
  );
}
