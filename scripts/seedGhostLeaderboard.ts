/**
 * Seed the leaderboard with house players so the boards never look empty.
 *
 * Every seeded row is marked `house: true` and keyed `house-<n>`, so it can be
 * told apart from a real player and removed in one go. Rows are written with
 * the Admin SDK (rules don't apply). The daily/weekly stamps make the rows
 * show on the Today and This week boards as well; run the script again (or
 * let the scheduled Cloud Function `refreshHouseBoards` do it) to keep them
 * current — a stale stamp just drops them from those two boards.
 *
 *   npx tsx scripts/seedGhostLeaderboard.ts [--count 40] [--max-xp 6000] [--dry-run]
 *   npx tsx scripts/seedGhostLeaderboard.ts --purge          # remove every house row
 *
 * Needs GOOGLE_APPLICATION_CREDENTIALS and FIREBASE_PROJECT_ID from `.env`.
 */
import 'dotenv/config';
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

import { levelForXp } from '../src/domain/progression';
import { HOUSE_PREFIX, houseRows } from '../src/features/leaderboard/houseRows';
import { dateKey, weekKey } from '../src/utils/date';

initializeApp({ credential: applicationDefault(), projectId: process.env.FIREBASE_PROJECT_ID });

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`);
  const v = i >= 0 ? Number(process.argv[i + 1]) : NaN;
  return Number.isFinite(v) ? v : fallback;
}

async function main() {
  const db = getFirestore();
  const col = db.collection('leaderboard');
  const dryRun = process.argv.includes('--dry-run');

  if (process.argv.includes('--purge')) {
    const snap = await col.where('house', '==', true).get();
    console.log(`${snap.size} house row(s)`);
    if (dryRun) return;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    console.log(`removed ${snap.size}`);
    return;
  }

  const count = arg('count', 40);
  const maxXp = arg('max-xp', 6000);
  const rows = houseRows({ count, maxXp, today: dateKey(), week: weekKey(), now: Date.now() });

  console.log(`${rows.length} house rows → xp ${rows.at(-1)?.xp}…${rows[0]?.xp}`);
  for (const r of rows.slice(0, 5)) {
    console.log(
      `  ${r.displayName.padEnd(22)} xp ${String(r.xp).padStart(5)} L${levelForXp(r.xp)}  week ${r.weekXp}  daily ${r.dailyScore}`,
    );
  }
  if (dryRun) return;

  const batch = db.batch();
  rows.forEach((row, i) => {
    batch.set(col.doc(`${HOUSE_PREFIX}${i + 1}`), row, { merge: true });
  });
  await batch.commit();
  console.log(`wrote ${rows.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
