import { useContext, useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { t } from '@/i18n';

import { eraName, type CampaignWorld } from '../campaignMap';
import { eraNumeral } from './constants';
import { inkOn, shade } from './mapVisuals';

/** Lip under the sticky bar; smaller than the buttons' so it stays slim. */
const BAR_LIP = 4;

/**
 * Slim era-coloured bar pinned over the top of the map, naming the era in
 * view ("ERA II · The Middle Ages") with its stars, and the whole journey's
 * stars small on the right. Swaps (with a quick fade) as the player scrolls
 * from one era into the next, and fades out while the era's own banner is
 * still showing beneath it so the two never repeat each other.
 */
export function StickyEraBar({
  world,
  earned,
  total,
  journeyEarned,
  journeyTotal,
  visible,
  onPress,
}: {
  world: CampaignWorld;
  earned: number;
  total: number;
  journeyEarned: number;
  journeyTotal: number;
  /** False while the in-view era's banner is still visible below the bar. */
  visible: boolean;
  /** Makes the bar a button while it shows (a locked era opens the paywall). */
  onPress?: () => void;
}) {
  const ink = inkOn(world.colour);
  const reducedMotion = useReducedMotion();
  // Absolute children ignore the SafeAreaView's padding, so the status-bar
  // inset is added here or the bar slides up under the clock and icons.
  // (Read from context with a 0 fallback so it also renders without a provider.)
  const safeTop = useContext(SafeAreaInsetsContext)?.top ?? 0;
  const shown = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    const target = visible ? 1 : 0;
    shown.value = reducedMotion ? target : withTiming(target, { duration: 200 });
    return () => cancelAnimation(shown);
  }, [visible, reducedMotion, shown]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: shown.value }));

  return (
    <Animated.View
      pointerEvents={visible && onPress ? 'box-none' : 'none'}
      style={[fadeStyle, { position: 'absolute', top: safeTop + 8, left: 16, right: 16 }]}
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
      testID="sticky-era-bar"
    >
      <Pressable
        style={{ paddingBottom: BAR_LIP }}
        onPress={onPress}
        disabled={onPress === undefined}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={onPress ? t('campaign.banner.unlockA11y', { era: eraName(world) }) : undefined}
        testID="sticky-era-press"
      >
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: BAR_LIP,
            bottom: 0,
            borderRadius: 16,
            backgroundColor: shade(world.colour, 0.3),
          }}
        />
        <Animated.View
          key={world.id}
          entering={FadeIn.duration(180)}
          className="flex-row items-center gap-2 px-4"
          style={{
            height: 40,
            borderRadius: 16,
            backgroundColor: world.colour,
          }}
        >
          <Text
            className="flex-1 text-sm font-extrabold"
            style={{ color: ink }}
            numberOfLines={1}
            testID="sticky-era-title"
          >
            <Text className="text-xs tracking-widest">
              {t('campaign.banner.stickyEra', { numeral: eraNumeral(world.index) })}
            </Text>
            {' · '}
            {eraName(world)}
          </Text>
          <Text className="text-sm font-extrabold" style={{ color: ink }} testID="sticky-era-stars">
            ★ {earned}/{total}
          </Text>
          <View
            className="rounded-full px-2 py-0.5"
            style={{ backgroundColor: 'rgba(0,0,0,0.22)' }}
          >
            <Text className="text-[10px] font-bold text-white" testID="journey-stars">
              ★ {journeyEarned}/{journeyTotal}
            </Text>
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}
