import { Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import type { CampaignWorld } from '../campaignMap';
import { eraNumeral } from './constants';
import { inkOn, shade } from './mapVisuals';

/** Lip under the sticky bar; smaller than the buttons' so it stays slim. */
const BAR_LIP = 4;

/**
 * Slim era-coloured bar pinned over the top of the map, naming the era in
 * view ("ERA II · The Middle Ages") with its stars, and the whole journey's
 * stars small on the right. Swaps (with a quick fade) as the player scrolls
 * from one era into the next.
 */
export function StickyEraBar({
  world,
  earned,
  total,
  journeyEarned,
  journeyTotal,
}: {
  world: CampaignWorld;
  earned: number;
  total: number;
  journeyEarned: number;
  journeyTotal: number;
}) {
  const ink = inkOn(world.colour);
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 8, left: 16, right: 16 }}
      testID="sticky-era-bar"
    >
      <View style={{ paddingBottom: BAR_LIP }}>
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
          style={{ height: 40, borderRadius: 16, backgroundColor: world.colour }}
        >
          <Text
            className="flex-1 text-sm font-extrabold"
            style={{ color: ink }}
            numberOfLines={1}
            testID="sticky-era-title"
          >
            <Text className="text-xs tracking-widest">ERA {eraNumeral(world.index)}</Text>
            {' · '}
            {world.name}
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
      </View>
    </View>
  );
}
