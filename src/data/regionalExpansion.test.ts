import { CAMPAIGN } from '@/features/modes/campaign/campaignMap';

import { getDailyQuestions, getQuestions, getRegionalQuestions, isInRotation, REGIONS } from './index';
import { imageForQuestion } from './questionImages';
import { REGIONAL_EXPANSION } from './packs/regionalExpansion';

const expansionIds = new Set(REGIONAL_EXPANSION.map((q) => q.id));

describe('Regional expansion', () => {
  // Europe is one short: the Battle of Kosovo was pulled (2026-09-29).
  const expected = (tag: string) => (tag === 'europe' ? 13 : 14);

  it('brings every region to twenty questions (Europe nineteen)', () => {
    for (const region of REGIONS) {
      expect(getRegionalQuestions(region.id)).toHaveLength(expected(region.tag) + 6);
    }
  });

  it('adds fourteen questions per region (Europe thirteen), each with exactly one region tag', () => {
    const regionTags = new Set(REGIONS.map((r) => r.tag));
    for (const region of REGIONS) {
      const own = REGIONAL_EXPANSION.filter((q) => q.tags.includes(region.tag));
      expect(own).toHaveLength(expected(region.tag));
    }
    for (const question of REGIONAL_EXPANSION) {
      expect(question.categoryId).toBe('regional');
      expect(question.tags.filter((t) => regionTags.has(t))).toHaveLength(1);
    }
  });

  it('keeps titles unique across the whole catalogue', () => {
    const titles = getQuestions().map((q) => q.title.toLowerCase());
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('gives every question in the catalogue a bundled illustration', () => {
    const missing = getQuestions().filter((q) => imageForQuestion(q.id) === undefined);
    expect(missing.map((q) => q.id)).toEqual([]);
  });

  it('only uses firm, on-timeline years', () => {
    for (const question of REGIONAL_EXPANSION) {
      expect(question.year).not.toBe(0);
      expect(question.year).toBeGreaterThanOrEqual(-999);
      expect(question.year).toBeLessThanOrEqual(2025);
      if (question.day !== undefined) expect(question.month).toBeDefined();
    }
  });
});

describe('Rotation (Daily and campaign) is unchanged by the expansion', () => {
  it('never deals an expansion question in the Daily', () => {
    const start = new Date(2026, 0, 1);
    for (let i = 0; i < 400; i += 1) {
      const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const key = `${day.getFullYear()}-${`${day.getMonth() + 1}`.padStart(2, '0')}-${`${day.getDate()}`.padStart(2, '0')}`;
      for (const q of getDailyQuestions(key)) expect(expansionIds.has(q.id)).toBe(false);
    }
  });

  // Recorded from the build before the expansion: the same dates must keep
  // dealing the same Dailies, so old and new builds agree on the leaderboard.
  it.each([
    [
      '2026-09-29',
      ['phi-on-liberty', 'trt-munich-agreement', 'tec-heart-transplant', 'exp-vasco-da-gama', 'tec-gunpowder-formula', 'art-snow-white', 'bat-yorktown', 'ppl-davinci'],
    ],
    [
      '2026-12-25',
      ['tec-dna-double-helix', 'spc-leonov-spacewalk', 'trt-munich-agreement', 'art-taj-mahal', 'art-thriller', 'bat-midway', 'trt-paris-climate', 'evt-vesuvius'],
    ],
    [
      '2027-03-01',
      ['trt-utrecht', 'art-starry-night', 'ppl-marcus-aurelius', 'evt-boston-tea-party', 'evt-hijra', 'trd-jiaozi', 'reg-granada-falls', 'spc-curiosity'],
    ],
  ])('keeps the %s Daily exactly as before', (date, ids) => {
    expect(getDailyQuestions(date).map((q) => q.id)).toEqual(ids);
  });

  it('keeps the campaign free of expansion questions, with the same stage counts', () => {
    const inCampaign = CAMPAIGN.flatMap((w) => w.stages.flatMap((s) => s.questionIds));
    expect(inCampaign.some((id) => expansionIds.has(id))).toBe(false);
    expect(CAMPAIGN.map((w) => w.stages.length)).toEqual([6, 9, 12, 12, 24]);
  });

  it('keeps the original questions in rotation', () => {
    expect(getQuestions().filter(isInRotation)).toHaveLength(getQuestions().length - 83);
  });
});
