import type { Category, Question } from '@/domain';

import {
  getCategories,
  getContentVersion,
  getQuestions,
  hydrateContent,
  resetContentToSeed,
  subscribeContent,
} from './index';

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

  it('merges remote content over the bundled seed, never dropping bundled categories', () => {
    const seedCount = getCategories().length;
    hydrateContent([REMOTE_CATEGORY], [REMOTE_QUESTION], ANY_ART);
    expect(getCategories()).toContainEqual(REMOTE_CATEGORY);
    expect(getCategories()).toHaveLength(seedCount + 1);
    // Bundled categories the remote catalogue has never heard of stay playable.
    expect(getCategories().map((c) => c.id)).toContain('sport');
    expect(getQuestions()).toContainEqual(REMOTE_QUESTION);
    expect(getQuestions().some((q) => q.categoryId === 'sport')).toBe(true);
  });

  it('lets a remote row override the bundled row with the same id', () => {
    const seeded = getQuestions()[0];
    if (!seeded) throw new Error('seed has no questions');
    const corrected = { ...seeded, title: 'Corrected title', year: seeded.year + 1 };
    const category = getCategories().find((c) => c.id === seeded.categoryId);
    if (!category) throw new Error('seed question has no category');
    hydrateContent([{ ...category, name: 'Renamed' }], [corrected]);
    expect(getQuestions().find((q) => q.id === seeded.id)).toEqual(corrected);
    expect(getCategories().find((c) => c.id === category.id)?.name).toBe('Renamed');
    expect(getQuestions().filter((q) => q.id === seeded.id)).toHaveLength(1);
  });

  it('notifies subscribers when the catalogue changes', () => {
    const seen: number[] = [];
    const unsubscribe = subscribeContent(() => seen.push(getContentVersion()));
    hydrateContent([REMOTE_CATEGORY], [REMOTE_QUESTION], ANY_ART);
    expect(seen).toHaveLength(1);
    unsubscribe();
    hydrateContent([REMOTE_CATEGORY], [REMOTE_QUESTION], ANY_ART);
    expect(seen).toHaveLength(1);
  });

  it('drops remote questions whose category is missing (referential integrity)', () => {
    hydrateContent([REMOTE_CATEGORY], [REMOTE_QUESTION, ORPHAN_QUESTION], ANY_ART);
    const ids = getQuestions().map((q) => q.id);
    expect(ids).toContain('remote-q');
    expect(ids).not.toContain('orphan-q');
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
    const ids = getQuestions().map((q) => q.id);
    expect(ids).toContain('has-art');
    expect(ids).not.toContain('no-art');
  });

  it('drops a remote-only category left with no playable questions', () => {
    const emptyCategory: Category = { ...REMOTE_CATEGORY, id: 'empty-cat', name: 'Empty' };
    const bare = { ...REMOTE_QUESTION, id: 'no-art', categoryId: 'empty-cat' };
    hydrateContent([REMOTE_CATEGORY, emptyCategory], [REMOTE_QUESTION, bare], {
      hasIllustration: (id) => id === 'remote-q',
    });
    const ids = getCategories().map((c) => c.id);
    expect(ids).toContain('remote-cat');
    expect(ids).not.toContain('empty-cat');
  });

  it('keeps the working catalogue when nothing remote has bundled art', () => {
    const before = getQuestions();
    hydrateContent([REMOTE_CATEGORY], [REMOTE_QUESTION], { hasIllustration: () => false });
    expect(getQuestions()).toEqual(before);
    expect(getCategories().map((c) => c.id)).not.toContain('remote-cat');
  });

  it('checks the bundled images by default', () => {
    const seeded = getQuestions()[0];
    if (!seeded) throw new Error('seed has no questions');
    const remoteSeeded = { ...seeded, categoryId: 'remote-cat' };
    hydrateContent([REMOTE_CATEGORY], [remoteSeeded, REMOTE_QUESTION]);
    const ids = getQuestions().map((q) => q.id);
    expect(ids).not.toContain('remote-q'); // no bundled art
    expect(getQuestions().find((q) => q.id === seeded.id)?.categoryId).toBe('remote-cat');
  });

  it('resets back to the bundled seed', () => {
    hydrateContent([REMOTE_CATEGORY], [REMOTE_QUESTION], ANY_ART);
    resetContentToSeed();
    expect(getCategories().length).toBeGreaterThan(1);
    expect(getQuestions().length).toBeGreaterThan(10);
  });
});
