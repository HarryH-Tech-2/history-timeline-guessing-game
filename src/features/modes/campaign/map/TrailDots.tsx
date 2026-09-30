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

import { DOT_STAGGER_MS, SEQUENCE_DELAY_MS, TRAIL_DOT_SPACING, TRAIL_DOTS } from './constants';
import type { RoadDot } from './trailCurve';

/**
 * The road is drawn as a run of capsules along its heading, each longer than
 * the dot spacing so neighbours overlap into one solid line. The rim is a
 * separate pass underneath, so the joins between capsules never show.
 */
const DASH_LEN = TRAIL_DOT_SPACING + 12;
const FAINT_THICK = 7;
const FAINT_RIM = 1.5;
const LIT_THICK = 10;
const LIT_RIM = 2;
/** Each capsule's box, centred on its point on the road: roomy enough for any rotation. */
const BOX = DASH_LEN + 2 * LIT_RIM + 4;
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

/** One capsule of the road, `rim` wider all round when drawn as the outline pass. */
function capsule(thick: number, rim: number, colour: string) {
  const h = thick + 2 * rim;
  return {
    position: 'absolute',
    width: DASH_LEN + 2 * rim,
    height: h,
    borderRadius: h / 2,
    backgroundColor: colour,
  } as const;
}

/** Opaque, so overlapping capsules read as one even band. */
const FAINT_FILL = capsule(FAINT_THICK, 0, '#FFF8EA');
const FAINT_OUTLINE = capsule(FAINT_THICK, FAINT_RIM, '#8F7D63');
const LIT_OUTLINE = capsule(LIT_THICK, LIT_RIM, '#FFFFFF');
const litFill = (colour: string) => capsule(LIT_THICK, 0, colour);

type Layer = 'outline' | 'fill';

/** A lit capsule fading in over the faint one, `delay` ms into the unlock sequence. */
function LightingDash({
  layer,
  colour,
  delay,
  token,
}: {
  layer: Layer;
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
  return layer === 'outline' ? (
    <>
      <View style={FAINT_OUTLINE} />
      <Animated.View style={[style, LIT_OUTLINE]} />
    </>
  ) : (
    <>
      <View style={FAINT_FILL} />
      <Animated.View testID="trail-dot-lit" style={[style, litFill(colour)]} />
    </>
  );
}

/**
 * One capsule of the road, turned to follow the curve, in one layer: the rim
 * (outline pass) or the body (fill pass). Faint parchment until lit, then the
 * era colour with a white rim. Plain views unless it is lighting up
 * (`lightDelay`, part of the unlock sequence) — a map has hundreds of these,
 * so the resting ones carry no hooks at all.
 */
function TrailDot({
  layer,
  dot,
  colour,
  lit,
  lightDelay,
  token,
}: {
  layer: Layer;
  dot: RoadDot;
  colour: string;
  lit: boolean;
  lightDelay: number | null;
  token: number;
}) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: dot.x - BOX / 2,
        top: dot.y - BOX / 2,
        width: BOX,
        height: BOX,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ rotate: `${dot.angle}deg` }],
      }}
    >
      {!lit ? (
        <View style={layer === 'outline' ? FAINT_OUTLINE : FAINT_FILL} />
      ) : lightDelay !== null ? (
        <LightingDash layer={layer} colour={colour} delay={lightDelay} token={token} />
      ) : layer === 'outline' ? (
        <View style={LIT_OUTLINE} />
      ) : (
        <View testID="trail-dot-lit" style={litFill(colour)} />
      )}
    </View>
  );
}

/**
 * Solid road between two points on the map, its capsules precomputed along an
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
      {(['outline', 'fill'] as const).map((layer) =>
        dots.map((dot, i) => (
          <TrailDot
            key={`${layer}${i}`}
            layer={layer}
            dot={dot}
            colour={colour}
            lit={lit}
            lightDelay={lighting ? SEQUENCE_DELAY_MS + 200 + i * stagger : null}
            token={token}
          />
        )),
      )}
      {beckon && !reducedMotion && dots.length > 1 && <Spark dots={dots} colour={colour} />}
    </>
  );
});
