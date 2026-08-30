/**
 * Uploads the local seed dataset (categories + questions) to Firestore using
 * the Firebase Admin SDK.
 *
 * Usage:
 *   1. Create a service-account key in the Firebase console
 *      (Project settings -> Service accounts -> Generate new private key).
 *   2. In `.env`, set:
 *        GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json
 *        FIREBASE_PROJECT_ID=your-project-id
 *   3. Run: npm run seed:firestore
 *
 * The document id is the entity's own `id`, so re-running is idempotent: it
 * upserts existing docs rather than creating duplicates. Content is validated
 * against the domain schemas before upload, so a malformed seed fails here
 * instead of shipping bad data to the backend.
 *
 * This is a server-side tool. It intentionally reads the raw seed arrays
 * directly (not via the app's `@/` aliases) so it runs cleanly under tsx.
 */
import 'dotenv/config';

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { z } from 'zod';

import { CATEGORIES } from '../src/data/categories';
import { QUESTIONS } from '../src/data/questions';
import { CategorySchema, QuestionSchema } from '../src/domain';

const MAX_BATCH = 400; // Firestore caps a batch at 500 writes; stay well under.

const categories = z.array(CategorySchema).parse(CATEGORIES);
const questions = z.array(QuestionSchema).parse(QUESTIONS);

const projectId = process.env.FIREBASE_PROJECT_ID;
if (!projectId) {
  throw new Error('FIREBASE_PROJECT_ID is not set. See .env.example.');
}

initializeApp({ credential: applicationDefault(), projectId });

const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

async function seedCollection(
  name: string,
  items: readonly { id: string }[],
): Promise<number> {
  let batch = db.batch();
  let pending = 0;

  for (const item of items) {
    batch.set(db.collection(name).doc(item.id), item);
    pending += 1;
    if (pending === MAX_BATCH) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }

  if (pending > 0) await batch.commit();
  return items.length;
}

/**
 * Remove documents no longer present in the local seed (e.g. questions culled
 * because their dates are uncertain), so the deployed catalogue never keeps
 * serving content the app has dropped.
 */
async function deleteStale(
  name: string,
  items: readonly { id: string }[],
): Promise<number> {
  const keep = new Set(items.map((item) => item.id));
  const snapshot = await db.collection(name).get();
  let batch = db.batch();
  let pending = 0;
  let removed = 0;

  for (const doc of snapshot.docs) {
    if (keep.has(doc.id)) continue;
    batch.delete(doc.ref);
    pending += 1;
    removed += 1;
    if (pending === MAX_BATCH) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }

  if (pending > 0) await batch.commit();
  return removed;
}

async function main(): Promise<void> {
  console.log(`Seeding Firestore project "${projectId}"...`);
  const categoryCount = await seedCollection('categories', categories);
  const questionCount = await seedCollection('questions', questions);
  const staleCategories = await deleteStale('categories', categories);
  const staleQuestions = await deleteStale('questions', questions);
  console.log(`Done. Uploaded ${categoryCount} categories and ${questionCount} questions.`);
  console.log(
    `Removed ${staleCategories} stale categories and ${staleQuestions} stale questions.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
