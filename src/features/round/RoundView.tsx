import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useReducedMotion } from 'react-native-reanimated';

import { Button } from '@/components/ui';
import { getCategoryById, imageForQuestion } from '@/data';
import type { Question, RoundResult } from '@/domain';
import { useSound } from '@/features/sound';
import { TimelineTrack, useTimelineTransform } from '@/features/timeline';
import { isRightAnswer } from '@/features/timeline/math';
import { palette } from '@/theme/tokens';

import { Confetti } from './components/Confetti';
import { PromptCard } from './components/PromptCard';
import { RevealImage } from './components/RevealImage';
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

  // The framing carries over between questions on purpose (era campaigns stay
  // in their period), but a big-miss reveal leaves it zoomed out to thousands
  // of years, where decade dividers and century labels don't show. So a fresh
  // question zooms back to the default span around the answer just revealed —
  // and does nothing if the view is already that tight. Keyed on the stable
  // `refocus` only: the controller object is rebuilt every render.
  const lastAnswerYear = useRef<number | null>(null);
  useEffect(() => {
    if (revealed) lastAnswerYear.current = question.year;
  }, [revealed, question.year]);
  const { refocus } = controller;
  useEffect(() => {
    if (lastAnswerYear.current !== null) refocus(lastAnswerYear.current);
  }, [question.id, refocus]);
  // The same year, as render state for the track: its decade dividers are
  // mounted from the submit that reveals it (one commit, at a standstill), so
  // when the next question re-frames around it they are already there. A
  // block swap otherwise waits for the re-frame to settle (~1 s) and the
  // dividers pop in late — most visibly on the ancient questions where big
  // misses, and so big re-frames, are common.
  const [anchorYear, setAnchorYear] = useState<number | undefined>(undefined);

  const handleSubmit = useCallback(() => {
    setAnchorYear(question.year);
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

  // The reveal swaps the timeline for the illustration: the sheet already
  // states the year and the distance, and the picture is the payoff. The
  // timeline only stays if the question has no illustration.
  const image = imageForQuestion(question.id);
  const showImage = revealed && image !== undefined;

  const timeline = (
    <View className="flex-1 justify-center py-2">
      <TimelineTrack
        controller={controller}
        revealYear={revealed ? question.year : undefined}
        revealColour={colour}
        guessYear={revealed && result ? result.guessYear : undefined}
        anchorYear={anchorYear}
      />
    </View>
  );

  const stage = showImage ? <RevealImage source={image} title={question.title} /> : timeline;

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
                showImage={!showImage}
              />
              {revealSheet}
            </ScrollView>
          </View>
          <View className="flex-1">
            {stage}
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
          showImage={!showImage}
        />

        {stage}
      </View>

      {revealSheet}
      {submitFooter}

      {revealed && result?.isPerfect && <Confetti reducedMotion={reducedMotion} />}
    </View>
  );
}
