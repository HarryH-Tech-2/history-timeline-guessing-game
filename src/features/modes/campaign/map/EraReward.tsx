import { useEffect } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Text, View } from 'react-native';
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

import { Confetti } from '@/features/round/components/Confetti';
import { t } from '@/i18n';

import { eraName, type CampaignWorld } from '../campaignMap';
import { LIP, REWARD_PLAQUE_H, SEQUENCE_DELAY_MS } from './constants';
import { shade, tint } from './mapVisuals';
import type { RewardSpot } from './trailLayout';

const GOLD = '#F5C542';
const PARCHMENT = '#F3E9D2';
const PLAQUE = 'rgba(29,23,18,0.8)';
const CREAM = '#FFF3C4';
const RAYS = 16;
const SPARKLES = 8;

/** Where the trophy stands: still to win, won, or won with every stage at three stars. */
export type RewardState = 'locked' | 'won' | 'mastered';

/**
 * One ray of the sunburst: a wedge with its point at the centre of a
 * `span`-square box, widening outwards (a zero-size View drawn with borders).
 */
function Ray({ span, length, base, angle, colour, opacity }: {
  span: number;
  length: number;
  base: number;
  angle: number;
  colour: string;
  opacity: number;
}) {
  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: span,
        height: span,
        transform: [{ rotate: `${angle}deg` }],
      }}
    >
      <View
        style={{
          position: 'absolute',
          left: span / 2 - base / 2,
          top: span / 2 - length,
          width: 0,
          height: 0,
          borderLeftWidth: base / 2,
          borderRightWidth: base / 2,
          borderTopWidth: length,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: colour,
          opacity,
        }}
      />
    </View>
  );
}

/**
 * A burst of light behind a won trophy: a soft gold halo, sharp sunburst rays
 * (long gold, short cream) and a ring of diamond sparkles turning the other
 * way. When the trophy is first won the rays flare out while they spin in; the
 * campaign's final trophy keeps turning slowly once it's claimed.
 */
export function Rays({
  size,
  colour,
  spinToken,
  forever,
}: {
  size: number;
  colour: string;
  spinToken?: number;
  forever: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const turn = useSharedValue(0);
  const flare = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) return;
    if (forever) {
      turn.value = withRepeat(withTiming(360, { duration: 30_000, easing: Easing.linear }), -1, false);
    } else if (spinToken !== undefined) {
      turn.value = 0;
      flare.value = 0.4;
      turn.value = withDelay(
        SEQUENCE_DELAY_MS,
        withTiming(67.5, { duration: 1800, easing: Easing.out(Easing.cubic) }),
      );
      flare.value = withDelay(
        SEQUENCE_DELAY_MS,
        withSequence(withTiming(1.15, { duration: 420, easing: Easing.out(Easing.quad) }), withSpring(1, { damping: 9 })),
      );
    }
    return () => {
      cancelAnimation(turn);
      cancelAnimation(flare);
    };
  }, [forever, spinToken, reducedMotion, turn, flare]);

  const raysStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.value}deg` }, { scale: flare.value }],
  }));
  const sparkleStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${-turn.value * 1.5}deg` }] }));

  const span = size * 2.3;
  const box = {
    position: 'absolute' as const,
    left: -(span - size) / 2,
    top: -(span - size) / 2,
    width: span,
    height: span,
  };
  const ring = size * 0.86; // sparkle orbit radius
  const dot = Math.max(6, Math.round(size * 0.09));

  return (
    <View pointerEvents="none" style={box}>
      {/* Halo: stacked discs fake a radial glow. */}
      {[
        [1.05, 0.14],
        [0.82, 0.2],
        [0.64, 0.28],
      ].map(([r, a]) => (
        <View
          key={r}
          style={{
            position: 'absolute',
            left: span / 2 - size * r!,
            top: span / 2 - size * r!,
            width: size * r! * 2,
            height: size * r! * 2,
            borderRadius: size * r!,
            backgroundColor: GOLD,
            opacity: a,
          }}
        />
      ))}
      <Animated.View style={[raysStyle, { position: 'absolute', left: 0, top: 0, width: span, height: span }]}>
        {Array.from({ length: RAYS }, (_, i) => {
          const long = i % 2 === 0;
          return (
            <Ray
              key={i}
              span={span}
              length={size * (long ? 1.12 : 0.86)}
              base={size * (long ? 0.3 : 0.18)}
              angle={(i * 360) / RAYS}
              colour={long ? GOLD : CREAM}
              opacity={long ? 0.6 : 0.5}
            />
          );
        })}
      </Animated.View>
      <Animated.View style={[sparkleStyle, { position: 'absolute', left: 0, top: 0, width: span, height: span }]}>
        {Array.from({ length: SPARKLES }, (_, i) => {
          const a = ((i + 0.5) * 2 * Math.PI) / SPARKLES;
          const s = i % 2 === 0 ? dot : dot * 0.6;
          return (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: span / 2 + Math.cos(a) * ring - s / 2,
                top: span / 2 + Math.sin(a) * ring - s / 2,
                width: s,
                height: s,
                backgroundColor: i % 2 === 0 ? '#FFFFFF' : tint(colour, 0.5),
                borderRadius: s * 0.15,
                transform: [{ rotate: '45deg' }],
                shadowColor: GOLD,
                shadowOpacity: 0.9,
                shadowRadius: 4,
                elevation: 2,
              }}
            />
          );
        })}
      </Animated.View>
    </View>
  );
}

