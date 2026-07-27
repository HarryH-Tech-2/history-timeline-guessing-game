import { useCallback } from 'react';
import { View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useReducedMotion } from 'react-native-reanimated';

import { Button, Screen } from '@/components/ui';
import { getCategoryById } from '@/data';
import { TimelineTrack, useTimelineTransform } from '@/features/timeline';
import { palette } from '@/theme/tokens';

import { Confetti } from './components/Confetti';
import { PromptCard } from './components/PromptCard';
import { RevealSheet } from './components/RevealSheet';
import { useGuessRound } from './hooks/useGuessRound';

const DEFAULT_RANGE = { min: 1700, max: 2026 } as const;

/** The single-question guess loop: prompt, timeline, submit, reveal, repeat. */
export function RoundScreen() {
  const round = useGuessRound();
  const controller = useTimelineTransform({ initialRange: DEFAULT_RANGE });
  const reducedMotion = useReducedMotion();

  const category = getCategoryById(round.question.categoryId);
  const colour = category?.colour ?? palette.accent.default;

  const handleSubmit = useCallback(() => {
    const guessYear = controller.readGuessYear();
    const result = round.submit(guessYear);

    void Haptics.notificationAsync(
      result.isPerfect
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Warning,
    );

    // Bring both the guess and the true year into view for the reveal.
    const lo = Math.min(guessYear, result.question.year);
    const hi = Math.max(guessYear, result.question.year);
    const pad = Math.max(15, (hi - lo) * 0.4);
    controller.fitTo(lo - pad, hi + pad);
  }, [controller, round]);

  const handleNext = useCallback(() => {
    round.next();
    controller.fitTo(DEFAULT_RANGE.min, DEFAULT_RANGE.max);
  }, [controller, round]);

  const revealed = round.phase === 'revealed';

  return (
    <Screen>
      <View className="flex-1 px-5 pt-2">
        <PromptCard
          title={round.question.title}
          subtitle={round.question.subtitle}
          categoryName={category?.name ?? 'History'}
          categoryColour={colour}
          roundNumber={round.roundNumber}
        />

        <View className="flex-1 justify-center">
          <TimelineTrack
            controller={controller}
            revealYear={revealed ? round.question.year : undefined}
            revealColour={colour}
          />
        </View>
      </View>

      {revealed && round.result ? (
        <RevealSheet result={round.result} categoryColour={colour} onNext={handleNext} />
      ) : (
        <View className="px-5 pb-3">
          <Button label="Submit guess" onPress={handleSubmit} testID="submit-button" />
        </View>
      )}

      {revealed && round.result?.isPerfect && (
        <Confetti reducedMotion={reducedMotion} />
      )}
    </Screen>
  );
}
