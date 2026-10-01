import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { t } from '@/i18n';

import { eraName, eraPeriod, type CampaignWorld, type EraStatus } from '../campaignMap';
import { eraNumeral, LIP, SEQUENCE_DELAY_MS } from './constants';
import { bannerInk, shade } from './mapVisuals';

/** A light bar that sweeps across the banner once, when its era opens. */
function Shimmer({ token }: { token: number }) {
  const reducedMotion = useReducedMotion();
  const x = useSharedValue(-1);

  useEffect(() => {
    if (reducedMotion) return;
    x.value = -1;
    x.value = withDelay(
      SEQUENCE_DELAY_MS + 500,
      withTiming(2, { duration: 900, easing: Easing.inOut(Easing.quad) }),
    );
    return () => cancelAnimation(x);
  }, [token, reducedMotion, x]);

  const style = useAnimatedStyle(() => ({
    opacity: x.value > -1 && x.value < 2 ? 0.35 : 0,
    left: `${x.value * 100}%`,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        style,
        { position: 'absolute', top: 0, bottom: 0, width: '30%', backgroundColor: '#FFFFFF' },
      ]}
    />
  );
}

/**
 * The chunky banner opening an era: numeral and year span, the era's name,
 * its star tally (routes included), a bar of main-path stages cleared, and a seal once the era is
 * complete or mastered (or a Premium badge when it's locked behind Premium).
 * Drawn in the era colour on a darker 3D lip, like the stage buttons.
 */
export function EraBanner({
  world,
  status,
  earned,
  total,
  premiumLocked,
  shimmerToken,
  onPress,
}: {
  world: CampaignWorld;
  status: EraStatus;
  earned: number;
  total: number;
  /** Premium era and the player isn't: a crown badge instead of progress seals. */
  premiumLocked: boolean;
  /** Set when the era just opened; replays the shimmer. */
  shimmerToken?: number;
  /** Makes the banner a button (a locked era opens the paywall). */
  onPress?: () => void;
}) {
  const ink = bannerInk(world.colour);
  const fraction = status.total > 0 ? status.cleared / status.total : 0;
  const seal = premiumLocked
    ? { text: t('campaign.banner.premium'), testID: 'era-premium' }
    : status.mastered
      ? { text: t('campaign.banner.mastered'), testID: 'era-mastered' }
      : status.complete
        ? { text: t('campaign.banner.complete'), testID: 'era-complete' }
        : null;

  return (
    <Pressable
      // z-10: above its trail, so the road into the first stage runs out from
      // under the banner (as it does under the route signposts) instead of
      // its rounded end sitting on top of the lip.
      className="z-10 px-5 pb-2 pt-8 active:opacity-90"
      testID={`world-${world.id}`}
      onPress={onPress}
      disabled={onPress === undefined}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? t('campaign.banner.unlockA11y', { era: eraName(world) }) : undefined}
    >
      <View style={{ paddingBottom: LIP }}>
        {/* The 3D lip: a darker copy of the banner peeking out underneath. */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: LIP,
            bottom: 0,
            borderRadius: 20,
            backgroundColor: shade(world.colour, 0.3),
          }}
        />
        <View
          className="overflow-hidden px-4 pb-3 pt-2.5"
          style={{ borderRadius: 20, backgroundColor: world.colour }}
        >
          {shimmerToken !== undefined && <Shimmer token={shimmerToken} />}
          <View className="flex-row items-center justify-between">
            <Text
              className="text-[11px] font-extrabold uppercase tracking-widest"
              style={[ink, { opacity: 0.85 }]}
            >
              {t('campaign.banner.eraLabel', { numeral: eraNumeral(world.index), period: eraPeriod(world) })}
            </Text>
            {seal !== null && (
              <View
                className="rounded-full px-2 py-0.5"
                style={{ backgroundColor: premiumLocked ? '#1D1712' : '#FFFFFF' }}
                testID={seal.testID}
              >
                <Text
                  className="text-[10px] font-extrabold uppercase tracking-wide"
                  style={{ color: premiumLocked ? '#F5C542' : shade(world.colour, 0.45) }}
                >
                  {seal.text}
                </Text>
              </View>
            )}
          </View>
          <View className="mt-0.5 flex-row items-end justify-between gap-2">
            <Text
              className="flex-1 text-2xl font-extrabold"
              style={ink}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {eraName(world)}
            </Text>
            <Text className="text-sm font-extrabold" style={ink}>
              ★ {earned}/{total}
            </Text>
          </View>
          <View className="mt-2 flex-row items-center gap-2">
            <View
              className="h-2.5 flex-1 overflow-hidden rounded-full"
              style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
            >
              <View
                className="h-2.5 rounded-full"
                style={{ width: `${fraction * 100}%`, backgroundColor: ink.color }}
                testID={`era-progress-${world.id}`}
              />
            </View>
            <Text className="text-[11px] font-bold" style={ink}>
              {status.cleared}/{status.total}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