/** Copy on the plaque under the trophy. */
function plaqueText(
  world: CampaignWorld,
  state: RewardState,
  finale: boolean,
  progress: { done: number; total: number },
): { title: string; body: string } {
  if (finale) {
    switch (state) {
      case 'locked':
        return {
          title: t('campaign.reward.finaleLockedTitle'),
          body: t('campaign.reward.finaleLockedBody', { done: progress.done, total: progress.total }),
        };
      case 'won':
        return { title: t('campaign.reward.finaleWonTitle'), body: t('campaign.reward.finaleWonBody') };
      case 'mastered':
        return { title: t('campaign.reward.finaleMasteredTitle'), body: t('campaign.reward.finaleMasteredBody') };
    }
  }
  switch (state) {
    case 'locked':
      return {
        title: t('campaign.reward.lockedTitle', { era: eraName(world) }),
        body: t('campaign.reward.lockedBody', { done: progress.done, total: progress.total }),
      };
    case 'won':
      return { title: t('campaign.reward.wonTitle'), body: t('campaign.reward.wonBody') };
    case 'mastered':
      return { title: t('campaign.reward.masteredTitle'), body: t('campaign.reward.masteredBody') };
  }
}

/**
 * The trophy closing an era's trail (or, for the last era, the whole
 * campaign): something to aim for while it's still to win — a pale medallion
 * and a plaque counting down what's left — and a gold, sunburst-backed prize
 * once it's claimed, crowned when mastered. Won since the last visit, it
 * pops, its rays spin in and confetti bursts out.
 */
