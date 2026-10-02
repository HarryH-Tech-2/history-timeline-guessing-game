import { memo, useEffect, useMemo } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { DOT_STAGGER_MS, SEQUENCE_DELAY_MS, TRAIL_DOT_SPACING, TRAIL_DOTS } from './constants';
import type { RoadDot } from './trailCurve';

/**
 * The road is a fine polyline of round-ended capsules, one per dot, each
 * running from the midpoint before its dot to the midpoint after it: the
 * round ends make every join a round one, so the bends read as smooth curves.
 * The rim is a separate pass underneath, so the joins never show.
 */
const FAINT_THICK = 7;
const FAINT_RIM = 1.5;
const LIT_THICK = 10;
const LIT_RIM = 2;
/** Neighbouring dots further apart than this straddle a gap (a route banner): no bridge. */
const BREAK = TRAIL_DOT_SPACING * 1.8;
/** How long the beckoning spark takes to run the length of its connector. */
const BECKON_MS = 1400;

const SPARK = 14;

/** One capsule of the road: its centre, length along the road, and heading (degrees). */
export interface Piece {
  x: number;
  y: number;
  length: number;
  angle: number;
}

/**
 * The capsules for a run of dots. Inner ends meet at the midpoints between
 * neighbours; the outer ends (and either side of a gap) reach half a spacing
 * past the dot along its own heading, where the next dot would have been.
 */
