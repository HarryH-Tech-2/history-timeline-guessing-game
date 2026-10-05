import { useEffect } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button, Card, Screen } from '@/components/ui';
import { anyTrialDays } from '@/features/premium/paywallCopy';
import { trialCtaText } from '@/features/premium/paywallPricing';
import { usePremium } from '@/features/premium/PremiumProvider';
import type { SampleTarget } from '@/features/premium/sample';
import { formatNumber, t } from '@/i18n';
import { track } from '@/services/analytics';

import { Mascot } from './Mascot';
import { mascotLine, type SummaryRow } from './RunSummary';

interface SampleOverProps {
  target: SampleTarget;
  /** What was tasted: "Endless", or the category's name. */
  name: string;
  score: number;
  /** The taster's rounds, in order. */
  rounds: readonly SummaryRow[];
  /** How many questions Premium opens here; absent for Endless, which never ends. */
  total?: number;
  /** One line on what Premium adds to what they just played. */
  body: string;
  /** The paywall, tagged with what they were playing. */
  paywall: Href;
  onLeave: () => void;
}

/** Timeline ticks after the played ones, thinning out: the run carrying on without the player. */
const AHEAD_OPACITY = [0.6, 0.48, 0.38, 0.3, 0.23, 0.17, 0.12, 0.08, 0.05] as const;

/**
 * How far the taster went against how far Premium goes, drawn as the game's
 * own timeline: a tall tick per round played, then shorter ticks fading on
 * towards the full count (or ∞ for Endless).
 */
function TasterTrack({ played, total }: { played: number; total?: number }) {
  const end = total === undefined ? '∞' : formatNumber(total);
  return (
    <View className="gap-1.5" testID="sample-track">
      <View className="flex-row items-end">
        <View className="flex-1 flex-row items-end justify-between border-b border-accent/40 pr-3">
          {Array.from({ length: played }, (_, i) => (
            <View key={i} className="h-6 w-1 bg-accent" />
          ))}
          {AHEAD_OPACITY.map((opacity) => (
            <View key={opacity} className="h-3 w-0.5 bg-accent" style={{ opacity }} />
          ))}
        </View>
        <Text
          className="pl-2 text-2xl font-extrabold text-accent"
          style={{ includeFontPadding: false, lineHeight: 26 }}
        >
          {end}
        </Text>
      </View>
      <View className="flex-row justify-between">
        <Text className="text-xs text-ink-muted">{t('modes.sample.played', { count: played })}</Text>
        <Text className="text-xs font-semibold text-ink-secondary">
          {t('modes.sample.withPremium', { total: end })}
        </Text>
      </View>
    </View>
  );
}

/**
 * The end of a free taster, shaped like any other end-of-run screen: the owl,
 * the score and each round, then how much further Premium goes and the
 * paywall one tap away. Leads with the free trial when the store offers one.
 */
export function SampleOver({ target, name, score, rounds, total, body, paywall, onLeave }: SampleOverProps) {
  const router = useRouter();
  const { trialDays, priceLabels } = usePremium();
  const trial = anyTrialDays(trialDays);

  useEffect(() => {
    track('sample_completed', { target, score });
  }, [target, score]);

  return (
    <Screen>
      <ScrollView
        contentContainerClassName="flex-grow justify-center px-5 py-4"
        showsVerticalScrollIndicator={false}
      >
        <Mascot line={mascotLine(undefined, rounds)} height={96} />

        <Animated.View entering={FadeInDown.springify().damping(18)}>
          <Card className="gap-4" testID="sample-over">
            <View className="items-center gap-1">
              <Text className="text-center text-sm font-medium uppercase tracking-wide text-ink-muted">
                {t('modes.sample.overTitle', { name })}
              </Text>
              <Text className="text-5xl font-extrabold text-accent" testID="sample-score">
                {formatNumber(score)}
              </Text>
              <Text className="text-xs text-ink-muted">{t('round.summary.totalPoints')}</Text>
            </View>

            <View className="gap-3 border border-accent/60 bg-accent/10 p-4">
              <TasterTrack played={rounds.length} total={total} />
              <Text className="text-sm text-ink-primary">{body}</Text>
            </View>

            <View className="gap-2" testID="sample-rounds">
              {rounds.map((r) => (
                <View
                  key={r.key}
                  className="flex-row items-center justify-between border-t border-hair pt-2"
                >
                  <View className="flex-1 pr-3">
                    <Text className="text-sm text-ink-primary" numberOfLines={1}>
                      {r.label}
                    </Text>
                    {r.detail !== undefined && <Text className="text-xs text-ink-muted">{r.detail}</Text>}
                  </View>
                  <Text className="text-sm font-bold text-accent">+{formatNumber(r.score)}</Text>
                </View>
              ))}
            </View>

            <View className="gap-3">
              <Button
                label={trial ? trialCtaText(trial) : t('modes.sample.keepPlaying', { name })}
                glyph="→"
                variant="hero"
                onPress={() => router.push(paywall)}
                testID="sample-premium"
              />
              <Text className="text-center text-xs text-ink-muted" testID="sample-price">
                {trial
                  ? t('paywall.cta.thenPrice', { price: priceLabels.monthly })
                  : t('profile.premium.fromPrice', { price: priceLabels.monthly })}
              </Text>
              <Pressable
                onPress={onLeave}
                accessibilityRole="button"
                hitSlop={10}
                className="items-center py-1"
                testID="sample-leave"
              >
                <Text className="text-sm font-semibold text-ink-muted underline">{t('modes.run.home')}</Text>
              </Pressable>
            </View>
          </Card>
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}
