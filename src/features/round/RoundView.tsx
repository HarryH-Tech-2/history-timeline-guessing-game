import { useCallback, type ReactNode } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useReducedMotion } from 'react-native-reanimated';

import { Button } from '@/components/ui';
import { getCategoryById } from '@/data';
import type { Question, RoundResult } from '@/domain';
import { useSound } from '@/features/sound';
import { TimelineTrack, useTimelineTransform } from '@/features/timeline';
import { isRightAnswer } from '@/features/timeline/math';
import { palette } from '@/theme/tokens';

import { Confetti } from './components/Confetti';
import { PromptCard } from './components/PromptCard';
import { RevealSheet } from './components/RevealSheet';

const DEFAULT_RANGE = { min: 1700, max: 2026 } as const;

interface RoundViewProps {
  question: Question;
  phase: 'guessing' | 'revealed';
  result: RoundResult | null;
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
  /** True when the revealed round just added its artefact to the museum. */
  acquired?: boolean;
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
  onSubmit,
  onNext,
  hud,
  nextLabel,
  reward,
  unlockedTitles,
  acquired,
  actions,
}: RoundViewProps) {
  const controller = useTimelineTransform({ initialRange: DEFAULT_RANGE });
  const reducedMotion = useReducedMotion();
  const { play: playSound } = useSound();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const category = getCategoryById(question.categoryId);
  const colour = category?.colour ?? palette.accent.default;
  const revealed = phase === 'revealed';

  const handleSubmit = useCallback(() => {
    const guessYear = controller.readGuessYear();
    // "Right" is a single shared threshold so the haptic and the sting agree.
    const right = isRightAnswer(Math.round(guessYear) - question.year);

    void Haptics.notificationAsync(
      right
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Warning,
    );
    playSound(right ? 'right' : 'wrong');

    // Show the answer with the least movement: the timeline stays where the
    // player left it unless the true year is off screen.
    controller.reveal(guessYear, question.year);

    onSubmit(guessYear);
  }, [controller, question.year, onSubmit, playSound]);

  const timeline = (
    <View className="flex-1 justify-center py-2">
      <TimelineTrack
        controller={controller}
        revealYear={revealed ? question.year : undefined}
        revealColour={colour}
        guessYear={revealed && result ? result.guessYear : undefined}
      />
    </View>
  );

  const revealSheet = revealed && result && (
    <RevealSheet
      result={result}
      categoryColour={colour}
      onNext={onNext}
      nextLabel={nextLabel}
      reward={reward}
      unlockedTitles={unlockedTitles}
      acquired={acquired}
    />
  );

  const submitFooter = !revealed && (
    <View className="gap-3 px-5 pb-5 pt-2">
      {actions}
      <Button label="Submit guess" onPress={handleSubmit} testID="submit-button" />
    </View>
  );

  if (isLandscape) {
    // Side-by-side in landscape: the prompt (and, after submitting, the
    // reveal sheet) scrolls in a left column while the timeline keeps the
    // full remaining width — the portrait stack would push the submit button
    // or the sheet off the short screen.
    return (
      <View className="flex-1">
        <View className="flex-1 flex-row gap-4 px-5 pt-3">
          <View className="w-2/5 gap-3">
            {hud}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-3 pb-4">
              <PromptCard
                questionId={question.id}
                title={question.title}
                subtitle={question.subtitle}
                compact={revealed}
              />
              {revealSheet}
            </ScrollView>
          </View>
          <View className="flex-1">
            {timeline}
            {submitFooter}
          </View>
        </View>
        {revealed && result?.isPerfect && <Confetti reducedMotion={reducedMotion} />}
      </View>
    );
  }

  return (
    <View className="flex-1">
      <View className="flex-1 gap-4 px-5 pt-3">
        {hud}
        <PromptCard
          questionId={question.id}
          title={question.title}
          subtitle={question.subtitle}
          compact={revealed}
        />

        {timeline}
      </View>

      {revealSheet}
      {submitFooter}

      {revealed && result?.isPerfect && <Confetti reducedMotion={reducedMotion} />}
    </View>
  );
}
