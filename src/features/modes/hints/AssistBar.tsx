import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui';
import type { Question } from '@/domain';
import { usePremium } from '@/features/premium/PremiumProvider';
import { useProgression } from '@/features/progression';
import { displayYear, t } from '@/i18n';
import { track } from '@/services/analytics';
import { cn } from '@/utils/cn';

import { MULTIPLE_CHOICE_COST, multipleChoiceYears } from './choices';
import { centuryHint, HINT_COST, hintTemplate } from './hint';

interface AssistBarProps {
  question: Question;
  /** Submit the year under the timeline crosshair. */
  onSubmit: () => void;
  /** Submit a year picked from multiple choice (scored at half). */
  onChoose: (year: number) => void;
  /**
   * Called once when the four choices appear. The choices are then the only
   * way to answer: the round hides its timeline, and the timeline's Submit
   * goes too, so nobody can read the options and drag to the right one for
   * full points.
   */
  onChoicesShown?: () => void;
}

/** A small coin-priced helper pill, sized to its content: glyph, name and
 * price (a tick once it has been used this round). */
function AssistButton({
  glyph,
  label,
  price,
  used,
  disabled,
  onPress,
  testID,
}: {
  glyph: string;
  label: string;
  price: string;
  used: boolean;
  disabled: boolean;
  onPress: () => void;
  testID: string;
}) {
  const inactive = disabled || used;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={used ? t('round.hints.used', { label }) : t('round.hints.buttonLabel', { label, price })}
      accessibilityState={{ disabled: inactive }}
      testID={testID}
      className={cn(
        'h-10 flex-row items-center gap-1.5 rounded-full border px-4 active:opacity-70',
        used ? 'border-hair bg-bg-overlay' : 'border-accent/35 bg-accent/5',
      )}
      style={{ opacity: disabled && !used ? 0.45 : 1 }}
    >
      <Text className="text-sm" style={{ includeFontPadding: false }}>
        {glyph}
      </Text>
      <Text
        className={cn('text-sm font-bold', used ? 'text-ink-muted' : 'text-ink-primary')}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Text className="text-xs font-semibold text-ink-muted" numberOfLines={1}>
        {used ? t('round.hints.usedTag') : `· ${price}`}
      </Text>
    </Pressable>
  );
}

/**
 * The guess footer: the century hint and multiple choice as a pair of
 * coin-priced chips above a full-width Submit, with whatever they unlocked
 * shown above the chips.
 * Mounted per question (RoundView keys it), so it starts fresh each round.
 */
export function AssistBar({ question, onSubmit, onChoose, onChoicesShown }: AssistBarProps) {
  const { state, spend } = useProgression();
  const { isPremium } = usePremium();
  const [hintShown, setHintShown] = useState(false);
  const [choices, setChoices] = useState<number[] | null>(null);
  const picked = useRef(false);

  const price = (cost: number) => (isPremium ? t('round.hints.free') : t('round.hints.cost', { cost }));
  const canAfford = (cost: number) => isPremium || state.coins >= cost;

  const buyHint = () => {
    if (spend(HINT_COST)) {
      track('hint_used', { question_id: question.id });
      setHintShown(true);
    }
  };

  const buyChoices = () => {
    if (spend(MULTIPLE_CHOICE_COST)) {
      track('multiple_choice_used', { question_id: question.id });
      setChoices(multipleChoiceYears(question));
      onChoicesShown?.();
    }
  };

  const choose = (year: number) => {
    if (picked.current) return;
    picked.current = true;
    onChoose(year);
  };

  // No entering animations on the hint or the choices: a layout animation on a
  // view that mounts as Submit unmounts left it measured short on Android, and
  // the chips below drew over it.

  // The template is one sentence with a {band} slot; split it so the band
  // (the actual information) renders bold inside the flavour copy.
  const [before = '', after = ''] = hintTemplate(question.id).split('{band}');

  return (
    <View className="gap-3">
      {hintShown && (
        <View className="rounded-xl border border-hair bg-bg-raised px-3 py-2" testID="hint-line">
          <Text className="text-center text-sm text-ink-secondary">
            {before}
            <Text className="font-bold text-ink-primary">{centuryHint(question.year)}</Text>
            {after}
          </Text>
        </View>
      )}

      {choices !== null && (
        <View className="gap-2" testID="choices">
          <Text className="text-center text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
            {t('round.hints.tapToAnswer')}
          </Text>
          {/* Two explicit rows: a wrapping row with a row gap is measured as one
              row on Android, so whatever sits below drew over the second. */}
          {[choices.slice(0, 2), choices.slice(2)].map((row, r) => (
            <View key={r} className="flex-row gap-2">
              {row.map((year) => (
                <Pressable
                  key={year}
                  onPress={() => choose(year)}
                  accessibilityRole="button"
                  accessibilityLabel={t('round.hints.answer', { year: displayYear(year) })}
                  testID={`choice-${year}`}
                  className="h-12 flex-1 items-center justify-center rounded-xl border-2 border-accent/60 bg-accent/10 active:opacity-70"
                >
                  <Text
                    className="text-lg font-extrabold text-ink-primary"
                    style={{ fontVariant: ['tabular-nums'] }}
                  >
                    {displayYear(year)}
                  </Text>
                </Pressable>
              ))}
            </View>
          ))}
        </View>
      )}

      <View className="flex-row justify-center gap-3" testID="assist-row">
        <AssistButton
          glyph="💡"
          label={t('round.hints.hint')}
          price={price(HINT_COST)}
          used={hintShown}
          disabled={!canAfford(HINT_COST)}
          onPress={buyHint}
          testID="hint-button"
        />
        <AssistButton
          glyph="🔢"
          label={t('round.hints.fourChoices')}
          price={price(MULTIPLE_CHOICE_COST)}
          used={choices !== null}
          disabled={!canAfford(MULTIPLE_CHOICE_COST)}
          onPress={buyChoices}
          testID="choices-button"
        />
      </View>

      {choices === null && (
        <Button variant="hero" label={t('round.submitGuess')} onPress={onSubmit} testID="submit-button" />
      )}
    </View>
  );
}
