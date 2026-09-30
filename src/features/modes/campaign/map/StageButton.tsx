import { type ComponentProps, useEffect } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
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

import { t } from '@/i18n';

import type { CampaignStage } from '../campaignMap';
import {
  DOT_STAGGER_MS,
  FRONTIER_NODE,
  LIP,
  NODE,
  SEQUENCE_DELAY_MS,
  TRAIL_DOTS,
} from './constants';
import { nodeState, shade, type NodeState } from './mapVisuals';
import { StartBubble } from './StartBubble';

/** Minerva, the game's owl scholar, keeps watch beside the frontier. */
const OWL = require('../../../../../assets/mascot/owl.webp');
const OWL_HEIGHT = 64;
/** The source art is 601×640. */
const OWL_WIDTH = Math.round(OWL_HEIGHT * (601 / 640));

const GOLD = '#F5C542';
const LOCKED_FACE = '#D6D2CA';
const LOCKED_LIP = '#A29C91';
/** Deep gold for the era icon on a mastered (gold) face. */
const MASTERED_INK = '#8A5A00';
/** Era icons on a coloured face are always white (user choice), shadowed so they read on light eras. */
const ICON_INK = '#FFFFFF';
/** Muted grey for an era icon on a premium-locked face. */
const PREMIUM_INK = '#8F897F';
const CROWN_BADGE = 22;
const DARK_BADGE = '#2A221B';
const CHECK_BADGE = 24;
const CHECK_GREEN = '#3DBE6B';
/** The mastered crown perched on top of the button. */
const CROWN_TOP = 30;

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type Glyph = { kind: 'text'; text: string } | { kind: 'icon'; name: IconName };

/**
 * Face colour, lip colour and glyph (text or era icon) for each button state.
 * `glyphSize` is px for text glyphs and a fraction of the button size for icons.
 */
