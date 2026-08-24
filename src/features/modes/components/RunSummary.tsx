import { ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button, Card, Screen } from '@/components/ui';
import { formatYear } from '@/features/timeline/math';
import { useThemeColors } from '@/theme';
import { palette } from '@/theme/tokens';

import { Mascot } from './Mascot';

export interface SummaryRow {
  key: string;
  label: string;
  score: number;
  detail?: string;
}

interface StatLine {
  label: string;
  value: string;
}

interface RunSummaryProps {
  title: string;
  subtitle?: string;
  totalScore: number;
  /** Optional star rating (Campaign), 0–3. */
  stars?: number;
  /** Headline stats such as best score or rounds survived. */
  stats?: readonly StatLine[];
  /** Per-round breakdown. */
  rounds?: readonly SummaryRow[];
  accent?: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

/**
 * The per-round detail line for a summary row. Names the guess so the miss
 * can be sanity-checked, and calls an exact hit what it is rather than "0 yrs off".
 */
export function roundDetail(errorYears: number, guessYear?: number): string {
  if (errorYears === 0) return 'Exact year';
  const off = `${errorYears.toLocaleString()} ${errorYears === 1 ? 'yr' : 'yrs'} off`;
  return guessYear === undefined ? off : `Guessed ${formatYear(guessYear)} · ${off}`;
}

/** What the owl says, from the star rating or the average round score. */
export function mascotLine(stars: number | undefined, rounds: readonly SummaryRow[] | undefined): string {
  let tier: number;
  if (stars !== undefined) {
    tier = stars;
  } else if (rounds !== undefined && rounds.length > 0) {
    const avg = rounds.reduce((sum, r) => sum + r.score, 0) / rounds.length;
    tier = avg >= 800 ? 3 : avg >= 550 ? 2 : 1;
  } else {
    tier = 0;
  }
  switch (tier) {
    case 3:
      return 'Splendid! Herodotus himself would be impressed.';
    case 2:
      return 'Well played, scholar. The archives approve.';
    case 1:
      return 'Every historian starts somewhere. Onward!';
    default:
      return 'The past awaits. Shall we go again?';
  }
}

function Stars({ count, colour }: { count: number; colour: string }) {
  const colors = useThemeColors();
  return (
    <View className="flex-row items-center justify-center gap-2">
      {[0, 1, 2].map((i) => (
        <Text
          key={i}
          className="text-3xl"
          style={{ color: i < count ? colour : colors.hair }}
        >
          ★
        </Text>
      ))}
    </View>
  );
}

/** The end-of-run panel shared by every mode: mascot, score, optional stars,
 * and the full per-round breakdown (never clipped — the page scrolls). */
export function RunSummary({
  title,
  subtitle,
  totalScore,
  stars,
  stats,
  rounds,
  accent = palette.accent.default,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: RunSummaryProps) {
  return (
    <Screen>
      <ScrollView
        contentContainerClassName="flex-grow justify-center px-5 py-6"
        showsVerticalScrollIndicator={false}
      >
        <Mascot line={mascotLine(stars, rounds)} />

        <Animated.View entering={FadeInDown.springify().damping(18)}>
          <Card className="gap-5">
            <View className="items-center gap-1">
              <Text className="text-center text-sm font-medium uppercase tracking-wide text-ink-muted">
                {title}
              </Text>
              {subtitle !== undefined && (
                <Text className="text-center text-sm text-ink-secondary">{subtitle}</Text>
              )}
              <Text className="text-5xl font-extrabold" style={{ color: accent }}>
                {totalScore.toLocaleString()}
              </Text>
              <Text className="text-xs text-ink-muted">total points</Text>
            </View>

            {stars !== undefined && <Stars count={stars} colour={accent} />}

            {stats !== undefined && stats.length > 0 && (
              <View className="gap-2">
                {stats.map((s) => (
                  <View key={s.label} className="flex-row justify-between">
                    <Text className="text-sm text-ink-secondary">{s.label}</Text>
                    <Text className="text-sm font-semibold text-ink-primary">{s.value}</Text>
                  </View>
                ))}
              </View>
            )}

            {rounds !== undefined && rounds.length > 0 && (
              <View className="gap-2" testID="summary-rounds">
                {rounds.map((r) => (
                  <View
                    key={r.key}
                    className="flex-row items-center justify-between border-t border-hair pt-2"
                  >
                    <View className="flex-1 pr-3">
                      <Text className="text-sm text-ink-primary" numberOfLines={1}>
                        {r.label}
                      </Text>
                      {r.detail !== undefined && (
                        <Text className="text-xs text-ink-muted">{r.detail}</Text>
                      )}
                    </View>
                    <Text className="text-sm font-bold" style={{ color: accent }}>
                      +{r.score.toLocaleString()}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View className="gap-3">
              <Button label={primaryLabel} onPress={onPrimary} testID="summary-primary" />
              {secondaryLabel !== undefined && onSecondary !== undefined && (
                <Button
                  label={secondaryLabel}
                  onPress={onSecondary}
                  variant="ghost"
                  testID="summary-secondary"
                />
              )}
            </View>
          </Card>
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}
