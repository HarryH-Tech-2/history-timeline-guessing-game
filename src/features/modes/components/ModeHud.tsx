import { Pressable, Text, View } from 'react-native';

import { useThemeColors } from '@/theme';

interface ModeHudProps {
  /** Left-aligned progress label, e.g. "Question 3 of 8" or "Round 5". */
  progressLabel?: string;
  /** Running score, right-aligned. */
  score?: number;
  /** Remaining lives (Survival) — renders a row of hearts. */
  lives?: number;
  startingLives?: number;
  /** Renders a back affordance that exits the mode. */
  onBack?: () => void;
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

/** A slim status bar above the prompt: progress on the left, lives/score on the right. */
export function ModeHud({ progressLabel, score, lives, startingLives, onBack }: ModeHudProps) {
  return (
    <View className="mb-3 flex-row items-center justify-between px-1">
      <View className="flex-row items-center gap-2">
        {onBack !== undefined && (
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Exit mode"
            hitSlop={12}
            testID="hud-back"
          >
            <Text className="text-lg text-ink-muted">‹</Text>
          </Pressable>
        )}
        <Text className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          {progressLabel ?? ''}
        </Text>
      </View>
      <View className="flex-row items-center gap-3">
        {lives !== undefined && startingLives !== undefined && (
          <Hearts lives={lives} total={startingLives} />
        )}
        {score !== undefined && (
          <Text className="text-sm font-bold text-ink-primary">{score.toLocaleString()}</Text>
        )}
      </View>
    </View>
  );
}
