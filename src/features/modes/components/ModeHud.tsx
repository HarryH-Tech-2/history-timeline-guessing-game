import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { BackButton } from '@/components/ui';
import type { RoundResult } from '@/domain';
import { useThemeColors } from '@/theme';
import { palette } from '@/theme/tokens';

interface ModeHudProps {
  /** Left-aligned label for open-ended modes, e.g. "Round 5". Fixed-length runs rely on the bar. */
  progressLabel?: string;
  /**
   * Position in a fixed-length run — draws one segment per question under the
   * HUD, colouring the ones already answered by how they went. Omit for
   * open-ended modes.
   */
  progress?: { current: number; total: number; results?: readonly RoundResult[] };
  /** Running score, right-aligned. */
  score?: number;
  /** Remaining lives (Survival) — renders a row of hearts. */
  lives?: number;
  startingLives?: number;
  /** Renders a back affordance that exits the mode. */
  onBack?: () => void;
}

/** Survival lives: full hearts for those left, faded ones for those lost. */
function Hearts({ lives, total }: { lives: number; total: number }) {
  return (
    <View
      className="flex-row items-center gap-0.5"
      accessibilityLabel={`${lives} of ${total} lives left`}
      testID="hud-lives"
    >
      {Array.from({ length: total }, (_, i) => (
        <Text
          key={i}
          className="text-base"
          style={{ opacity: i < lives ? 1 : 0.22, includeFontPadding: false }}
        >
          ❤️
        </Text>
      ))}
    </View>
  );
}

/** Track thickness; the head is a touch larger so it reads as the live edge. */
const BAR_HEIGHT = 6;
const HEAD_SIZE = 12;

/**
 * One continuous progress bar: a copper fill that springs forward as questions
 * are answered, with a softly pulsing head at its leading edge while a run is
 * in play. Position is exposed as a progress value for screen readers.
 */
function ProgressBar({
  current,
  total,
  results,
}: {
  current: number;
  total: number;
  results?: readonly RoundResult[];
}) {
  const colors = useThemeColors();
  const reducedMotion = useReducedMotion();
  const answered = Math.min(results?.length ?? Math.max(current - 1, 0), total);
  const fraction = total > 0 ? answered / total : 0;
  const finished = answered >= total;

  const [trackWidth, setTrackWidth] = useState(0);
  const fill = useSharedValue(fraction);
  const glow = useSharedValue(1);

  useEffect(() => {
    fill.value = reducedMotion
      ? fraction
      : withSpring(fraction, { damping: 16, stiffness: 140, mass: 0.8 });
  }, [fraction, reducedMotion, fill]);

  useEffect(() => {
    // The head's glow is an endless withRepeat, and a running animation
    // outlives its component unless cancelled — quitting a run mid-question
    // would otherwise leave it ticking on the UI thread until app restart.
    const stop = () => cancelAnimation(glow);
    if (reducedMotion || finished) {
      glow.value = 1;
      return stop;
    }
    glow.value = withRepeat(
      withSequence(
        withTiming(0.35, { duration: 800, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
    return stop;
  }, [reducedMotion, finished, glow]);

  const fillStyle = useAnimatedStyle(() => ({ width: fill.value * trackWidth }));
  const headStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
    transform: [{ translateX: fill.value * trackWidth - HEAD_SIZE / 2 }],
  }));

  return (
    <View
      className="w-full justify-center"
      style={{ height: HEAD_SIZE }}
      accessibilityRole="progressbar"
      accessibilityLabel={`Question ${current} of ${total}`}
      accessibilityValue={{ min: 0, max: total, now: answered }}
      testID="hud-progress-bar"
    >
      <View
        className="w-full overflow-hidden rounded-full"
        style={{ height: BAR_HEIGHT, backgroundColor: colors.hair }}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      >
        <Animated.View
          style={[
            { height: BAR_HEIGHT, borderRadius: 999, backgroundColor: palette.accent.default },
            fillStyle,
          ]}
          testID="hud-progress-fill"
        />
      </View>
      {trackWidth > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: 0,
              width: HEAD_SIZE,
              height: HEAD_SIZE,
              borderRadius: HEAD_SIZE / 2,
              backgroundColor: palette.accent.soft,
              borderWidth: 2,
              borderColor: palette.accent.default,
              shadowColor: palette.accent.default,
              shadowOpacity: 0.6,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 0 },
              elevation: 3,
            },
            headStyle,
          ]}
        />
      )}
    </View>
  );
}

/** A slim status bar above the prompt: back on the left, score centred, lives on the right. */
export function ModeHud({
  progressLabel,
  progress,
  score,
  lives,
  startingLives,
  onBack,
}: ModeHudProps) {
  return (
    <View className="gap-2 py-1">
      <View className="min-h-10 flex-row items-center justify-between">
        <View className="w-10">
          {onBack !== undefined && (
            <BackButton onPress={onBack} label="Exit mode" testID="hud-back" />
          )}
        </View>
        {/* The running score is the one number that matters mid-run: big and centred. */}
        <View className="flex-1 items-center">
          {score !== undefined && (
            <Text
              className="text-2xl font-extrabold text-ink-primary"
              style={{ fontVariant: ['tabular-nums'], includeFontPadding: false }}
              accessibilityLabel={`Score ${score}`}
              testID="hud-score"
            >
              {score.toLocaleString()}
            </Text>
          )}
          {progressLabel !== undefined && (
            <Text className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              {progressLabel}
            </Text>
          )}
        </View>
        <View className="min-w-10 items-end">
          {lives !== undefined && startingLives !== undefined && (
            <Hearts lives={lives} total={startingLives} />
          )}
        </View>
      </View>
      {progress !== undefined && (
        <ProgressBar
          current={progress.current}
          total={progress.total}
          results={progress.results}
        />
      )}
    </View>
  );
}
