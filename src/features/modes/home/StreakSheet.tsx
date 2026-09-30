import { useEffect } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { Button } from '@/components/ui';
import { activeStreakCount, type StreakState } from '@/domain';
import { haptic, NotificationFeedbackType } from '@/features/haptics';
import { t } from '@/i18n';
import { palette } from '@/theme/tokens';
import { dateKey } from '@/utils/date';

import { streakWeek } from './streakWeek';

interface StreakSheetProps {
  visible: boolean;
  streak: StreakState;
  onPlay: () => void;
  onClose: () => void;
}

const SPARKS = 10;
const SPARK_DISTANCE = 78;

/** One spark flying out of the flame along its own angle, fading as it goes. */
function Spark({ index, burst }: { index: number; burst: SharedValue<number> }) {
  const angle = (index / SPARKS) * Math.PI * 2;
  const style = useAnimatedStyle(() => ({
    opacity: burst.value > 0 && burst.value < 1 ? 1 - burst.value : 0,
    transform: [
      { translateX: Math.cos(angle) * SPARK_DISTANCE * burst.value },
      { translateY: Math.sin(angle) * SPARK_DISTANCE * burst.value },
      { scale: 1 - burst.value * 0.5 },
    ],
  }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute' }, style]}>
      <Text style={{ color: index % 2 ? palette.accent.soft : palette.accent.default, fontSize: 14 }}>
        ✦
      </Text>
    </Animated.View>
  );
}

/** The flame: springs up from small with a wiggle while sparks burst out. */
function FlameBurst() {
  const reducedMotion = useReducedMotion();
  const grow = useSharedValue(reducedMotion ? 1 : 0.3);
  const tilt = useSharedValue(0);
  const burst = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    grow.value = withSpring(1, { damping: 7, stiffness: 160 });
    tilt.value = withDelay(
      120,
      withSequence(
        withTiming(-8, { duration: 90 }),
        withTiming(8, { duration: 120 }),
        withTiming(0, { duration: 120 }),
      ),
    );
    burst.value = withDelay(80, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
    return () => {
      cancelAnimation(grow);
      cancelAnimation(tilt);
      cancelAnimation(burst);
    };
  }, [reducedMotion, grow, tilt, burst]);

  const flameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: grow.value }, { rotate: `${tilt.value}deg` }],
  }));

  return (
    <View className="h-28 items-center justify-center">
      {!reducedMotion &&
        Array.from({ length: SPARKS }, (_, i) => <Spark key={i} index={i} burst={burst} />)}
      <Animated.View style={flameStyle}>
        <Text style={{ fontSize: 72, includeFontPadding: false }}>🔥</Text>
      </Animated.View>
    </View>
  );
}

/**
 * What tapping the home streak chip opens: a flame burst, the streak count,
 * this week's lit days, and what to do next — celebrate if today is played,
 * otherwise a nudge (and a shortcut) to play the Daily and extend it.
 */
export function StreakSheet({ visible, streak, onPlay, onClose }: StreakSheetProps) {
  const now = new Date();
  const today = dateKey(now);
  const count = activeStreakCount(streak, today);
  const doneToday = streak.lastDate === today;
  const week = streakWeek(streak, now);

  useEffect(() => {
    if (visible && count > 0) haptic.notification(NotificationFeedbackType.Success);
  }, [visible, count]);

  const headline = count > 0 ? t('home.streakSheet.headline', { count }) : t('home.streakSheet.start');
  const message = doneToday
    ? t('home.streakSheet.safe')
    : count > 0
      ? t('home.streakSheet.extend', { next: count + 1 })
      : t('home.streakSheet.pitch');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        className="flex-1 justify-end bg-black/60"
        onPress={onClose}
        accessibilityLabel={t('common.close')}
        testID="streak-backdrop"
      >
        {visible && (
          <Pressable
            onPress={() => undefined}
            className="gap-4 border-t-2 bg-bg-raised px-6 pb-10 pt-4"
            style={{ borderColor: palette.accent.default }}
            testID="streak-sheet"
          >
            <FlameBurst />
            <View className="items-center gap-1">
              <Text className="text-3xl font-extrabold text-ink-primary">{headline}</Text>
              <Text className="text-center text-base text-ink-secondary">{message}</Text>
            </View>

            <View className="flex-row justify-between px-2">
              {week.map((day, i) => (
                <View key={i} className="items-center gap-1">
                  <View
                    testID={day.lit ? 'streak-day-lit' : 'streak-day'}
                    className="h-9 w-9 items-center justify-center rounded-full border-2"
                    style={{
                      borderColor: day.lit
                        ? palette.accent.default
                        : day.isToday
                          ? palette.accent.soft
                          : 'rgba(128,128,128,0.35)',
                      backgroundColor: day.lit ? palette.accent.default : 'transparent',
                    }}
                  >
                    {day.lit && <Text style={{ fontSize: 14 }}>🔥</Text>}
                  </View>
                  <Text
                    className={`text-xs font-semibold ${day.isToday ? 'text-accent' : 'text-ink-muted'}`}
                  >
                    {day.label}
                  </Text>
                </View>
              ))}
            </View>

            {streak.freezes > 0 && (
              <Text className="text-center text-sm text-ink-muted">
                {t('home.streakSheet.freezes', { count: streak.freezes })}
              </Text>
            )}

            {!doneToday && (
              <Button label={t('home.streakSheet.play')} onPress={onPlay} testID="streak-play" />
            )}
            <Button
              label={doneToday ? t('home.streakSheet.nice') : t('home.streakSheet.later')}
              variant={doneToday ? 'primary' : 'ghost'}
              onPress={onClose}
              testID="streak-close"
            />
          </Pressable>
        )}
      </Pressable>
    </Modal>
  );
}
