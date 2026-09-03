import { forwardRef } from 'react';
import { Image, Text, View } from 'react-native';

import { getQuestionById } from '@/data';
import { formatYear } from '@/features/timeline/math';
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

/** Width of each year column; wide enough for "1000 BCE" at the row font size. */
const YEAR_COLUMN = 60;

/**
 * The square image version of the Daily share card: the puzzle number and
 * score up top, then one row per round — the event, the year guessed and the
 * real year, colour-coded by how close the guess was. Rendered off-screen and
 * captured to a PNG, so it uses inline styles on the fixed parchment palette
 * (never the live theme) and no animation — what you see is what gets shared.
 */
export const DailyShareCard = forwardRef<View, DailyShareCardProps>(function DailyShareCard(
  { record },
  ref,
) {
  const { totalScore, exact, rounds } = summariseRecord(record);

  return (
    <View
      ref={ref}
      collapsable={false}
      testID="daily-share-card"
      style={{
        width: SHARE_CARD_SIZE,
        height: SHARE_CARD_SIZE,
        backgroundColor: p.bg.base,
        padding: 18,
        justifyContent: 'space-between',
        borderWidth: 4,
        borderColor: p.accent.default,
      }}
    >
      {/* Header: owl, title and the score */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Image source={OWL} style={{ width: 44, height: 44 }} resizeMode="contain" />
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 10,
              fontWeight: '700',
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: p.ink.muted,
            }}
          >
            Date Guesser
          </Text>
          <Text style={{ fontSize: 20, fontWeight: '800', color: p.ink.primary, lineHeight: 24 }}>
            Daily #{dailyNumber(record.date)}
          </Text>
          <Text style={{ fontSize: 11, color: p.ink.secondary }}>{prettyDate(record.date)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text
            style={{ fontSize: 28, fontWeight: '800', color: p.accent.default, lineHeight: 32 }}
          >
            {totalScore.toLocaleString()}
          </Text>
          <Text style={{ fontSize: 11, fontWeight: '600', color: p.ink.secondary }}>
            {exact}/{rounds} exact
          </Text>
        </View>
      </View>

      {/* Rounds: event, guessed year, real year */}
      <View style={{ gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 2 }}>
          <View style={{ width: 10 }} />
          <Text style={{ flex: 1, fontSize: 9, fontWeight: '700', color: p.ink.muted }}>
            EVENT
          </Text>
          <Text style={columnHeader}>YOU</Text>
          <Text style={columnHeader}>ACTUAL</Text>
        </View>
        {record.rounds.map((round, i) => {
          const question = getQuestionById(round.questionId);
          const tier = tierForError(round.errorYears);
          return (
            <View
              key={`${round.questionId}-${i}`}
              testID={`share-card-row-${i}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  backgroundColor: TIER_COLOURS[tier],
                }}
              />
              <Text
                numberOfLines={1}
                style={{ flex: 1, fontSize: 11, fontWeight: '600', color: p.ink.primary }}
              >
                {question?.title ?? 'Question'}
              </Text>
              <Text numberOfLines={1} style={[yearCell, { color: p.ink.secondary }]}>
                {round.guessYear === undefined ? '—' : formatYear(round.guessYear)}
              </Text>
              <Text
                numberOfLines={1}
                style={[yearCell, { fontWeight: '700', color: p.ink.primary }]}
              >
                {question ? formatYear(question.year) : '—'}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Footer */}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: p.hair,
          paddingTop: 8,
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

const columnHeader = {
  width: YEAR_COLUMN,
  fontSize: 9,
  fontWeight: '700' as const,
  color: p.ink.muted,
  textAlign: 'right' as const,
};

const yearCell = {
  width: YEAR_COLUMN,
  fontSize: 11,
  textAlign: 'right' as const,
};