export function EraReward({
  world,
  spot,
  state,
  progress,
  trailWidth,
  celebrateToken,
}: {
  world: CampaignWorld;
  spot: RewardSpot;
  state: RewardState;
  /** Stages cleared of the era's main path (eras complete, for the finale). */
  progress: { done: number; total: number };
  trailWidth: number;
  /** Set when the trophy was won since the last visit; replays the fanfare. */
  celebrateToken?: number;
}) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const { size, finale } = spot;
  const won = state !== 'locked';

  useEffect(() => {
    if (celebrateToken === undefined || reducedMotion) return;
    scale.value = withDelay(
      SEQUENCE_DELAY_MS + 300,
      withSequence(
        withTiming(1.3, { duration: 200 }),
        withSpring(1, { damping: 7, stiffness: 160 }),
      ),
    );
    return () => cancelAnimation(scale);
  }, [celebrateToken, reducedMotion, scale]);

  const medalStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const face = won ? GOLD : PARCHMENT;
  const lip = won ? shade(GOLD, 0.32) : '#C9B99A';
  const icon = state === 'mastered' ? 'crown' : finale ? 'trophy-award' : 'trophy';
  const ink = won ? '#FFFFFF' : shade(world.colour, 0.35);
  const text = plaqueText(world, state, finale, progress);
  const boxWidth = Math.min(trailWidth - 32, finale ? 300 : 260);

  return (
    <View
      pointerEvents="none"
      testID={`era-reward-${world.id}`}
      accessible
      accessibilityLabel={`${text.title}. ${text.body}`}
      style={{
        position: 'absolute',
        left: spot.x - boxWidth / 2,
        top: spot.y - size / 2,
        width: boxWidth,
        alignItems: 'center',
      }}
    >
      <Animated.View style={[medalStyle, { width: size, height: size + LIP }]}>
        {won && (
          <Rays size={size} colour={world.colour} spinToken={celebrateToken} forever={finale} />
        )}
        {/* The lip, then the face: the same 3D build as the stage buttons. */}
        <View
          style={{
            position: 'absolute',
            top: LIP,
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: lip,
          }}
        />
        <View
          testID={`era-reward-face-${state}`}
          style={{
            position: 'absolute',
            top: 0,
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: face,
            borderWidth: 4,
            borderColor: won ? 'rgba(255,255,255,0.55)' : tint(world.colour, 0.3),
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* An inner ring, era-coloured once won. */}
          <View
            style={{
              position: 'absolute',
              width: size - 18,
              height: size - 18,
              borderRadius: (size - 18) / 2,
              borderWidth: 2,
              borderColor: won ? tint(world.colour, 0.15) : 'rgba(29,23,18,0.12)',
            }}
          />
          <View testID={`era-reward-icon-${icon}`} style={{ opacity: won ? 1 : 0.6 }}>
            <MaterialCommunityIcons
              name={icon}
              size={Math.round(size * 0.5)}
              color={ink}
              style={{
                textShadowColor: won ? 'rgba(0,0,0,0.3)' : 'transparent',
                textShadowOffset: { width: 0, height: 2 },
                textShadowRadius: 3,
              }}
            />
          </View>
        </View>
        {!won && (
          <View
            style={{
              position: 'absolute',
              right: -2,
              bottom: LIP - 2,
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: '#2A221B',
              borderWidth: 2,
              borderColor: PARCHMENT,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialCommunityIcons name="lock" size={15} color={PARCHMENT} />
          </View>
        )}
        {won && (
          <>
            <Text style={{ position: 'absolute', left: -14, top: -6, fontSize: 18 }}>✨</Text>
            <Text style={{ position: 'absolute', right: -12, bottom: 4, fontSize: 14 }}>✨</Text>
          </>
        )}
      </Animated.View>

      <View
        style={{
          marginTop: 8,
          minHeight: REWARD_PLAQUE_H - 12,
          borderRadius: 14,
          paddingHorizontal: 12,
          paddingVertical: 6,
          backgroundColor: PLAQUE,
          borderWidth: 1.5,
          borderColor: won ? GOLD : 'rgba(255,255,255,0.18)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          className="text-[13px] font-extrabold"
          style={{ color: won ? GOLD : '#FFFFFF', textAlign: 'center' }}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {text.title}
        </Text>
        <Text
          className="text-[11px] font-semibold"
          style={{ color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 1 }}
          numberOfLines={2}
          testID={`era-reward-body-${world.id}`}
        >
          {text.body}
        </Text>
      </View>

      {celebrateToken !== undefined && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: size / 2,
            left: -(trailWidth - boxWidth) / 2,
            width: trailWidth,
            height: 0,
          }}
        >
          <Confetti key={celebrateToken} reducedMotion={reducedMotion} count={finale ? 48 : 32} />
        </View>
      )}
    </View>
  );
}
