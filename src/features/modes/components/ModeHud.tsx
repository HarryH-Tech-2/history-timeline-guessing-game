import { Pressable, Text, View } from 'react-native';

import { useThemeColors } from '@/theme';

interface ModeHudProps {
  /** Left-aligned progress label, e.g. "Question 3 of 8" or "Round 5". */
  progressLabel?: string;
  /**
   * Position in a fixed-length run — draws a thin fill bar under the HUD so
   * the distance to the end reads at a glance. Omit for open-ended modes.
   */
  progress?: { current: number; total: number };
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

/** Thin track/fill pair showing how far through a fixed-length run we are. */
function ProgressBar({ current, total }: { current: number; total: number }) {
  const fraction = total > 0 ? Math.min(1, Math.max(0, current / total)) : 0;
  return (
    <View
      className="h-1 w-full overflow-hidden bg-bg-overlay"
      accessibilityLabel={`Question ${current} of ${total}`}
      testID="hud-progress-bar"
    >
      <View className="h-full bg-accent" style={{ width: `${fraction * 100}%` }} />
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
        <ProgressBar current={progress.current} total={progress.total} />
      )}
    </View>
  );
}
