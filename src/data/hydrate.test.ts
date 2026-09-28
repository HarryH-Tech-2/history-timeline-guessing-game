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

/** A bundled question and its category, to correct from the remote side. */
function seeded() {
  const question = getQuestions()[0];
  if (!question) throw new Error('seed has no questions');
  const category = getCategories().find((c) => c.id === question.categoryId);
  if (!category) throw new Error('seed question has no category');
  return { question, category };
}

describe('hydrateContent', () => {
  afterEach(() => resetContentToSeed());

  it('lets a remote row correct the bundled row with the same id', () => {
    const { question, category } = seeded();
    const corrected = { ...question, title: 'Corrected title', year: question.year + 1 };
    hydrateContent([{ ...category, name: 'Renamed' }], [corrected]);
    expect(getQuestions().find((q) => q.id === question.id)).toEqual(corrected);
    expect(getCategories().find((c) => c.id === category.id)?.name).toBe('Renamed');
    expect(getQuestions().filter((q) => q.id === question.id)).toHaveLength(1);
  });

  it('ignores categories and questions this build does not bundle', () => {
    const { question, category } = seeded();
    const before = { categories: getCategories().length, questions: getQuestions().length };
    hydrateContent([category, REMOTE_CATEGORY], [question, REMOTE_QUESTION]);
    expect(getCategories().map((c) => c.id)).not.toContain('remote-cat');
    expect(getQuestions().map((q) => q.id)).not.toContain('remote-q');
    expect(getCategories()).toHaveLength(before.categories);
    expect(getQuestions()).toHaveLength(before.questions);
  });

  it('keeps a question in its bundled category, with its bundled tags', () => {
    // An old backend copy still files some questions under a category the app
    // has dropped, and lacks the region tags the Regional picker reads.
    const { question, category } = seeded();
    hydrateContent(
      [category, REMOTE_CATEGORY],
      [{ ...question, categoryId: 'remote-cat', tags: ['stale'], title: 'Corrected' }],
    );
    const merged = getQuestions().find((q) => q.id === question.id);
    expect(merged?.categoryId).toBe(question.categoryId);
    expect(merged?.tags).toEqual(question.tags);
    expect(merged?.title).toBe('Corrected');
  });

  it('keeps a category behind its bundled paywall flag and in its bundled place', () => {
    const { question, category } = seeded();
    hydrateContent(
      [
        {
          ...category,
          premiumOnly: !category.premiumOnly,
          displayOrder: category.displayOrder + 5,
          description: 'New blurb',
        },
      ],
      [question],
    );
    const merged = getCategories().find((c) => c.id === category.id);
    expect(merged?.premiumOnly).toBe(category.premiumOnly);
    expect(merged?.displayOrder).toBe(category.displayOrder);
    expect(merged?.description).toBe('New blurb');
  });

  it('never drops a bundled category the remote catalogue has not heard of', () => {
    const { question, category } = seeded();
    hydrateContent([category], [question]);
    expect(getCategories().map((c) => c.id)).toContain('sport');
    expect(getQuestions().some((q) => q.categoryId === 'sport')).toBe(true);
  });

  it('notifies subscribers when the catalogue changes', () => {
    const seen: number[] = [];
    const unsubscribe = subscribeContent(() => seen.push(getContentVersion()));
    hydrateContent([REMOTE_CATEGORY], [REMOTE_QUESTION]);
    expect(seen).toHaveLength(1);
    unsubscribe();
    hydrateContent([REMOTE_CATEGORY], [REMOTE_QUESTION]);
    expect(seen).toHaveLength(1);
  });

  it('ignores an empty payload rather than wiping working content', () => {
    const before = getQuestions();
    hydrateContent([], []);
    expect(getQuestions()).toBe(before);
    hydrateContent([REMOTE_CATEGORY], []);
    expect(getQuestions()).toBe(before);
  });

  it('resets back to the bundled seed', () => {
    const { question, category } = seeded();
    hydrateContent([category], [{ ...question, title: 'Corrected' }]);
    resetContentToSeed();
    expect(getQuestions().find((q) => q.id === question.id)?.title).toBe(question.title);
  });
});
