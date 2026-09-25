import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { useProgression } from '@/features/progression';
import { dateKey } from '@/utils/date';

import { dailyHeroStatus } from './dailyHero';
import { IconPlaque } from './IconPlaque';

/** Re-derive the countdown this often while the card is on screen. */
const TICK_MS = 60_000;

/**
 * The Daily as the first thing on the home hub. It is the habit loop of the
 * game, and the numbers said almost nobody found it below the fold: one card
 * with a clear state — play now, streak on the line, or done with a countdown.
 */
export function DailyHeroCard({ onPress }: { onPress: () => void }) {
  const { state } = useProgression();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const status = dailyHeroStatus({ streak: state.streak, today: dateKey(now), now });
  const streakLine =
    status.streak > 0
      ? status.done
        ? `🔥 ${status.streak}-day streak`
        : `🔥 ${status.streak}-day streak — play today to keep it`
      : null;

  return (
    <Animated.View entering={FadeInUp.springify().damping(18)}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={status.done ? 'Daily done, see your result' : "Play today's Daily"}
        testID="mode-daily"
        className={`flex-row items-center gap-4 overflow-hidden border-2 p-4 ${
          status.done ? 'border-hair bg-bg-raised' : 'border-accent bg-accent/10'
        }`}
      >
        <IconPlaque glyph={status.done ? '✅' : '📅'} />
        <View className="flex-1">
          <Text className="text-xs font-semibold uppercase tracking-wide text-accent">
            {status.done ? 'Come back tomorrow' : 'Eight questions · one shot a day'}
          </Text>
          <Text className="text-xl font-extrabold text-ink-primary">
            {status.done ? 'Daily done' : "Today's Daily"}
          </Text>
          {streakLine !== null && (
            <Text className="text-sm text-ink-secondary">{streakLine}</Text>
          )}
          {status.done && (
            <Text className="text-sm text-ink-muted">Next Daily in {status.hoursUntilNext}h</Text>
          )}
        </View>
        {status.done ? (
          <Text className="text-xl text-ink-muted">›</Text>
        ) : (
          <View className="border border-accent bg-accent px-4 py-2">
            <Text className="text-sm font-bold uppercase tracking-wide text-bg-base">Play</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}
