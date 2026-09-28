/**
 * Keep the house players current on the Today and This week boards.
 *
 * House rows (`leaderboard/house-*`, `house: true`) are seeded by
 * scripts/seedGhostLeaderboard.ts. Their Daily and weekly stamps go stale at
 * midnight, so this job runs hourly and gives each row its turn once per
 * local day, on the row's own clock (see houseTurns.ts). Nothing here touches
 * real players' rows.
 */
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { onSchedule } from 'firebase-functions/v2/scheduler';

import { houseTurn } from './houseTurns';

export const refreshHouseBoards = onSchedule(
  { schedule: 'every 60 minutes', region: 'us-central1' },
  async () => {
    const db = getFirestore();
    const snap = await db.collection('leaderboard').where('house', '==', true).get();
    if (snap.empty) {
      logger.info('no house rows to refresh');
      return;
    }

    const now = new Date();
    const batch = db.batch();
    let turns = 0;
    snap.docs.forEach((doc, i) => {
      const turn = houseTurn(doc.id, doc.data(), 1 - i / snap.size, now);
      if (!turn) return;
      batch.set(doc.ref, turn, { merge: true });
      turns++;
    });
    if (turns > 0) await batch.commit();
    logger.info('house boards refreshed', { rows: snap.size, turns });
  },
);
