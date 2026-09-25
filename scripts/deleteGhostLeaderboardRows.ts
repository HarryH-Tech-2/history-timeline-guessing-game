/**
 * Remove "ghost" leaderboard rows: copies of a signed-in player's entry that the
 * pre-fix app published under a fresh guest uid on sign-out (see
 * ProgressionProvider's `loadedUid` comment). A row is a ghost when it shares a
 * display name and XP with a Google-backed row but its own uid has no Google
 * provider. Run with `npx tsx scripts/deleteGhostLeaderboardRows.ts [--dry-run]`.
 * Needs GOOGLE_APPLICATION_CREDENTIALS and FIREBASE_PROJECT_ID from `.env`.
 */
import 'dotenv/config';
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

import { MIN_LEADERBOARD_XP } from '../src/features/leaderboard/types';

initializeApp({ credential: applicationDefault(), projectId: process.env.FIREBASE_PROJECT_ID });

const dryRun = process.argv.includes('--dry-run');

async function main() {
  const db = getFirestore();
  const auth = getAuth();
  const rows = await db.collection('leaderboard').get();

  const isGoogle = new Map<string, boolean>();
  for (const d of rows.docs) {
    const u = await auth.getUser(d.id).catch(() => null);
    isGoogle.set(d.id, u?.providerData.some((p) => p.providerId === 'google.com') ?? false);
  }

  const real = rows.docs.filter((d) => isGoogle.get(d.id));
  // Ghosts only exist above the publish threshold; below it, a shared name is
  // just two guests whose generated handles collided.
  const ghosts = rows.docs.filter(
    (d) =>
      !isGoogle.get(d.id) &&
      d.get('xp') >= MIN_LEADERBOARD_XP &&
      real.some((r) => r.get('displayName') === d.get('displayName') && r.get('xp') === d.get('xp')),
  );

  console.log(`${rows.size} rows, ${real.length} Google-backed, ${ghosts.length} ghost(s)`);
  for (const g of ghosts) console.log(`  ghost: ${g.get('displayName')} xp ${g.get('xp')}`);
  if (dryRun || ghosts.length === 0) return;
  for (const g of ghosts) await g.ref.delete();
  console.log(`deleted ${ghosts.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
