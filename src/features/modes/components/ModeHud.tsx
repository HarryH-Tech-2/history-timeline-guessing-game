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
    <View className="flex-row items-center justify-between py-1">
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
