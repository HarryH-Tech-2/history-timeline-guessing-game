import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

import { Button } from '@/components/ui';
import { getQuestionById, getQuestions } from '@/data';
import type { RoundResult } from '@/domain';
import { PromptCard } from '@/features/round/components/PromptCard';
import { RevealSheet } from '@/features/round/components/RevealSheet';
import { TimelineTrack, useTimelineTransform } from '@/features/timeline';
import { evaluateGuess } from '@/features/timeline/math';
import { palette } from '@/theme/tokens';

/** A date almost everyone can place, framed so the answer is already on screen. */
const FIRST_QUESTION_ID = 'evt-moon-landing';
const FIRST_RANGE = { min: 1900, max: 2000 } as const;

const COACH_MARKS: readonly [glyph: string, text: string][] = [
  ['↔', 'Drag to move'],
  ['⤢', 'Pinch to zoom'],
  ['− +', 'One year at a time'],
];

function CoachMarks() {
  return (
    <Animated.View
      entering={FadeIn.delay(300).duration(400)}
      className="flex-row flex-wrap justify-center gap-2"
      testID="onboarding-coach-marks"
    >
      {COACH_MARKS.map(([glyph, text]) => (
        <View
          key={text}
          className="flex-row items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1"
        >
          <Text className="text-xs font-extrabold text-accent" style={{ includeFontPadding: false }}>
            {glyph}
          </Text>
          <Text className="text-xs font-semibold text-ink-primary">{text}</Text>
        </View>
      ))}
    </Animated.View>
  );
}

/**
 * The real timeline with a real question, and nothing at stake: no hearts, no
 * XP, no coins. The player learns the one interaction that matters by doing
 * it, and meets the verdict card they will see after every guess from now on.
 */
export function FirstGuessStep({ onNext }: { onNext: () => void }) {
  const question = getQuestionById(FIRST_QUESTION_ID) ?? getQuestions()[0]!;
  const controller = useTimelineTransform({ initialRange: FIRST_RANGE });
  const [result, setResult] = useState<RoundResult | null>(null);
  const revealed = result !== null;

  const submit = useCallback(() => {
    const guess = controller.readGuessYear();
    controller.reveal(guess, question.year);
    setResult(evaluateGuess(question, guess));
  }, [controller, question]);

  return (
    <View className="flex-1 gap-3">
      <Animated.View entering={FadeInUp.springify().damping(18)}>
        <Text className="text-center text-xs font-semibold uppercase tracking-widest text-ink-muted">
          Your first guess
        </Text>
        <Text className="text-center text-2xl font-extrabold text-ink-primary">
          When did this happen?
        </Text>
      </Animated.View>

      <PromptCard
        questionId={question.id}
        title={question.title}
        subtitle={question.subtitle}
        compact={revealed}
        showImage={!revealed}
      />

      {!revealed && <CoachMarks />}

      <View className="flex-1 justify-center">
        <TimelineTrack
          controller={controller}
          revealYear={result?.question.year}
          revealColour={palette.accent.default}
          guessYear={result?.guessYear}
        />
      </View>

      {revealed ? (
        <>
          <Animated.View entering={FadeIn.delay(200)} className="px-2">
            <Text className="text-center text-sm text-ink-secondary">
              Within 20 years counts as a hit, and adds the event to your museum.
            </Text>
          </Animated.View>
          <RevealSheet
            result={result}
            categoryColour={palette.accent.default}
            onNext={onNext}
            nextLabel="Got it"
          />
        </>
      ) : (
        <Button label="Submit guess" onPress={submit} testID="onboarding-submit" />
      )}
    </View>
  );
}
