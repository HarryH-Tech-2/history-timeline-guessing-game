import { allStages, CAMPAIGN } from './campaignMap';
import pinned from './__fixtures__/mainPath.json';

/**
 * Progress is keyed by stage id and stages are positional, so a main-path
 * stage must never change id, order or questions. Recorded 2026-09-29 before
 * route forks existed. NEVER re-record this file.
 */
describe('campaign main path', () => {
  it('keeps every main-path stage id and its questions exactly as shipped', () => {
    expect(allStages().map((s) => ({ id: s.id, questionIds: [...s.questionIds] }))).toEqual(pinned);
  });

  it('keeps the era stage counts', () => {
    expect(CAMPAIGN.map((w) => w.stages.length)).toEqual([6, 9, 12, 12, 24]);
  });
});
