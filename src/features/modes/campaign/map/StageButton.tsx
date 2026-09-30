import { useEffect } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { CampaignStage } from '../campaignMap';
import {
  DOT_STAGGER_MS,
  FRONTIER_NODE,
  LIP,
  NODE,
  SEQUENCE_DELAY_MS,
  TRAIL_DOTS,
} from './constants';
import { inkOn, nodeState, shade, type NodeState } from './mapVisuals';
import { StartBubble } from './StartBubble';

/** Minerva, the game's owl scholar, keeps watch beside the frontier. */
const OWL = require('../../../../../assets/mascot/owl.webp');
const OWL_HEIGHT = 64;
/** The source art is 601×640. */
const OWL_WIDTH = Math.round(OWL_HEIGHT * (601 / 640));

const GOLD = '#F5C542';
const LOCKED_FACE = '#D6D2CA';
const LOCKED_LIP = '#A29C91';

/** Face colour, lip colour and glyph for each button state. */
function faceOf(
  state: NodeState,
  colour: string,
  stage: CampaignStage,
  premiumLocked: boolean,
): { face: string; lip: string; glyph: string | number; ink: string; glyphSize: number } {
  switch (state) {
    case 'locked':
      return { face: LOCKED_FACE, lip: LOCKED_LIP, glyph: '🔒', ink: '#6F695F', glyphSize: 22 };
    case 'premium':
      return { face: LOCKED_FACE, lip: LOCKED_LIP, glyph: '👑', ink: '#6F695F', glyphSize: 24 };
    case 'mastered':
      return { face: GOLD, lip: shade(GOLD, 0.3), glyph: '👑', ink: '#FFFFFF', glyphSize: 26 };
    case 'completed':
      return { face: colour, lip: shade(colour, 0.3), glyph: '★', ink: '#FFFFFF', glyphSize: 32 };
    case 'frontier':
      return {
        face: colour,
        lip: shade(colour, 0.3),
        glyph: premiumLocked ? '👑' : stage.index,
        ink: inkOn(colour),
        glyphSize: 30,
      };
    case 'open':
      return {
        face: colour,
        lip: shade(colour, 0.3),
        glyph: stage.index,
        ink: inkOn(colour),
        glyphSize: 26,
      };
  }
}

/** Soft expanding ring around the next playable stage. */
function FrontierPulse({ colour, size }: { colour: string; size: number }) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) }),
      -1,
      false,
    );
    return () => cancelAnimation(t);
  }, [t]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + t.value * 0.4 }],
    opacity: 0.7 * (1 - t.value),
  }));

  return (
    <Animated.View
      pointerEvents="none"
      testID="frontier-pulse"
      style={[
        style,
        {
          position: 'absolute',
          top: 0,
          left: 0,
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 4,
          borderColor: colour,
        },
      ]}
    />
  );
}

/**
 * A stage on the map: a round, Duolingo-style 3D button (a face sitting on a
 * darker lip, pressing down onto it), with its star tally beneath. The
 * frontier is larger, pulses, wears a bouncing START bubble and has Minerva
 * standing beside it. When a stage was cleared since the last visit it pops
 * and its stars drop in; when it was just unlocked it brightens a beat later,
 * as the trail reaches it.
 */
