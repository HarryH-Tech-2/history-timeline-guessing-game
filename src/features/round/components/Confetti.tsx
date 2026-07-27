import { useEffect, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
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
    delay: Math.random() * 120,
    size: 6 + Math.random() * 8,
    spin: (Math.random() - 0.5) * 720,
  }));
}

function ConfettiPiece({ piece, originX }: { piece: Piece; originX: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      piece.delay,
      withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }),
    );
  }, [piece.delay, progress]);

  const style = useAnimatedStyle(() => {
    const p = progress.value;
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
 * native dependency, so it runs in Expo Go on both platforms. */
export function Confetti({ reducedMotion = false, count = 28 }: ConfettiProps) {
  const { width } = useWindowDimensions();
  const pieces = useMemo(() => makePieces(count), [count]);

  if (reducedMotion) return null;

  return (
    <Animated.View pointerEvents="none" className="absolute inset-0 items-center">
      {pieces.map((piece) => (
        <ConfettiPiece key={piece.id} piece={piece} originX={width / 2} />
      ))}
    </Animated.View>
  );
}