function faceOf(
  state: NodeState,
  colour: string,
  icon: IconName,
  premiumLocked: boolean,
): {
  face: string;
  lip: string;
  glyph: Glyph;
  ink: string;
  glyphSize: number;
  crownBadge: boolean;
  /** Cleared: a tick in the corner. Mastered: a crown worn on top. */
  mark: 'check' | 'crown' | null;
} {
  switch (state) {
    case 'locked':
      return {
        face: LOCKED_FACE,
        lip: LOCKED_LIP,
        glyph: { kind: 'text', text: '🔒' },
        ink: '#6F695F',
        glyphSize: 22,
        crownBadge: false,
        mark: null,
      };
    case 'premium':
      // The era's own icon, greyed out, so later eras still look distinct; a
      // small crown in the corner says why it's shut.
      return {
        face: LOCKED_FACE,
        lip: LOCKED_LIP,
        glyph: { kind: 'icon', name: icon },
        ink: PREMIUM_INK,
        glyphSize: 0.42,
        crownBadge: true,
        mark: null,
      };
    case 'mastered':
      // Gold all over, the era icon in deep gold, wearing a crown.
      return {
        face: GOLD,
        lip: shade(GOLD, 0.3),
        glyph: { kind: 'icon', name: icon },
        ink: MASTERED_INK,
        glyphSize: 0.42,
        crownBadge: false,
        mark: 'crown',
      };
    case 'completed':
      // Keeps its era icon, with a tick in the corner.
      return {
        face: colour,
        lip: shade(colour, 0.3),
        glyph: { kind: 'icon', name: icon },
        ink: ICON_INK,
        glyphSize: 0.42,
        crownBadge: false,
        mark: 'check',
      };
    case 'frontier':
    case 'open':
      return {
        face: colour,
        lip: shade(colour, 0.3),
        glyph: { kind: 'icon', name: icon },
        ink: ICON_INK,
        glyphSize: 0.42,
        crownBadge: premiumLocked,
        mark: null,
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
  icon,
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
  hideOwl = false,
  celebrate,
  onPress,
}: {
  stage: CampaignStage;
  /** The era/route icon on the face (see `stageIcon`); the label keeps the number. */
  icon: string;
  /** Route stages: the route's name, for the accessibility label. */
  routeName?: string;
  colour: string;
  unlocked: boolean;
  /** The next stage to play. */
  frontier: boolean;
  /** Wear the frontier pulse without being the frontier (the other route's opener at a fork). */
  pulse?: boolean;
  /** Premium stage for a free player: a crown badge, and tapping opens the paywall. */
  premiumLocked: boolean;
  stars: number;
  /** Centre of the button, in the era trail's coordinates. */
  x: number;
  y: number;
  /** Which side Minerva stands on (the side away from the trail's swing). */
  owlSide: 'left' | 'right';
  /** Keep Minerva away from a crowded frontier (two route openers pulsing side by side). */
  hideOwl?: boolean;
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
  const look = faceOf(state, colour, icon as IconName, premiumLocked);
  const playable = unlocked || premiumLocked;
  const base =
    routeName !== undefined
      ? t('campaign.stage.a11yRoute', { route: routeName, index: stage.index })
      : t('campaign.stage.a11y', { index: stage.index });
  const label = premiumLocked
    ? t('campaign.stage.a11yPremium', { label: base })
    : unlocked
      ? base
      : t('campaign.stage.a11yLocked', { label: base });
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
          <StartBubble colour={colour} label={premiumLocked ? t('campaign.stage.unlock') : t('campaign.stage.start')} />
        </View>
      )}

      {frontier && !hideOwl && (
        <Image
          source={OWL}
          resizeMethod="resize"
          resizeMode="contain"
          accessibilityIgnoresInvertColors
          accessible
          accessibilityLabel={t('campaign.stage.owl')}
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
                  borderColor: state === 'mastered' ? '#FFF3C4' : 'rgba(255,255,255,0.28)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {state === 'mastered' && (
                  // A polished-gold glint across the face.
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      top: -size * 0.2,
                      left: size * 0.12,
                      width: size * 0.16,
                      height: size * 1.4,
                      backgroundColor: 'rgba(255,255,255,0.4)',
                      transform: [{ rotate: '35deg' }],
                    }}
                  />
                )}
                {look.glyph.kind === 'icon' ? (
                  // Wrapped so the name is findable before the icon font loads.
                  <View testID={`stage-icon-${look.glyph.name}`}>
                    <MaterialCommunityIcons
                      name={look.glyph.name}
                      size={Math.round(size * look.glyphSize)}
                      color={look.ink}
                      style={{
                        textShadowColor:
                          look.ink === '#FFFFFF' ? 'rgba(0,0,0,0.25)' : 'transparent',
                        textShadowOffset: { width: 0, height: 1 },
                        textShadowRadius: 2,
                      }}
                    />
                  </View>
                ) : (
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
                    {look.glyph.text}
                  </Text>
                )}
              </View>
              {look.crownBadge && (
                <View
                  pointerEvents="none"
                  testID="stage-crown-badge"
                  style={{
                    position: 'absolute',
                    top: (pressed ? LIP : 0) - 4,
                    right: -4,
                    width: CROWN_BADGE,
                    height: CROWN_BADGE,
                    borderRadius: CROWN_BADGE / 2,
                    backgroundColor: DARK_BADGE,
                    borderWidth: 1.5,
                    borderColor: GOLD,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialCommunityIcons name="crown" size={14} color={GOLD} />
                </View>
              )}
              {look.mark === 'check' && (
                <View
                  pointerEvents="none"
                  testID="stage-check-badge"
                  style={{
                    position: 'absolute',
                    top: (pressed ? LIP : 0) + size - CHECK_BADGE + 2,
                    right: -4,
                    width: CHECK_BADGE,
                    height: CHECK_BADGE,
                    borderRadius: CHECK_BADGE / 2,
                    backgroundColor: CHECK_GREEN,
                    borderWidth: 2.5,
                    borderColor: '#FFFFFF',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialCommunityIcons name="check-bold" size={13} color="#FFFFFF" />
                </View>
              )}
              {look.mark === 'crown' && (
                <View
                  pointerEvents="none"
                  testID="stage-mastered-crown"
                  style={{
                    position: 'absolute',
                    top: (pressed ? LIP : 0) - CROWN_TOP * 0.62,
                    left: (size - CROWN_TOP) / 2,
                    width: CROWN_TOP,
                    height: CROWN_TOP,
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: [{ rotate: '-12deg' }],
                  }}
                >
                  <MaterialCommunityIcons
                    name="crown"
                    size={CROWN_TOP}
                    color={GOLD}
                    style={{
                      textShadowColor: 'rgba(80,50,0,0.85)',
                      textShadowOffset: { width: 0, height: 1.5 },
                      textShadowRadius: 1.5,
                    }}
                  />
                </View>
              )}
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
