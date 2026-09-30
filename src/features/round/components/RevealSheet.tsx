import { ScrollView, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Button } from '@/components/ui';
import type { RoundResult } from '@/domain';
import { isRightAnswer } from '@/features/timeline/math';
import { useCountUp } from '@/hooks/useCountUp';
import { displayYear, t } from '@/i18n';
import { palette } from '@/theme/tokens';

interface RevealSheetProps {
  result: RoundResult;
  categoryColour: string;
  onNext: () => void;
  nextLabel?: string;
}

function headline(result: RoundResult): string {
  if (result.isPerfect) return t('round.reveal.perfect');
  const { errorYears } = result;
  if (errorYears <= 2) return t('round.reveal.soClose');
  if (errorYears <= 10) return t('round.reveal.nicelyDone');
  if (errorYears <= 50) return t('round.reveal.notBad');
  return t('round.reveal.wayOff');
}

function distanceLabel(result: RoundResult): string {
  if (result.isPerfect) return t('round.reveal.nailedIt');
  const years = result.errorYears;
  // Name the guess so the distance can be sanity-checked against the marker.
  return t('round.reveal.guessedAway', {
    count: years,
    guess: displayYear(result.guessYear),
    years: String(years),
  });
}

type Verdict = 'perfect' | 'hit' | 'miss';

function verdictOf(result: RoundResult): Verdict {
  if (result.isPerfect) return 'perfect';
  return isRightAnswer(result.errorYears) ? 'hit' : 'miss';
}

/** Ribbon colours by outcome: gold for an exact year, green for a hit, quiet for a miss. */
const RIBBON: Record<Verdict, { bg: string; fg: string }> = {
  perfect: { bg: palette.warning, fg: '#1D1712' },
  hit: { bg: palette.success, fg: '#FFFFFF' },
  miss: { bg: 'transparent', fg: '' },
};

/** The ribbon's side note. A function: t() must not run at import. */
function ribbonNote(verdict: Verdict): string | null {
  if (verdict === 'perfect') return t('round.reveal.exactYear');
  if (verdict === 'hit') return t('round.reveal.within20');
  return null;
}

/**
 * Post-submission card: a verdict ribbon, the correct year as the hero, the
 * score in a chip, then the teaching moment. Lifts off the timeline as a
 * raised card rather than a flat panel so the reveal reads as an event.
 */
export function RevealSheet({
  result,
  categoryColour,
  onNext,
  nextLabel = t('round.reveal.next'),
}: RevealSheetProps) {
  const animatedScore = useCountUp(result.score.total);
  const { question } = result;
  const verdict = verdictOf(result);
  const ribbon = RIBBON[verdict];
  const note = ribbonNote(verdict);

  return (
    <Animated.View
      entering={FadeInUp.springify().damping(16).stiffness(140)}
      className="px-3 pb-3"
      testID="reveal-sheet"
    >
      <View
        className="overflow-hidden rounded-2xl border border-hair bg-bg-raised"
        style={{
          shadowColor: '#000',
          shadowOpacity: 0.16,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 10,
        }}
      >
        {/* Verdict ribbon */}
        <View
          className={`flex-row items-center justify-between px-5 py-2.5 ${
            verdict === 'miss' ? 'border-b border-hair bg-bg-overlay' : ''
          }`}
          style={verdict === 'miss' ? undefined : { backgroundColor: ribbon.bg }}
          testID={`reveal-verdict-${verdict}`}
        >
          <Text
            className={`text-xs font-extrabold uppercase tracking-widest ${
              verdict === 'miss' ? 'text-ink-secondary' : ''
            }`}
            style={verdict === 'miss' ? undefined : { color: ribbon.fg }}
          >
            {headline(result)}
          </Text>
          {note !== null && (
            <Text className="text-xs font-semibold" style={{ color: ribbon.fg, opacity: 0.9 }}>
              {note}
            </Text>
          )}
        </View>

        <View className="px-5 pt-4">
          <View className="flex-row items-end justify-between gap-4">
            <View className="flex-1">
              <Text className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                {t('round.reveal.theYear')}
              </Text>
              <Text
                className="text-5xl font-extrabold text-ink-primary"
                style={{ fontVariant: ['tabular-nums'], includeFontPadding: false }}
              >
                {displayYear(question.year)}
              </Text>
              <Text className="mt-1 text-sm text-ink-secondary">{distanceLabel(result)}</Text>
              {result.assisted === true && (
                <Text
                  className="mt-1 self-start border border-hair px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted"
                  testID="reveal-assisted-tag"
                >
                  {t('round.reveal.assisted')}
                </Text>
              )}
            </View>
            <View
              className="items-center rounded-xl border px-4 py-2"
              style={{ borderColor: categoryColour, backgroundColor: `${categoryColour}1A` }}
              testID="reveal-score-chip"
            >
              <Text
                className="text-[10px] font-bold uppercase tracking-wide"
                style={{ color: categoryColour }}
              >
                {t('round.reveal.score')}
              </Text>
              <Text
                className="text-3xl font-extrabold"
                style={{ color: categoryColour, fontVariant: ['tabular-nums'] }}
                accessibilityLabel={t('round.reveal.scoreLabel', { score: String(result.score.total) })}
              >
                +{animatedScore}
              </Text>
            </View>
          </View>

          <View className="my-4 h-px bg-hair" />

          <ScrollView className="max-h-36" showsVerticalScrollIndicator={false}>
            <Text className="text-[15px] leading-6 text-ink-secondary">
              {question.longDescription}
            </Text>
          </ScrollView>

          <Button
            label={nextLabel}
            glyph="→"
            variant="hero"
            onPress={onNext}
            className="mb-5 mt-5"
            testID="next-button"
          />
        </View>
      </View>
    </Animated.View>
  );
}
