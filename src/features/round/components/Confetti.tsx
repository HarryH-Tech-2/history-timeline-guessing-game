import { useEffect, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { palette } from '@/theme/tokens';

const COLOURS = [
  palette.accent.default,
  palette.success,
  palette.warning,
  palette.danger,
  palette.accent.soft,
];

interface Piece {
  id: number;
  colour: string;
  angle: number;
  distance: number;
  delay: number;
  size: number;
  spin: number;
}

function makePieces(count: number): Piece[] {
  return Array.from({ length: count }, (_, id) => ({
    id,
    colour: COLOURS[id % COLOURS.length]!,
    angle: (Math.PI * (id / count)) - Math.PI / 2 + (Math.random() - 0.5),
    distance: 120 + Math.random() * 160,
    delay: Math.random() * MAX_DELAY_MS,
    size: 6 + Math.random() * 8,
    spin: (Math.random() - 0.5) * 720,
  }));
}

/** How long one piece flies, and the longest any piece waits before it starts. */
const FLIGHT_MS = 1100;
const MAX_DELAY_MS = 120;

function ConfettiPiece({
  piece,
  originX,
  clock,
}: {
  piece: Piece;
  originX: number;
  /** Milliseconds since the burst began, shared by every piece. */
  clock: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    // Each piece's own delayed ease-out, worked out from the one clock.
    const linear = Math.min(1, Math.max(0, (clock.value - piece.delay) / FLIGHT_MS));
    const p = 1 - Math.pow(1 - linear, 3);
    const dx = Math.cos(piece.angle) * piece.distance * p;
    const dy = Math.sin(piece.angle) * piece.distance * p + 260 * p * p; // gravity
    return {
      opacity: 1 - p,
      transform: [
        { translateX: dx },
        { translateY: dy },
        { rotate: `${piece.spin * p}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: originX,
          top: 0,
          width: piece.size,
          height: piece.size * 0.6,
          borderRadius: 2,
          backgroundColor: piece.colour,
        },
        style,
      ]}
    />
  );
}

interface ConfettiProps {
  /** Skip rendering when the user prefers reduced motion. */
  reducedMotion?: boolean;
  count?: number;
}

/** A one-shot celebratory burst from the top-centre. Pure Reanimated, no
 * native dependency, so it runs in Expo Go on both platforms. One animation
 * drives every piece, rather than a timer each. */
export function Confetti({ reducedMotion = false, count = 28 }: ConfettiProps) {
  const { width } = useWindowDimensions();
  const pieces = useMemo(() => makePieces(count), [count]);
  const clock = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    const total = FLIGHT_MS + MAX_DELAY_MS;
    clock.value = withTiming(total, { duration: total, easing: Easing.linear });
    return () => cancelAnimation(clock);
  }, [clock, reducedMotion]);

  if (reducedMotion) return null;

  return (
    <Animated.View pointerEvents="none" className="absolute inset-0 items-center">
      {pieces.map((piece) => (
        <ConfettiPiece key={piece.id} piece={piece} originX={width / 2} clock={clock} />
      ))}
    </Animated.View>
  );
}