export function roadPieces(dots: readonly RoadDot[]): Piece[] {
  const reach = (d: RoadDot, sign: number) => {
    const a = (d.angle * Math.PI) / 180;
    const half = (sign * TRAIL_DOT_SPACING) / 2;
    return { x: d.x + half * Math.cos(a), y: d.y + half * Math.sin(a) };
  };
  const joint = (neighbour: RoadDot | undefined, d: RoadDot, sign: number) =>
    neighbour !== undefined && Math.hypot(neighbour.x - d.x, neighbour.y - d.y) <= BREAK
      ? { x: (neighbour.x + d.x) / 2, y: (neighbour.y + d.y) / 2 }
      : reach(d, sign);
  return dots.map((d, i) => {
    const from = joint(dots[i - 1], d, -1);
    const to = joint(dots[i + 1], d, 1);
    return {
      x: (from.x + to.x) / 2,
      y: (from.y + to.y) / 2,
      length: Math.hypot(to.x - from.x, to.y - from.y),
      angle: (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI,
    };
  });
}

/**
 * A glowing spark running along the road into the next stage to play, over
 * and over — one animated view, however long the road.
 */
function Spark({ dots, colour }: { dots: readonly RoadDot[]; colour: string }) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = 0;
    t.value = withRepeat(
      withSequence(
        withTiming(1, { duration: BECKON_MS, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 500 }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(t);
  }, [t]);

  const points = dots.map((d) => ({ x: d.x, y: d.y }));
  const style = useAnimatedStyle(() => {
    const last = points.length - 1;
    const f = Math.min(1, Math.max(0, t.value)) * last;
    const i = Math.min(last - 1, Math.floor(f));
    const a = points[Math.max(0, i)]!;
    const b = points[Math.max(0, i + 1)] ?? a;
    const k = f - Math.max(0, i);
    // Fade in leaving, fade out arriving.
    const edge = Math.min(t.value, 1 - t.value) * 6;
    return {
      opacity: Math.max(0, Math.min(1, edge)),
      transform: [
        { translateX: a.x + (b.x - a.x) * k - SPARK / 2 },
        { translateY: a.y + (b.y - a.y) * k - SPARK / 2 },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      testID="trail-spark"
      style={[
        style,
        {
          position: 'absolute',
          left: 0,
          top: 0,
          width: SPARK,
          height: SPARK,
          borderRadius: SPARK / 2,
          backgroundColor: '#FFFFFF',
          borderWidth: 3,
          borderColor: colour,
        },
      ]}
    />
  );
}

type Layer = 'outline' | 'fill';

/** Opaque, so overlapping capsules read as one even band. */
const FAINT_FILL = '#FFF8EA';
const FAINT_OUTLINE = '#8F7D63';
const LIT_OUTLINE = '#FFFFFF';

/**
 * A capsule `thick` across plus `rim` all round, a round cap longer at each
 * end than the piece so neighbours join round.
 */
function capsule(length: number, thick: number, rim: number, colour: string) {
  const h = thick + 2 * rim;
  return { width: length + h, height: h, borderRadius: h / 2, backgroundColor: colour };
}

function faint(layer: Layer, length: number) {
  return layer === 'outline'
    ? capsule(length, FAINT_THICK, FAINT_RIM, FAINT_OUTLINE)
    : capsule(length, FAINT_THICK, 0, FAINT_FILL);
}

function lit(layer: Layer, length: number, colour: string) {
  return layer === 'outline'
    ? capsule(length, LIT_THICK, LIT_RIM, LIT_OUTLINE)
    : capsule(length, LIT_THICK, 0, colour);
}

/** A box of `width` × `height` centred on the piece, turned to its heading. */
function placed(piece: Piece, width: number, height: number) {
  return {
    position: 'absolute',
    left: piece.x - width / 2,
    top: piece.y - height / 2,
    width,
    height,
    transform: [{ rotate: `${piece.angle}deg` }],
  } as const;
}

/** A lit capsule fading in over the faint one, `delay` ms into the unlock sequence. */
function LightingPiece({
  layer,
  piece,
  colour,
  delay,
  token,
}: {
  layer: Layer;
  piece: Piece;
  colour: string;
  delay: number;
  token: number;
}) {
  const reducedMotion = useReducedMotion();
  const glow = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) return;
    glow.value = 0;
    glow.value = withDelay(delay, withTiming(1, { duration: 220 }));
    return () => cancelAnimation(glow);
  }, [delay, token, reducedMotion, glow]);

  const style = useAnimatedStyle(() => ({ opacity: glow.value }));
  const under = faint(layer, piece.length);
  const over = lit(layer, piece.length, colour);
  // The lit capsule is the larger one: the box fits it, and both centre in it.
  return (
    <View
      pointerEvents="none"
      style={[placed(piece, over.width, over.height), { alignItems: 'center', justifyContent: 'center' }]}
    >
      <View style={under} />
      <Animated.View
        testID={layer === 'fill' ? 'trail-dot-lit' : undefined}
        style={[style, over, { position: 'absolute', left: 0, top: 0 }]}
      />
    </View>
  );
}

/**
 * One capsule of the road in one layer: the rim (outline pass) or the body
 * (fill pass). Faint parchment until lit, then the era colour with a white
 * rim. A single plain view unless it is lighting up (`lightDelay`, part of
 * the unlock sequence) — a map has hundreds of these, so the resting ones
 * carry no hooks at all.
 */
function TrailPiece({
  layer,
  piece,
  colour,
  isLit,
  lightDelay,
  token,
}: {
  layer: Layer;
  piece: Piece;
  colour: string;
  isLit: boolean;
  lightDelay: number | null;
  token: number;
}) {
  if (isLit && lightDelay !== null) {
    return <LightingPiece layer={layer} piece={piece} colour={colour} delay={lightDelay} token={token} />;
  }
  const look = isLit ? lit(layer, piece.length, colour) : faint(layer, piece.length);
  return (
    <View
      pointerEvents="none"
      testID={isLit && layer === 'fill' ? 'trail-dot-lit' : undefined}
      style={[placed(piece, look.width, look.height), look]}
    />
  );
}

/**
 * Solid road between two points on the map, along the dots the trail layout
 * precomputed on an S-curve. Lit in the era colour once the stage it leaves
 * from is cleared — the road behind the player glows, the road ahead stays
 * faint. The light-up runs over the same time whatever the segment's length.
 * A spark runs along the road into the next stage to play (`beckon`).
 */
export const TrailDots = memo(function TrailDots({
  dots,
  colour,
  lit: isLit,
  lighting,
  token,
  beckon = false,
}: {
  dots: readonly RoadDot[];
  colour: string;
  lit: boolean;
  /** This segment was lit since the last visit: light it piece by piece. */
  lighting: boolean;
  token: number;
  /** Leads into the stage to play next: run a spark along it. */
  beckon?: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const pieces = useMemo(() => roadPieces(dots), [dots]);
  const stagger = dots.length > 1 ? ((TRAIL_DOTS - 1) * DOT_STAGGER_MS) / (dots.length - 1) : 0;
  return (
    <>
      {(['outline', 'fill'] as const).map((layer) =>
        pieces.map((piece, i) => (
          <TrailPiece
            key={`${layer}${i}`}
            layer={layer}
            piece={piece}
            colour={colour}
            isLit={isLit}
            lightDelay={lighting ? SEQUENCE_DELAY_MS + 200 + i * stagger : null}
            token={token}
          />
        )),
      )}
      {beckon && !reducedMotion && dots.length > 1 && <Spark dots={dots} colour={colour} />}
    </>
  );
});
