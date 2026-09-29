import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { Button } from '@/components/ui';
import { getCategoryById, imageForQuestion } from '@/data';
import type { Question, RoundResult } from '@/domain';
import { haptic, NotificationFeedbackType } from '@/features/haptics';
import { useSound } from '@/features/sound';
import { TimelineTrack, trackHeightFor, useTimelineTransform } from '@/features/timeline';
import { isRightAnswer } from '@/features/timeline/math';
import { palette } from '@/theme/tokens';

import { Confetti } from './components/Confetti';
import { PromptCard } from './components/PromptCard';
import { RevealImage } from './components/RevealImage';
import { RevealSheet } from './components/RevealSheet';

const DEFAULT_RANGE = { min: 1700, max: 2026 } as const;

export interface AssistControls {
  submit: () => void;
  choose: (year: number) => void;
  /** Hide the timeline for the rest of this question (the footer is showing
   * multiple choice, which is then the only way to answer). */
  hideTimeline: () => void;
}

interface RoundViewProps {
  question: Question;
  phase: 'guessing' | 'revealed';
  result: RoundResult | null;
  /** `assisted` is set when the year was picked from bought multiple choice. */
  onSubmit: (guessYear: number, options?: { assisted: true }) => void;
  onNext: () => void;
  /** Mode-specific status bar rendered above the prompt (lives, Q x/N, ...). */
  hud?: ReactNode;
  /** Label for the advance button on the reveal sheet. */
  nextLabel?: string;
  /** Optional content rendered above the submit control (e.g. coach marks). */
  actions?: ReactNode;
  /**
   * Replaces the plain Submit button with a mode's own footer (hint, multiple
   * choice, submit). Remounted per question. `submit` scores the crosshair
   * year; `choose` scores a picked year as an assisted guess.
   */
  assist?: (controls: AssistControls) => ReactNode;
  /** Optional line shown just above the reveal sheet once revealed. */
  notice?: ReactNode;
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
  actions,
  assist,
  notice,
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

  // Both ways of answering land here: the crosshair year, or a year picked
  // from multiple choice (which skips the timeline and scores at half).
  const answer = useCallback(
    (guessYear: number, assisted: boolean) => {
      setAnchorYear(question.year);
      // "Right" is a single shared threshold so the haptic and the sting agree.
      const right = isRightAnswer(Math.round(guessYear) - question.year);

      haptic.notification(
        right ? NotificationFeedbackType.Success : NotificationFeedbackType.Warning,
      );
      playSound(right ? 'right' : 'wrong');

      // Show the answer with the least movement: the timeline stays where the
      // player left it unless the true year is off screen.
      controller.reveal(guessYear, question.year);

      if (assisted) onSubmit(guessYear, { assisted: true });
      else onSubmit(guessYear);
    },
    [controller, question.year, onSubmit, playSound],
  );

  const handleSubmit = useCallback(
    () => answer(controller.readGuessYear(), false),
    [answer, controller],
  );
  const handleChoose = useCallback((year: number) => answer(year, true), [answer]);

  // Keyed by question id rather than reset in an effect: a new question
  // brings the timeline straight back.
  const [timelineHiddenFor, setTimelineHiddenFor] = useState<string | null>(null);
  const hideTimeline = useCallback(() => setTimelineHiddenFor(question.id), [question.id]);
  const choicesMode = !revealed && timelineHiddenFor === question.id;

  // Next can take this whole view out of the tree (the last question hands
  // over to the run summary), often while the reveal zoom is still running
  // from a quick tap. So the timeline is stopped first, and the hand-off waits
  // a frame for it; a second tap in that window is ignored.
  const nextPending = useRef(false);
  const { halt } = controller;
  const handleNext = useCallback(() => {
    if (nextPending.current) return;
    nextPending.current = true;
    halt(() => {
      nextPending.current = false;
      onNext();
    });
  }, [halt, onNext]);

  // The reveal swaps the timeline for the illustration: the sheet already
  // states the year and the distance, and the picture is the payoff. The
  // timeline only stays if the question has no illustration.
  const image = imageForQuestion(question.id);
  const showImage = revealed && image !== undefined;

  // Behind the illustration the timeline is hidden, never unmounted, and kept
  // in its guessing state. Taking its ~200 animated ticks out of the tree
  // while the reveal re-frame is still running leaves Reanimated pushing
  // updates at views that no longer exist; each one throws on the main
  // thread, and a run of quick answers piled up enough to stall the app.
  // Laid out absolutely at the stage's width so the track never re-measures.
  const showMarkers = revealed && !showImage;
  // Hidden the same way (never unmounted) behind the reveal picture, and
  // while the footer's multiple choice is the way to answer.
  const trackHidden = showImage || choicesMode;
  // While guessing, the stage never gets less than the track needs (track +
  // its py-2 padding and border); the prompt card above shrinks its
  // illustration instead. On the reveal the track is hidden, so the stage
  // gives the reveal picture whatever room the sheet leaves.
  const stage = (
    <View
      className="flex-1"
      style={revealed || choicesMode ? undefined : { minHeight: trackHeightFor(height) + 18 }}
    >
      <View
        className={trackHidden ? 'absolute left-0 right-0 top-0 py-2' : 'flex-1 justify-center py-2'}
        style={trackHidden ? { opacity: 0 } : undefined}
        pointerEvents={trackHidden ? 'none' : 'auto'}
        accessibilityElementsHidden={trackHidden}
        importantForAccessibility={trackHidden ? 'no-hide-descendants' : 'auto'}
      >
        <TimelineTrack
          controller={controller}
          revealYear={showMarkers ? question.year : undefined}
          revealColour={colour}
          guessYear={showMarkers && result ? result.guessYear : undefined}
          anchorYear={anchorYear}
        />
      </View>
      {showImage && <RevealImage source={image} title={question.title} />}
    </View>
  );

  const revealSheet = revealed && result && (
    <>
      {notice}
      <RevealSheet
        result={result}
        categoryColour={colour}
        onNext={handleNext}
        nextLabel={nextLabel}
      />
    </>
  );

  // Hidden rather than unmounted once revealed, for the same reason as the
  // timeline: the button is still easing back from the press that submitted.
  const submitFooter = (
    <View
      className={revealed ? 'absolute bottom-0 left-0 right-0 gap-3 px-5 pb-5 pt-2' : 'gap-3 px-5 pb-5 pt-2'}
      style={revealed ? { opacity: 0 } : undefined}
      pointerEvents={revealed ? 'none' : 'auto'}
      accessibilityElementsHidden={revealed}
      importantForAccessibility={revealed ? 'no-hide-descendants' : 'auto'}
    >
      {actions}
      {assist ? (
        <Fragment key={question.id}>
          {assist({ submit: handleSubmit, choose: handleChoose, hideTimeline })}
        </Fragment>
      ) : (
        <Button label="Submit guess" onPress={handleSubmit} testID="submit-button" />
      )}
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
