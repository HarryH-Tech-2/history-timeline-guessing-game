import assert from 'node:assert/strict';
import { test } from 'node:test';

import { dailyScoreFor, homeZone, houseTurn, localClock, weekKeyForDay } from './houseTurns';

const ids = Array.from({ length: 120 }, (_, i) => `house-${i + 1}`);

/** Run the job hourly from `start` for `hours`, applying every turn it hands out. */
function simulate(start: Date, hours: number) {
  const rows = new Map(ids.map((id) => [id, { xp: 500 } as Record<string, unknown>]));
  for (let h = 0; h < hours; h++) {
    const now = new Date(start.getTime() + h * 3_600_000);
    ids.forEach((id, i) => {
      const turn = houseTurn(id, rows.get(id)!, 1 - i / ids.length, now);
      if (turn) rows.set(id, { ...rows.get(id), ...turn });
    });
  }
  return rows;
}

/** The first half-hour from `from` at which it is late evening in the row's home zone. */
function lateInTheDay(id: string, from: string): Date {
  for (let h = 0; h < 48; h++) {
    const at = new Date(new Date(from).getTime() + h * 3_600_000);
    if (localClock(at, homeZone(id)).hour === 22) return at;
  }
  throw new Error('no late hour found');
}

test('reads the local day and hour of a zone', () => {
  const now = new Date('2026-09-28T00:52:00Z');
  assert.deepEqual(localClock(now, 'Europe/London'), { day: '2026-09-28', hour: 1 });
  assert.deepEqual(localClock(now, 'America/Bogota'), { day: '2026-09-27', hour: 19 });
  assert.equal(weekKeyForDay('2026-09-27'), '2026-W39');
  assert.equal(weekKeyForDay('2026-09-28'), '2026-W40');
});

test('a home zone is stable and the rows are spread over several', () => {
  assert.equal(homeZone('house-7'), homeZone('house-7'));
  assert.ok(new Set(ids.map(homeZone)).size >= 5);
});

test('a row takes one turn per local day', () => {
  const now = lateInTheDay('house-3', '2026-09-28T00:30:00Z');
  const first = houseTurn('house-3', { xp: 500 }, 0.9, now);
  assert.ok(first);
  assert.equal(first.houseDay, localClock(now, homeZone('house-3')).day);
  assert.equal(houseTurn('house-3', first, 0.9, now), null);
});

test('whatever a player’s local day is, the boards for it are populated', () => {
  // Two days of hourly runs, ending Sunday evening in Bogotá / early Monday in London.
  const rows = [...simulate(new Date('2026-09-26T04:00:00Z'), 48).values()];
  for (const day of ['2026-09-27', '2026-09-28']) {
    const today = rows.filter((r) => r.dailyDate === day).length;
    assert.ok(today >= 10, `${day} has ${today} on Today`);
  }
  for (const week of ['2026-W39', '2026-W40']) {
    const onWeek = rows.filter((r) => r.weekKey === week).length;
    assert.ok(onWeek >= 10, `${week} has ${onWeek} on Week`);
  }
});

test('weekly XP builds up within a week and starts again on Monday', () => {
  const turn = houseTurn(
    'house-3',
    { xp: 500, weekKey: '2026-W39', weekXp: 300, houseDay: '2026-09-27' },
    0.9,
    lateInTheDay('house-3', '2026-09-29T00:30:00Z'),
  );
  assert.ok(turn);
  assert.equal(turn.weekKey, '2026-W40');
  assert.ok(turn.weekXp <= 300);
  assert.equal(turn.xp, 500 + turn.weekXp);
});

test('Daily scores sit where real players score', () => {
  assert.equal(dailyScoreFor(0.5, 0.5), 3450);
  assert.ok(dailyScoreFor(0, 0) >= 1200);
  assert.ok(dailyScoreFor(1, 1) <= 5600);
});
