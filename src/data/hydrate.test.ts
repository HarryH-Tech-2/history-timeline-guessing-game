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

/** Test doubles carry no bundled art, so most cases opt out of the art guard. */
const ANY_ART = { hasIllustration: () => true };

describe('hydrateContent', () => {
  afterEach(() => resetContentToSeed());

  it('swaps the active catalogue to the hydrated content', () => {
    hydrateContent([REMOTE_CATEGORY], [REMOTE_QUESTION], ANY_ART);
    expect(getCategories()).toEqual([REMOTE_CATEGORY]);
    expect(getQuestions()).toEqual([REMOTE_QUESTION]);
  });

  it('drops questions whose category is missing (referential integrity)', () => {
    hydrateContent([REMOTE_CATEGORY], [REMOTE_QUESTION, ORPHAN_QUESTION], ANY_ART);
    expect(getQuestions().map((q) => q.id)).toEqual(['remote-q']);
  });

  it('ignores an empty payload rather than wiping working content', () => {
    const before = getQuestions();
    hydrateContent([], [], ANY_ART);
    expect(getQuestions()).toBe(before);
    hydrateContent([REMOTE_CATEGORY], [], ANY_ART);
    expect(getQuestions()).toBe(before);
  });

  it('drops remote questions whose illustration is not bundled in this build', () => {
    const illustrated = { ...REMOTE_QUESTION, id: 'has-art' };
    const bare = { ...REMOTE_QUESTION, id: 'no-art' };
    hydrateContent([REMOTE_CATEGORY], [illustrated, bare], {
      hasIllustration: (id) => id === 'has-art',
    });
    expect(getQuestions().map((q) => q.id)).toEqual(['has-art']);
  });

  it('drops a category left with no playable questions', () => {
    const emptyCategory: Category = { ...REMOTE_CATEGORY, id: 'empty-cat', name: 'Empty' };
    const bare = { ...REMOTE_QUESTION, id: 'no-art', categoryId: 'empty-cat' };
    hydrateContent([REMOTE_CATEGORY, emptyCategory], [REMOTE_QUESTION, bare], {
      hasIllustration: (id) => id === 'remote-q',
    });
    expect(getCategories().map((c) => c.id)).toEqual(['remote-cat']);
  });

  it('keeps the working catalogue when nothing remote has bundled art', () => {
    const before = getQuestions();
    hydrateContent([REMOTE_CATEGORY], [REMOTE_QUESTION], { hasIllustration: () => false });
    expect(getQuestions()).toBe(before);
  });

  it('checks the bundled images by default', () => {
    const seeded = getQuestions()[0];
    if (!seeded) throw new Error('seed has no questions');
    const remoteSeeded = { ...seeded, categoryId: 'remote-cat' };
    hydrateContent([REMOTE_CATEGORY], [remoteSeeded, REMOTE_QUESTION]);
    expect(getQuestions().map((q) => q.id)).toEqual([seeded.id]);
  });

  it('resets back to the bundled seed', () => {
    hydrateContent([REMOTE_CATEGORY], [REMOTE_QUESTION], ANY_ART);
    resetContentToSeed();
    expect(getCategories().length).toBeGreaterThan(1);
    expect(getQuestions().length).toBeGreaterThan(10);
  });
});
