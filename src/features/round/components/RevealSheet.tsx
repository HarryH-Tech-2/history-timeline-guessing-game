import { ScrollView, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Button } from '@/components/ui';
import type { RoundResult } from '@/domain';
import { formatYear, isRightAnswer } from '@/features/timeline/math';
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

type Verdict = 'perfect' | 'hit' | 'miss';

function verdictOf(result: RoundResult): Verdict {
  if (result.isPerfect) return 'perfect';
  return isRightAnswer(result.errorYears) ? 'hit' : 'miss';
}

/** Ribbon colours by outcome: gold for an exact year, green for a hit, quiet for a miss. */
const RIBBON: Record<Verdict, { bg: string; fg: string; note: string | null }> = {
  perfect: { bg: palette.warning, fg: '#1D1712', note: 'Exact year' },
  hit: { bg: palette.success, fg: '#FFFFFF', note: 'Within 20 years' },
  miss: { bg: 'transparent', fg: '', note: null },
};

/** A small rounded tag for the round's side-effects: coins, museum, achievements. */
function Pill({ text, colour, testID }: { text: string; colour: string; testID?: string }) {
  return (
    <View
      className="flex-row items-center rounded-full border border-hair bg-bg-overlay px-3 py-1"
      testID={testID}
    >
      <Text className="text-xs font-bold" style={{ color: colour, includeFontPadding: false }}>
        {text}
      </Text>
    </View>
  );
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
  nextLabel = 'Next',
  reward,
  unlockedTitles,
  acquired = false,
}: RevealSheetProps) {
  const animatedScore = useCountUp(result.score.total);
  const { question } = result;
  const verdict = verdictOf(result);
  const ribbon = RIBBON[verdict];
  const coins = reward?.coins ?? 0;
  const titles = unlockedTitles ?? [];
  const hasPills = coins > 0 || acquired || titles.length > 0;

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
          {ribbon.note !== null && (
            <Text className="text-xs font-semibold" style={{ color: ribbon.fg, opacity: 0.9 }}>
              {ribbon.note}
            </Text>
          )}
        </View>

        <View className="px-5 pt-4">
          <View className="flex-row items-end justify-between gap-4">
            <View className="flex-1">
              <Text className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                The year
              </Text>
              <Text
                className="text-5xl font-extrabold text-ink-primary"
                style={{ fontVariant: ['tabular-nums'], includeFontPadding: false }}
              >
                {formatYear(question.year)}
              </Text>
              <Text className="mt-1 text-sm text-ink-secondary">{distanceLabel(result)}</Text>
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
                Score
              </Text>
              <Text
                className="text-3xl font-extrabold"
                style={{ color: categoryColour, fontVariant: ['tabular-nums'] }}
                accessibilityLabel={`Score ${result.score.total}`}
              >
                +{animatedScore}
              </Text>
            </View>
          </View>

          {hasPills && (
            <View className="mt-4 flex-row flex-wrap gap-2">
              {coins > 0 && (
                <Pill text={`+${coins} 🪙`} colour={palette.warning} testID="reveal-coins" />
              )}
              {acquired && (
                <Pill
                  text="🏛️ Added to your museum"
                  colour={palette.accent.default}
                  testID="museum-acquired"
                />
              )}
              {titles.map((title) => (
                <Pill key={title} text={`🏆 ${title}`} colour={palette.success} />
              ))}
            </View>
          )}

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
