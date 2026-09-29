import { getQuestions, isInRotation } from '@/data';
import { scoreForError as appScore } from '@/features/timeline/math/scoring';

import catalogue from '../../../functions/src/social/catalogue.json';
import { scoreForError as serverScore } from '../../../functions/src/social/scoring';

const rows = catalogue as Record<string, { year: number; inRotation: boolean }>;

describe('server scoring and catalogue stay in step with the app', () => {
  it('scores every error from 0 to 150 years identically', () => {
    for (let e = 0; e <= 150; e += 1) expect(serverScore(e)).toBe(appScore(e));
  });

  it('has every bundled question at the same year (re-run npm run export:catalogue if not)', () => {
    for (const q of getQuestions()) expect(rows[q.id]?.year).toBe(q.year);
  });

  it('flags rotation exactly as the app does (re-run npm run export:catalogue if not)', () => {
    for (const q of getQuestions()) expect(rows[q.id]?.inRotation).toBe(isInRotation(q));
  });
});
