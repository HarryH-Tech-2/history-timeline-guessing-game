import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useProgression } from '@/features/progression';
import { useSaves } from '@/features/save';
import type { DailyRecord } from '../persistence';
import { t } from '@/i18n';
import { palette } from '@/theme/tokens';
import { dateKey } from '@/utils/date';

import { dailyHeroStatus } from './dailyHero';
import { IconPlaque } from './IconPlaque';

/** Re-derive the countdown this often while the card is on screen. */
const TICK_MS = 60_000;

/**
 * The card's call to action while today's Daily is unplayed: a lifted pill
 * that breathes gently so the eye lands on it. The loop is cancelled on
 * unmount — a leaked repeat here would keep Reanimated busy on every screen.
 */
function PlayPill() {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 750, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 750, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(scale);
  }, [scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      style={[
        style,
        {
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 3 },
          elevation: 5,
        },
      ]}
      className="rounded-full bg-accent px-5 py-3"
    >
      <Text className="text-base font-extrabold text-bg-base">{t('home.daily.play')}</Text>
    </Animated.View>
  );
}

/**
 * A copper wax-seal stamp: the "done" mark for today's Daily. Tilted like it
 * was pressed by hand, it replaces the generic checkbox emoji.
 */
function DoneSeal() {
  return (
    <View
      testID="daily-done-seal"
      className="h-12 w-12 items-center justify-center rounded-full border-2"
      style={{
        borderColor: palette.accent.default,
        backgroundColor: `${palette.accent.default}26`,
        transform: [{ rotate: '-10deg' }],
      }}
    >
      <View
        className="h-9 w-9 items-center justify-center rounded-full border border-dashed"
        style={{ borderColor: palette.accent.soft }}
      >
        <Text
          className="text-lg font-extrabold"
          style={{ color: palette.accent.soft, includeFontPadding: false }}
        >
          ✓
        </Text>
      </View>
    </View>
  );
}

/** Today's stored Daily score, or null until it is known / on another day. */
function useTodaysDailyScore(done: boolean, today: string): number | null {
  const { daily } = useSaves();
  const [record, setRecord] = useState<DailyRecord | null>(null);

  useEffect(() => {
    if (!done) return;
    let live = true;
    void daily.read().then((stored) => {
      if (live) setRecord(stored);
    });
    return () => {
      live = false;
    };
  }, [daily, done, today]);

  return done && record?.date === today ? record.totalScore : null;
}

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

  const today = dateKey(now);
  const status = dailyHeroStatus({ streak: state.streak, today, now });
  const todaysScore = useTodaysDailyScore(status.done, today);
  const streakLine =
    status.streak > 0
      ? status.done
        ? t('home.daily.streak', { count: status.streak })
        : t('home.daily.streakKeep', { count: status.streak })
      : null;

  if (status.done) {
    return (
      <Animated.View entering={FadeInUp.springify().damping(18)}>
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={t('home.daily.doneA11y')}
          testID="mode-daily"
          className="flex-row items-center gap-4 overflow-hidden border-2 bg-bg-raised p-4"
          style={{ borderColor: `${palette.accent.default}99` }}
        >
          <DoneSeal />
          <View className="flex-1">
            <Text className="text-xs font-semibold uppercase tracking-wide text-accent">
              {t('home.daily.comeBack')}
            </Text>
            <Text className="text-xl font-extrabold text-ink-primary">{t('home.daily.done')}</Text>
            {todaysScore !== null && (
              <Text
                className="text-sm font-semibold text-ink-secondary"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {t('home.daily.todayScore', { score: todaysScore })}
              </Text>
            )}
            {streakLine !== null && (
              <Text className="text-sm font-bold text-ink-primary">{streakLine}</Text>
            )}
          </View>
          <View className="items-center rounded-full border border-hair bg-bg-overlay px-3 py-1.5">
            <Text className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
              {t('home.daily.nextIn')}
            </Text>
            <Text
              className="text-sm font-extrabold text-ink-primary"
              style={{ fontVariant: ['tabular-nums'] }}
              accessibilityLabel={t('home.daily.nextInA11y', { time: status.nextIn ?? '' })}
            >
              {status.nextIn}
            </Text>
          </View>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInUp.springify().damping(18)}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={t('home.daily.playA11y')}
        testID="mode-daily"
        className="flex-row items-center gap-4 overflow-hidden border-2 border-accent bg-accent/10 p-4"
      >
        <IconPlaque glyph="📅" />
        <View className="flex-1">
          <Text className="text-xl font-extrabold text-ink-primary">{t('home.daily.title')}</Text>
          {streakLine !== null && (
            <Text className="text-sm text-ink-secondary">{streakLine}</Text>
          )}
        </View>
        <PlayPill />
      </Pressable>
    </Animated.View>
  );
}
