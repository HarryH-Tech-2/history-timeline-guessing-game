import { ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button, Card, Screen } from '@/components/ui';
import { useThemeColors } from '@/theme';
import { palette } from '@/theme/tokens';

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

/** The end-of-run panel shared by every mode: score, optional stars, breakdown. */
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
    <Screen className="justify-center px-5">
      <Animated.View entering={FadeInDown.springify().damping(18)}>
        <Card className="gap-5">
          <View className="items-center gap-1">
            <Text className="text-sm font-medium uppercase tracking-wide text-ink-muted">
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
            <ScrollView className="max-h-52" showsVerticalScrollIndicator={false}>
              <View className="gap-2">
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
                      +{r.score}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
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
    </Screen>
  );
}
