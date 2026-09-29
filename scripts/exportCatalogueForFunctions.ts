/**
 * Writes functions/src/social/catalogue.json: every bundled question's year and
 * whether it is in rotation (Daily/campaign pool). The Social functions score
 * challenge entries against it, so the server never trusts client scores and
 * doesn't depend on Firestore content. Run before every functions deploy
 * (firebase.json predeploy) and commit the output.
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';

import { REGIONAL_EXPANSION } from '../src/data/packs/regionalExpansion';
import { QUESTIONS } from '../src/data/questions';

const outOfRotation = new Set(REGIONAL_EXPANSION.map((q) => q.id));
const catalogue: Record<string, { year: number; inRotation: boolean }> = {};
for (const q of QUESTIONS) catalogue[q.id] = { year: q.year, inRotation: !outOfRotation.has(q.id) };

const out = path.join(__dirname, '..', 'functions', 'src', 'social', 'catalogue.json');
writeFileSync(out, `${JSON.stringify(catalogue, null, 1)}\n`);
console.log(`Wrote ${Object.keys(catalogue).length} questions to ${out}`);