export function StageButton({
  stage,
  routeName,
  colour,
  unlocked,
  frontier,
  pulse,
  premiumLocked,
  stars,
  x,
  y,
  owlSide,
  celebrate,
  onPress,
}: {
  stage: CampaignStage;
  /** Route stages: the route's name, for the accessibility label. */
  routeName?: string;
  colour: string;
  unlocked: boolean;
  /** The next stage to play. */
  frontier: boolean;
  /** Wear the frontier pulse without being the frontier (the other route's opener at a fork). */
  pulse?: boolean;
  /** Premium stage for a free player: a crown, and tapping opens the paywall. */
  premiumLocked: boolean;
  stars: number;
  /** Centre of the button, in the era trail's coordinates. */
  x: number;
  y: number;
  /** Which side Minerva stands on (the side away from the trail's swing). */
  owlSide: 'left' | 'right';
  celebrate: { token: number; kind: 'cleared' | 'unlocked' } | null;
  onPress: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const starsIn = useSharedValue(1);

  const token = celebrate?.token;
  const kind = celebrate?.kind;
  useEffect(() => {
    if (token === undefined || reducedMotion) return;
    // A cleared stage pops as the sequence starts; an unlocked one waits for
    // the trail's lights to reach it.
    const delay =
      kind === 'cleared'
        ? SEQUENCE_DELAY_MS
        : SEQUENCE_DELAY_MS + 200 + TRAIL_DOTS * DOT_STAGGER_MS;
    scale.value = withDelay(
      delay,
      withSequence(
        withTiming(kind === 'cleared' ? 1.25 : 1.15, { duration: 160 }),
        withSpring(1, { damping: 8, stiffness: 180 }),
      ),
    );
    if (kind === 'cleared') {
      starsIn.value = 0;
      starsIn.value = withDelay(delay + 200, withTiming(1, { duration: 350 }));
    }
    return () => {
      cancelAnimation(scale);
      cancelAnimation(starsIn);
    };
  }, [token, kind, reducedMotion, scale, starsIn]);

  const buttonStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const starsStyle = useAnimatedStyle(() => ({
    opacity: starsIn.value,
    transform: [{ translateY: (1 - starsIn.value) * -8 }],
  }));

  const state = nodeState({ unlocked, frontier, premiumLocked, stars });
  const size = frontier ? FRONTIER_NODE : NODE;
  const look = faceOf(state, colour, stage, premiumLocked);
  const playable = unlocked || premiumLocked;
  const label = `${routeName !== undefined ? `${routeName}, ` : ''}Stage ${stage.index}${premiumLocked ? ', Premium' : unlocked ? '' : ', locked'}`;
  const done = stars > 0;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        alignItems: 'center',
      }}
    >
      {frontier && (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: -50, left: -60, right: -60, alignItems: 'center' }}
        >
          <StartBubble colour={colour} label={premiumLocked ? '👑 UNLOCK' : 'START'} />
        </View>
      )}

      {frontier && (
        <Image
          source={OWL}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
          accessible
          accessibilityLabel="Minerva the owl"
          style={[
            {
              position: 'absolute',
              top: size + LIP - OWL_HEIGHT,
              width: OWL_WIDTH,
              height: OWL_HEIGHT,
            },
            owlSide === 'left' ? { right: size + 10 } : { left: size + 10 },
          ]}
        />
      )}

      <Animated.View style={buttonStyle}>
        <Pressable
          disabled={!playable}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={label}
          testID={`stage-${stage.id}`}
          hitSlop={8}
          style={{ width: size, height: size + LIP }}
        >
          {({ pressed }) => (
            <>
              {(frontier || pulse === true) && !reducedMotion && (
                <FrontierPulse colour={colour} size={size} />
              )}
              {/* The lip: a darker circle the face sits on. */}
              <View
                style={{
                  position: 'absolute',
                  top: LIP,
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: look.lip,
                }}
              />
              <View
                testID={`stage-face-${state}`}
                style={{
                  position: 'absolute',
                  top: pressed ? LIP : 0,
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: look.face,
                  borderWidth: 3,
                  borderColor: 'rgba(255,255,255,0.28)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  className="font-black"
                  style={{
                    fontSize: look.glyphSize,
                    color: look.ink,
                    includeFontPadding: false,
                    opacity: state === 'locked' ? 0.75 : 1,
                    textShadowColor: look.ink === '#FFFFFF' ? 'rgba(0,0,0,0.25)' : 'transparent',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 2,
                  }}
                >
                  {look.glyph}
                </Text>
              </View>
            </>
          )}
        </Pressable>
      </Animated.View>

      {/* Star tally on a small pill under cleared buttons. */}
      {done && !frontier && (
        <Animated.View
          style={[
            starsStyle,
            {
              marginTop: 3,
              borderRadius: 999,
              paddingHorizontal: 6,
              paddingVertical: 1,
              backgroundColor: 'rgba(29,23,18,0.72)',
            },
          ]}
        >
          <Text className="text-[11px]" style={{ color: GOLD, includeFontPadding: false }}>
            {'★'.repeat(Math.min(stars, 3))}
            <Text style={{ color: 'rgba(255,255,255,0.35)' }}>
              {'★'.repeat(Math.max(0, 3 - stars))}
            </Text>
          </Text>
        </Animated.View>
      )}
    </View>
  );
}
