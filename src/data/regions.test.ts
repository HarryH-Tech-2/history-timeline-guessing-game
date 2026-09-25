import {
  getQuestionsByCategory,
  getRegionalQuestions,
  REGIONAL_CATEGORY_ID,
  regionById,
  REGIONS,
} from './index';

describe('regions', () => {
  it('defines six pickable regions with unique ids and tags', () => {
    expect(REGIONS.map((r) => r.id)).toEqual([
      'europe',
      'asia',
      'africa',
      'north-america',
      'south-america',
      'oceania',
    ]);
    expect(new Set(REGIONS.map((r) => r.tag)).size).toBe(REGIONS.length);
  });

  it('gives every region enough Regional questions for a full run', () => {
    for (const region of REGIONS) {
      expect(getRegionalQuestions(region.id).length).toBeGreaterThanOrEqual(5);
    }
  });

  it('only draws from the Regional category, filtered by the region tag', () => {
    for (const region of REGIONS) {
      for (const q of getRegionalQuestions(region.id)) {
        expect(q.categoryId).toBe(REGIONAL_CATEGORY_ID);
        expect(q.tags).toContain(region.tag);
      }
    }
  });

  it('assigns every Regional question to exactly one region', () => {
    const tags = new Set(REGIONS.map((r) => r.tag));
    for (const q of getQuestionsByCategory(REGIONAL_CATEGORY_ID)) {
      const hits = q.tags.filter((t) => tags.has(t));
      expect({ id: q.id, hits }).toEqual({ id: q.id, hits: [hits[0]] });
    }
  });

  it('returns nothing for an unknown region', () => {
    expect(regionById('atlantis')).toBeUndefined();
    expect(getRegionalQuestions('atlantis')).toEqual([]);
  });
});
