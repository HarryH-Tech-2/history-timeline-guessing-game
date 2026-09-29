/**
 * Writes functions/src/social/catalogue.json: every bundled question's year and
 * whether it is in rotation (Daily/campaign main-path pool; see src/data/rotation.ts). The Social functions score
 * challenge entries against it, so the server never trusts client scores and
 * doesn't depend on Firestore content. Run before every functions deploy
 * (firebase.json predeploy) and commit the output.
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';

import { QUESTIONS } from '../src/data/questions';
import { OUT_OF_ROTATION_IDS } from '../src/data/rotation';

const catalogue: Record<string, { year: number; inRotation: boolean }> = {};
for (const q of QUESTIONS) catalogue[q.id] = { year: q.year, inRotation: !OUT_OF_ROTATION_IDS.has(q.id) };

const out = path.join(__dirname, '..', 'functions', 'src', 'social', 'catalogue.json');
writeFileSync(out, `${JSON.stringify(catalogue, null, 1)}\n`);
console.log(`Wrote ${Object.keys(catalogue).length} questions to ${out}`);
