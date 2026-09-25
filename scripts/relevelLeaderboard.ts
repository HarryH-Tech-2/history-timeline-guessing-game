/**
 * Recompute the stored `level` on every leaderboard row from its `xp` using
 * the current level curve. Needed once after a curve change: rows are written
 * by clients on their next sync, but inactive players would otherwise keep a
 * stale level on the public board. Idempotent; pass --dry-run to only report.
 *
 *   npx tsx scripts/relevelLeaderboard.ts [--dry-run]
 *
 * Needs GOOGLE_APPLICATION_CREDENTIALS and FIREBASE_PROJECT_ID from `.env`.
 */
import 'dotenv/config';
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

import { levelForXp } from '../src/domain/progression';

initializeApp({ credential: applicationDefault(), projectId: process.env.FIREBASE_PROJECT_ID });

const dryRun = process.argv.includes('--dry-run');

async function main() {
  const db = getFirestore();
  const rows = await db.collection('leaderboard').get();
  const histogram = new Map<number, number>();
  let changed = 0;
  let batch = db.batch();
  let pending = 0;

  for (const doc of rows.docs) {
    const xp = Number(doc.data().xp ?? 0);
    const level = levelForXp(xp);
    histogram.set(level, (histogram.get(level) ?? 0) + 1);
    if (Number(doc.data().level) === level) continue;
    changed += 1;
    if (dryRun) continue;
    batch.update(doc.ref, { level });
    pending += 1;
    if (pending === 400) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }
  if (!dryRun && pending > 0) await batch.commit();

  const spread = [...histogram.entries()].sort((a, b) => a[0] - b[0]);
  console.log(`${rows.size} rows, ${changed} ${dryRun ? 'would change' : 'updated'}.`);
  console.log('level histogram:', spread.map(([l, n]) => `L${l}×${n}`).join(' '));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
