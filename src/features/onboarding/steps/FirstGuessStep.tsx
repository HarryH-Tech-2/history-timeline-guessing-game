import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

import { getQuestionById, getQuestions } from '@/data';
import type { RoundResult } from '@/domain';
import { RoundView } from '@/features/round/RoundView';
import { evaluateGuess } from '@/features/timeline/math';

/** A date almost everyone can place, and one that sits inside the default
 * framing every game round opens on, so nothing needs scrolling to find. */
const FIRST_QUESTION_ID = 'evt-moon-landing';

const COACH_MARKS: readonly [glyph: string, text: string][] = [
  ['↔', 'Drag to move'],
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
 * A real round with nothing at stake: no hearts, no XP, no coins. It is the
 * game's own RoundView — same timeline, same framing, same reveal — so the
 * player learns the one interaction that matters by doing it, and what they
 * see here is exactly what every round from now on looks like.
 */
export function FirstGuessStep({ onNext }: { onNext: () => void }) {
  const question = getQuestionById(FIRST_QUESTION_ID) ?? getQuestions()[0]!;
  const [result, setResult] = useState<RoundResult | null>(null);
  const revealed = result !== null;

  const submit = useCallback(
    (guessYear: number) => setResult(evaluateGuess(question, guessYear)),
    [question],
  );

  return (
    <RoundView
      question={question}
      phase={revealed ? 'revealed' : 'guessing'}
      result={result}
      onSubmit={submit}
      onNext={onNext}
      nextLabel="Got it"
      hud={
        <Animated.View entering={FadeInUp.springify().damping(18)}>
          <Text className="text-center text-xs font-semibold uppercase tracking-widest text-ink-muted">
            Your first guess
          </Text>
          <Text className="text-center text-2xl font-extrabold text-ink-primary">
            When did this happen?
          </Text>
        </Animated.View>
      }
      actions={<CoachMarks />}
      notice={
        <Animated.View entering={FadeIn.delay(200)} className="px-5 pb-2">
          <Text className="text-center text-sm text-ink-secondary">
            Within 20 years counts as a hit, and adds the event to your museum.
          </Text>
        </Animated.View>
      }
    />
  );
}
