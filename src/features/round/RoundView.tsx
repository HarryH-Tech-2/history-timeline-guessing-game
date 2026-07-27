import { useCallback, useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useReducedMotion } from 'react-native-reanimated';

import { Button } from '@/components/ui';
import { getCategoryById } from '@/data';
import type { Question, RoundResult } from '@/domain';
import { TimelineTrack, useTimelineTransform } from '@/features/timeline';
import { palette } from '@/theme/tokens';

import { Confetti } from './components/Confetti';
import { PromptCard } from './components/PromptCard';
import { RevealSheet } from './components/RevealSheet';

const DEFAULT_RANGE = { min: 1700, max: 2026 } as const;

interface RoundViewProps {
  question: Question;
  phase: 'guessing' | 'revealed';
  result: RoundResult | null;
  /** 1-based position of this question, shown on the prompt. */
  roundNumber: number;
  onSubmit: (guessYear: number) => void;
  onNext: () => void;
  /** Mode-specific status bar rendered above the prompt (lives, Q x/N, ...). */
  hud?: ReactNode;
  /** Label for the advance button on the reveal sheet. */
  nextLabel?: string;
  /** XP/coins banked for the revealed round, surfaced on the reveal sheet. */
  reward?: { xp: number; coins: number } | null;
  /** Achievements unlocked this session, surfaced on the reveal sheet. */
  unlockedTitles?: readonly string[];
  /** Optional control rendered next to the submit button (e.g. a hint). */
  actions?: ReactNode;
}

/**
 * The presentational guess loop: prompt, timeline, submit, reveal. It owns the
 * timeline transform (a view concern) but is otherwise stateless — the parent
 * mode screen drives which question shows and what happens on submit/next.
 */
export function RoundView({
  question,
  phase,
  result,
  roundNumber,
  onSubmit,
  onNext,
  hud,
  nextLabel,
  reward,
  unlockedTitles,
  actions,
}: RoundViewProps) {
  const controller = useTimelineTransform({ initialRange: DEFAULT_RANGE });
  const reducedMotion = useReducedMotion();

  const category = getCategoryById(question.categoryId);
  const colour = category?.colour ?? palette.accent.default;
  const revealed = phase === 'revealed';

  // Reset the framing whenever a fresh question arrives.
  useEffect(() => {
    controller.fitTo(DEFAULT_RANGE.min, DEFAULT_RANGE.max);
  }, [question.id, controller]);

  const handleSubmit = useCallback(() => {
    const guessYear = controller.readGuessYear();
    const isPerfect = Math.round(guessYear) === question.year;

    void Haptics.notificationAsync(
      isPerfect
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Warning,
    );

    // Bring both the guess and the true year into view for the reveal.
    const lo = Math.min(guessYear, question.year);
    const hi = Math.max(guessYear, question.year);
    const pad = Math.max(15, (hi - lo) * 0.4);
    controller.fitTo(lo - pad, hi + pad);

    onSubmit(guessYear);
  }, [controller, question.year, onSubmit]);

  return (
    <View className="flex-1">
      <View className="flex-1 px-5 pt-2">
        {hud}
        <PromptCard
          title={question.title}
          subtitle={question.subtitle}
          categoryName={category?.name ?? 'History'}
          categoryColour={colour}
          roundNumber={roundNumber}
        />

        <View className="flex-1 justify-center">
          <TimelineTrack
            controller={controller}
            revealYear={revealed ? question.year : undefined}
            revealColour={colour}
          />
        </View>
      </View>

      {revealed && result ? (
        <RevealSheet
          result={result}
          categoryColour={colour}
          onNext={onNext}
          nextLabel={nextLabel}
          reward={reward}
          unlockedTitles={unlockedTitles}
        />
      ) : (
        <View className="gap-2 px-5 pb-3">
          {actions}
          <Button label="Submit guess" onPress={handleSubmit} testID="submit-button" />
        </View>
      )}

      {revealed && result?.isPerfect && <Confetti reducedMotion={reducedMotion} />}
    </View>
  );
}
