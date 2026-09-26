/**
 * Keep the house players current on the Today and This week boards.
 *
 * House rows (`leaderboard/house-*`, `house: true`) are seeded once by
 * scripts/seedGhostLeaderboard.ts. Their Daily and weekly stamps go stale at
 * midnight, so this job re-stamps a rotating subset of them each day with
 * plausible scores. Nothing here touches real players' rows.
 */
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { onSchedule } from 'firebase-functions/v2/scheduler';

/** Local calendar day as YYYY-MM-DD in the given IANA zone. */
function dayKey(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** ISO week as YYYY-Www for a YYYY-MM-DD day key. */
function weekKeyForDay(day: string): string {
  const [y = 1970, m = 1, d = 1] = day.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dow = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dow);
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((date.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${`${week}`.padStart(2, '0')}`;
}

/** Small deterministic hash so the same row rolls the same way on the same day. */
function roll(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

/** The app's players are mostly in the UK; the Daily rolls over on their midnight. */
const ZONE = 'Europe/London';

export const refreshHouseBoards = onSchedule(
  { schedule: 'every day 00:10', timeZone: ZONE, region: 'us-central1' },
  async () => {
    const db = getFirestore();
    const today = dayKey(new Date(), ZONE);
    const week = weekKeyForDay(today);
    const snap = await db.collection('leaderboard').where('house', '==', true).get();
    if (snap.empty) {
      logger.info('no house rows to refresh');
      return;
    }

    const batch = db.batch();
    let played = 0;
    snap.docs.forEach((doc, i) => {
      const xp = Number(doc.get('xp')) || 0;
      const r = roll(`${doc.id}:${today}`);
      const playsToday = r < 0.55;
      // Weekly XP accumulates through the week and resets on Monday.
      const sameWeek = doc.get('weekKey') === week;
      const priorWeek = sameWeek ? Number(doc.get('weekXp')) || 0 : 0;
      const gain = playsToday ? Math.round(40 + r * 260) : 0;
      const skill = 1 - i / snap.size;
      const dailyScore = Math.round((2600 + skill * 3200 + (r - 0.5) * 900) / 10) * 10;
      batch.set(
        doc.ref,
        {
          xp: xp + gain,
          weekKey: week,
          weekXp: priorWeek + gain,
          dailyDate: playsToday ? today : doc.get('dailyDate') ?? '',
          dailyScore: playsToday ? dailyScore : doc.get('dailyScore') ?? 0,
          updatedAt: Date.now(),
        },
        { merge: true },
      );
      if (playsToday) played++;
    });
    await batch.commit();
    logger.info('house boards refreshed', { rows: snap.size, playedToday: played, today, week });
  },
);
