import { forwardRef } from 'react';
import { Image, Text, View } from 'react-native';

import { lightPalette as p } from '@/theme/tokens';

import type { DailyRecord } from '../persistence';
import { dailyNumber, summariseRecord, TIER_COLOURS, tierForError } from './shareCard';

const OWL = require('../../../../assets/mascot/owl.webp');

/** Logical size of the card; captured at 3× for a crisp 1080 px square. */
export const SHARE_CARD_SIZE = 360;
export const SHARE_CARD_PIXELS = 1080;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function prettyDate(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number) as [number, number, number];
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

interface DailyShareCardProps {
  record: DailyRecord;
}

/**
 * The square image version of the Daily share card. Rendered off-screen and
 * captured to a PNG, so it uses inline styles on the fixed parchment palette
 * (never the live theme) and no animation — what you see is what gets shared.
 */
export const DailyShareCard = forwardRef<View, DailyShareCardProps>(function DailyShareCard(
  { record },
  ref,
) {
  const { totalScore, exact, rounds, avgError } = summariseRecord(record);
  const tiles = record.rounds.map((r) => tierForError(r.errorYears));
  const tileSize = Math.floor((SHARE_CARD_SIZE - 48 - (tiles.length - 1) * 8) / Math.max(tiles.length, 1));

  return (
    <View
      ref={ref}
      collapsable={false}
      testID="daily-share-card"
      style={{
        width: SHARE_CARD_SIZE,
        height: SHARE_CARD_SIZE,
        backgroundColor: p.bg.base,
        padding: 24,
        justifyContent: 'space-between',
        borderWidth: 4,
        borderColor: p.accent.default,
      }}
    >
      {/* Header: owl + title */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Image source={OWL} style={{ width: 56, height: 56 }} resizeMode="contain" />
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '700',
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: p.ink.muted,
            }}
          >
            Date Guesser
          </Text>
          <Text style={{ fontSize: 26, fontWeight: '800', color: p.ink.primary }}>
            Daily #{dailyNumber(record.date)}
          </Text>
          <Text style={{ fontSize: 12, color: p.ink.secondary }}>{prettyDate(record.date)}</Text>
        </View>
      </View>

      {/* Tiles: one square per round, graded by how close the guess was */}
      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
        {tiles.map((tier, i) => (
          <View
            key={i}
            style={{
              width: tileSize,
              height: tileSize,
              borderRadius: 6,
              backgroundColor: TIER_COLOURS[tier],
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {tier === 'exact' && (
              <Text style={{ fontSize: Math.round(tileSize * 0.55) }}>🎯</Text>
            )}
          </View>
        ))}
      </View>

      {/* Score */}
      <View style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 44, fontWeight: '800', color: p.accent.default, lineHeight: 50 }}>
          {totalScore.toLocaleString()}
        </Text>
        <Text style={{ fontSize: 13, fontWeight: '600', color: p.ink.secondary }}>
          {exact}/{rounds} exact · avg {avgError} {avgError === 1 ? 'yr' : 'yrs'} off
        </Text>
      </View>

      {/* Footer */}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: p.hair,
          paddingTop: 10,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: '700', color: p.ink.primary }}>
          Can you beat me?
        </Text>
        <Text style={{ fontSize: 11, color: p.ink.muted }}>Date Guesser · Google Play</Text>
      </View>
    </View>
  );
});
