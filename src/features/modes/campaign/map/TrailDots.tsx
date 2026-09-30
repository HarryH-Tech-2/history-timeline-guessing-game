import { memo, useEffect } from 'react';
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

import { DOT_STAGGER_MS, SEQUENCE_DELAY_MS, TRAIL_DOTS } from './constants';
import type { RoadDot } from './trailCurve';

/**
 * A road dash is a capsule along the road's heading: short enough that the
 * faint ones leave gaps at the dot spacing, while lit ones nearly touch and
 * read as a glowing band.
 */
const DASH_W = 13;
const DASH_H = 8;
const LIT_W = 17;
const LIT_H = 12;
/** Each dash's box, centred on its point on the road. */
const BOX = 24;
/** How long the beckoning spark takes to run the length of its connector. */
const BECKON_MS = 1400;

const SPARK = 14;

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

const FAINT_DASH = {
  width: DASH_W,
  height: DASH_H,
  borderRadius: DASH_H / 2,
  backgroundColor: 'rgba(255,250,238,0.85)',
  borderWidth: 1,
  borderColor: 'rgba(29,23,18,0.3)',
} as const;

function litDash(colour: string) {
  return {
    position: 'absolute',
    width: LIT_W,
    height: LIT_H,
    borderRadius: LIT_H / 2,
    backgroundColor: colour,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  } as const;
}

/** A lit dash fading in over the faint one, `delay` ms into the unlock sequence. */
function LightingDash({ colour, delay, token }: { colour: string; delay: number; token: number }) {
  const reducedMotion = useReducedMotion();
  const glow = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) return;
    glow.value = 0;
    glow.value = withDelay(delay, withTiming(1, { duration: 220 }));
    return () => cancelAnimation(glow);
  }, [delay, token, reducedMotion, glow]);

  const style = useAnimatedStyle(() => ({ opacity: glow.value }));
  return (
    <>
      <View style={FAINT_DASH} />
      <Animated.View testID="trail-dot-lit" style={[style, litDash(colour)]} />
    </>
  );
}

/**
 * One dash of the road, turned to follow the curve: a faint parchment dash,
 * or once lit an era-coloured one with a white rim. Plain views unless it is
 * lighting up (`lightDelay`, part of the unlock sequence) — a map has
 * hundreds of these, so the resting ones carry no hooks at all.
 */
function TrailDot({
  dot,
  colour,
  lit,
  lightDelay,
  token,
}: {
  dot: RoadDot;
  colour: string;
  lit: boolean;
  lightDelay: number | null;
  token: number;
}) {
  return (
    <View
      style={{
        width: BOX,
        height: BOX,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ rotate: `${dot.angle}deg` }],
      }}
    >
      {!lit ? (
        <View style={FAINT_DASH} />
      ) : lightDelay !== null ? (
        <LightingDash colour={colour} delay={lightDelay} token={token} />
      ) : (
        <View testID="trail-dot-lit" style={litDash(colour)} />
      )}
    </View>
  );
}

/**
 * Dotted road between two points on the map, its dashes precomputed along an
 * S-curve by the trail layout. Lit in the era colour once the stage it leaves
 * from is cleared — the road behind the player glows, the road ahead stays
 * faint. The light-up runs over the same time whatever the segment's length.
 * A spark runs along the road into the next stage to play (`beckon`).
 */
export const TrailDots = memo(function TrailDots({
  dots,
  colour,
  lit,
  lighting,
  token,
  beckon = false,
}: {
  dots: readonly RoadDot[];
  colour: string;
  lit: boolean;
  /** This segment was lit since the last visit: light it dot by dot. */
  lighting: boolean;
  token: number;
  /** Leads into the stage to play next: run a spark along it. */
  beckon?: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const stagger = dots.length > 1 ? ((TRAIL_DOTS - 1) * DOT_STAGGER_MS) / (dots.length - 1) : 0;
  return (
    <>
      {dots.map((dot, i) => (
        <View
          key={i}
          pointerEvents="none"
          style={{ position: 'absolute', left: dot.x - BOX / 2, top: dot.y - BOX / 2 }}
        >
          <TrailDot
            dot={dot}
            colour={colour}
            lit={lit}
            lightDelay={lighting ? SEQUENCE_DELAY_MS + 200 + i * stagger : null}
            token={token}
          />
        </View>
      ))}
      {beckon && !reducedMotion && dots.length > 1 && <Spark dots={dots} colour={colour} />}
    </>
  );
});
