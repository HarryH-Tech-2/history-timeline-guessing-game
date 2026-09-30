import { Text, View } from 'react-native';

import { routeName } from '@/data';

import type { CampaignRoute } from '../campaignMap';
import { ROUTE_BANNER_H } from './constants';
import { inkOn, shade, tint } from './mapVisuals';

const BANNER_LIP = 4;
const BADGE = 30;

/**
 * The signpost heading one lane of a fork: a raised card on a soft 3D lip in
 * the era colour, the route's icon in an era-coloured badge (ticked once the
 * whole route is cleared), its name, and a star-tally pill underneath. Faded
 * until the player reaches the fork. The name stays on one line inside the
 * lane (138dp at 320dp): it shrinks to fit, and truncates rather than
 * overflowing if even that isn't enough.
 */
export function RouteBanner({
  route,
  colour,
  earned,
  total,
  cleared = false,
  locked = false,
  left,
  top,
  width,
}: {
  route: CampaignRoute;
  colour: string;
  earned: number;
  total: number;
  /** Every stage of the route cleared. */
  cleared?: boolean;
  /** The fork isn't reached yet: the route can't be started. */
  locked?: boolean;
  left: number;
  top: number;
  width: number;
}) {
  return (
    <View
      pointerEvents="none"
      testID={`route-${route.id}`}
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height: ROUTE_BANNER_H,
        overflow: 'hidden',
        opacity: locked ? 0.75 : 1,
      }}
    >
      {/* The 3D lip: a lighter era-coloured copy of the card peeking out underneath. */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: BANNER_LIP,
          bottom: 0,
          borderRadius: 16,
          backgroundColor: tint(colour, 0.35),
        }}
      />
      <View
        className="flex-row items-center bg-bg-raised"
        style={{
          height: ROUTE_BANNER_H - BANNER_LIP,
          borderRadius: 16,
          borderWidth: 1.5,
          borderColor: tint(colour, 0.55),
          paddingHorizontal: 6,
          gap: 6,
        }}
      >
        <View
          testID={`route-badge-${route.id}`}
          style={{
            width: BADGE,
            height: BADGE,
            borderRadius: BADGE / 2,
            backgroundColor: colour,
            borderBottomWidth: 2,
            borderBottomColor: shade(colour, 0.25),
          }}
          className="items-center justify-center"
        >
          <Text style={{ fontSize: 15 }}>{route.icon}</Text>
          {cleared && (
            <View
              testID={`route-cleared-${route.id}`}
              className="absolute items-center justify-center rounded-full"
              style={{
                right: -3,
                bottom: -3,
                width: 14,
                height: 14,
                backgroundColor: shade(colour, 0.35),
                borderWidth: 1.5,
                borderColor: '#FFFFFF',
              }}
            >
              <Text style={{ fontSize: 8, lineHeight: 10, fontWeight: '900', color: inkOn(shade(colour, 0.35)) }}>
                ✓
              </Text>
            </View>
          )}
        </View>
        <View className="flex-1 items-start justify-center" style={{ gap: 2 }}>
          <Text
            className="text-[13px] font-extrabold text-ink-primary"
            style={{ maxWidth: '100%' }}
            numberOfLines={1}
            ellipsizeMode="tail"
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {routeName(route)}
          </Text>
          <View
            className="rounded-full px-1.5"
            style={{ backgroundColor: tint(colour, 0.8) }}
          >
            <Text
              className="text-[10px] font-extrabold"
              style={{ color: shade(colour, 0.45) }}
              numberOfLines={1}
              testID={`route-stars-${route.id}`}
            >
              ★ {earned}/{total}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
