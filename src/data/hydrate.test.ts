import type { Category, Question } from '@/domain';

import { getCategories, getQuestions, hydrateContent, resetContentToSeed } from './index';

const REMOTE_CATEGORY: Category = {
  id: 'remote-cat',
  name: 'Remote Category',
  icon: 'flag',
  colour: '#123456',
  description: 'From the backend.',
  difficulty: 'medium',
  active: true,
  premiumOnly: false,
  displayOrder: 0,
};

const REMOTE_QUESTION: Question = {
  id: 'remote-q',
  categoryId: 'remote-cat',
  title: 'Remote question',
  subtitle: '',
  year: 2000,
  difficulty: 'medium',
  country: 'Nowhere',
  region: 'Somewhere',
  latitude: 0,
  longitude: 0,
  shortDescription: 'short',
  longDescription: 'long',
  tags: [],
  verified: true,
  featured: false,
};

const ORPHAN_QUESTION: Question = {
  ...REMOTE_QUESTION,
  id: 'orphan-q',
  categoryId: 'does-not-exist',
};

describe('hydrateContent', () => {
  afterEach(() => resetContentToSeed());

  it('swaps the active catalogue to the hydrated content', () => {
    hydrateContent([REMOTE_CATEGORY], [REMOTE_QUESTION]);
    expect(getCategories()).toEqual([REMOTE_CATEGORY]);
    expect(getQuestions()).toEqual([REMOTE_QUESTION]);
  });

  it('drops questions whose category is missing (referential integrity)', () => {
    hydrateContent([REMOTE_CATEGORY], [REMOTE_QUESTION, ORPHAN_QUESTION]);
    expect(getQuestions().map((q) => q.id)).toEqual(['remote-q']);
  });

  it('ignores an empty payload rather than wiping working content', () => {
    const before = getQuestions();
    hydrateContent([], []);
    expect(getQuestions()).toBe(before);
    hydrateContent([REMOTE_CATEGORY], []);
    expect(getQuestions()).toBe(before);
  });

  it('resets back to the bundled seed', () => {
    hydrateContent([REMOTE_CATEGORY], [REMOTE_QUESTION]);
    resetContentToSeed();
    expect(getCategories().length).toBeGreaterThan(1);
    expect(getQuestions().length).toBeGreaterThan(10);
  });
});
