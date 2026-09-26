import { Pressable, View } from 'react-native';

import { cn } from '@/utils/cn';

type BackButtonVariant = 'back' | 'close';

interface BackButtonProps {
  onPress: () => void;
  /** `back` draws a chevron (default); `close` draws an ✕ for modal-style screens. */
  variant?: BackButtonVariant;
  /** Screen-reader label; defaults to "Back" / "Close" by variant. */
  label?: string;
  className?: string;
  testID?: string;
}

/**
 * The one back/close affordance used across the app: a small raised circle
 * with a drawn glyph. Glyphs are drawn from bordered views rather than text so
 * they stay crisp at any font scale and never shift baseline with the font.
 */
export function BackButton({
  onPress,
  variant = 'back',
  label,
  className,
  testID,
}: BackButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label ?? (variant === 'close' ? 'Close' : 'Back')}
      hitSlop={10}
      testID={testID}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
      className={cn(
        'h-10 w-10 items-center justify-center rounded-full border border-hair bg-bg-raised',
        className,
      )}
    >
      {variant === 'back' ? (
        // A rotated square showing two edges: a chevron, nudged right to sit centred.
        <View
          className="h-3 w-3 border-b-2 border-l-2 border-ink-primary"
          style={{ transform: [{ rotate: '45deg' }], marginLeft: 3 }}
        />
      ) : (
        <View className="h-4 w-4 items-center justify-center">
          <View
            className="absolute h-0.5 w-4 rounded-full bg-ink-primary"
            style={{ transform: [{ rotate: '45deg' }] }}
          />
          <View
            className="absolute h-0.5 w-4 rounded-full bg-ink-primary"
            style={{ transform: [{ rotate: '-45deg' }] }}
          />
        </View>
      )}
    </Pressable>
  );
}
