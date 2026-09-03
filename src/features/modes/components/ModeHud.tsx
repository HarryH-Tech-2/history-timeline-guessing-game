import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { RoundResult } from '@/domain';
import { isRightAnswer } from '@/features/timeline/math';
import { useThemeColors } from '@/theme';
import { palette } from '@/theme/tokens';

interface ModeHudProps {
  /** Left-aligned progress label, e.g. "Question 3 of 8" or "Round 5". */
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
  /** The global hearts meter (modes that spend hearts). */
  hearts?: { count: number; unlimited: boolean };
  /** Renders a back affordance that exits the mode. */
  onBack?: () => void;
}

function HeartsMeter({ count, unlimited }: { count: number; unlimited: boolean }) {
  return (
    <View
      className="flex-row items-center gap-1 border border-hair bg-bg-raised px-2 py-0.5"
      accessibilityLabel={unlimited ? 'Unlimited hearts' : `${count} hearts`}
      testID="hud-hearts"
    >
      <Text className="text-sm">❤️</Text>
      <Text className="text-sm font-bold text-ink-primary">{unlimited ? '∞' : count}</Text>
    </View>
  );
}

function Hearts({ lives, total }: { lives: number; total: number }) {
  const colors = useThemeColors();
  return (
    <View className="flex-row items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          className="h-2.5 w-2.5 rounded-full"
          style={{
            backgroundColor: i < lives ? colors.danger : colors.hair,
          }}
        />
      ))}
    </View>
  );
}

/** How an answered segment is coloured. */
export type SegmentTier = 'perfect' | 'hit' | 'miss';

export function segmentTier(result: RoundResult): SegmentTier {
  if (result.isPerfect) return 'perfect';
  return isRightAnswer(result.errorYears) ? 'hit' : 'miss';
}

type SegmentState = SegmentTier | 'current' | 'upcoming';

/** One notch of the progress bar. Answered notches pop in; the live one breathes. */
function Segment({ state, reducedMotion }: { state: SegmentState; reducedMotion: boolean }) {
  const colors = useThemeColors();
  const pop = useSharedValue(reducedMotion || state === 'upcoming' ? 1 : 0.6);
  const glow = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) {
      pop.value = 1;
      glow.value = 1;
      return;
    }
    pop.value = withSpring(1, { damping: 10, stiffness: 220, mass: 0.6 });
    if (state === 'current') {
      glow.value = withRepeat(
        withSequence(
          withTiming(0.45, { duration: 700, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        true,
      );
    } else {
      glow.value = withTiming(1, { duration: 150 });
    }
  }, [state, reducedMotion, pop, glow]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
    transform: [{ scaleY: pop.value }],
  }));

  const fill: Record<SegmentState, string> = {
    perfect: palette.warning, // gold for an exact year
    hit: palette.success,
    miss: colors.ink.muted,
    current: palette.accent.default,
    upcoming: colors.hair,
  };

  return (
    <View
      className="h-2 flex-1 overflow-hidden rounded-full"
      style={{ backgroundColor: colors.hair }}
      testID={`hud-segment-${state}`}
    >
      <Animated.View
        style={[
          { flex: 1, borderRadius: 999, backgroundColor: fill[state] },
          // Only the current notch shows a raised lip, so it reads as "live".
          state === 'current' && { borderWidth: 1, borderColor: palette.accent.soft },
          animatedStyle,
        ]}
      />
    </View>
  );
}

/**
 * Segmented progress: one notch per question. Answered notches are coloured
 * gold (exact), green (within the right-answer window) or muted (a miss); the
 * question in play pulses copper; the rest wait as hairline slots.
 */
function ProgressBar({
  current,
  total,
  results = [],
}: {
  current: number;
  total: number;
  results?: readonly RoundResult[];
}) {
  const reducedMotion = useReducedMotion();
  const segments: SegmentState[] = Array.from({ length: Math.max(total, 0) }, (_, i) => {
    const result = results[i];
    if (result !== undefined) return segmentTier(result);
    return i === current - 1 ? 'current' : 'upcoming';
  });

  return (
    <View
      className="w-full flex-row items-center gap-1"
      accessibilityLabel={`Question ${current} of ${total}`}
      testID="hud-progress-bar"
    >
      {segments.map((state, i) => (
        <Segment key={i} state={state} reducedMotion={reducedMotion} />
      ))}
    </View>
  );
}

/** A slim status bar above the prompt: progress on the left, lives/score on the right. */
export function ModeHud({
  progressLabel,
  progress,
  score,
  lives,
  startingLives,
  hearts,
  onBack,
}: ModeHudProps) {
  return (
    <View className="gap-2 py-1">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          {onBack !== undefined && (
            <Pressable
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel="Exit mode"
              hitSlop={10}
              testID="hud-back"
              className="h-10 w-10 items-center justify-center border border-hair bg-bg-raised"
            >
              {/* A drawn chevron (rotated bordered square) renders crisply at any
                  font scale, unlike a text glyph. Nudged right so it reads centred. */}
              <View
                className="h-3 w-3 border-b-2 border-l-2 border-ink-primary"
                style={{ transform: [{ rotate: '45deg' }], marginLeft: 3 }}
              />
            </Pressable>
          )}
          <Text className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {progressLabel ?? ''}
          </Text>
        </View>
        <View className="flex-row items-center gap-3">
          {hearts !== undefined && (
            <HeartsMeter count={hearts.count} unlimited={hearts.unlimited} />
          )}
          {lives !== undefined && startingLives !== undefined && (
            <Hearts lives={lives} total={startingLives} />
          )}
          {score !== undefined && (
            <Text className="text-sm font-bold text-ink-primary">{score.toLocaleString()}</Text>
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
