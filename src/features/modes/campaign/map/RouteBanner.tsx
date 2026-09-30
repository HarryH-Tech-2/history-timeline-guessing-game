import { Text, View } from 'react-native';

import type { CampaignRoute } from '../campaignMap';
import { ROUTE_BANNER_H } from './constants';
import { inkOn, shade } from './mapVisuals';

const BANNER_LIP = 4;

/**
 * The small banner heading one lane of a fork, in the era colour on a darker
 * lip like the stage buttons: the route's icon and name, and its star tally.
 * The name stays on one line inside the lane (138dp at 320dp): it shrinks to
 * fit, and truncates rather than overflowing if even that isn't enough.
 */
export function RouteBanner({
  route,
  colour,
  earned,
  total,
  left,
  top,
  width,
}: {
  route: CampaignRoute;
  colour: string;
  earned: number;
  total: number;
  left: number;
  top: number;
  width: number;
}) {
  const ink = inkOn(colour);
  return (
    <View
      pointerEvents="none"
      testID={`route-${route.id}`}
      style={{ position: 'absolute', left, top, width, height: ROUTE_BANNER_H, overflow: 'hidden' }}
    >
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: BANNER_LIP,
          bottom: 0,
          borderRadius: 14,
          backgroundColor: shade(colour, 0.3),
        }}
      />
      <View
        className="items-center justify-center px-2"
        style={{ height: ROUTE_BANNER_H - BANNER_LIP, borderRadius: 14, backgroundColor: colour }}
      >
        <Text
          className="text-xs font-extrabold"
          style={{ color: ink, maxWidth: '100%' }}
          numberOfLines={1}
          ellipsizeMode="tail"
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {`${route.icon} ${route.name}`}
        </Text>
        <Text
          className="text-[11px] font-bold"
          style={{ color: ink }}
          numberOfLines={1}
          testID={`route-stars-${route.id}`}
        >
          ★ {earned}/{total}
        </Text>
      </View>
    </View>
  );
}
