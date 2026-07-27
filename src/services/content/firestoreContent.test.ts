import {
  COLLECTIONS,
  createFirestoreContentRepository,
  type FirestoreReader,
} from './firestoreContent';

const VALID_CATEGORY = {
  id: 'events',
  name: 'Historic Events',
  icon: 'flag',
  colour: '#5B8CFF',
  description: 'Turning points.',
  difficulty: 'easy',
  active: true,
  premiumOnly: false,
  displayOrder: 0,
};

const VALID_QUESTION = {
  id: 'evt-1',
  categoryId: 'events',
  title: 'A thing happened',
  subtitle: '',
  year: 1969,
  difficulty: 'easy',
  country: 'United States',
  region: 'The Moon',
  latitude: 0.67,
  longitude: 23.47,
  shortDescription: 'short',
  longDescription: 'long',
  tags: ['space'],
  verified: true,
  featured: true,
};

/** A reader that returns whatever rows are configured per collection. */
function fakeReader(rows: Record<string, readonly unknown[]>): FirestoreReader {
  return { readCollection: (name) => Promise.resolve(rows[name] ?? []) };
}

describe('createFirestoreContentRepository', () => {
  it('maps valid documents to domain objects', async () => {
    const repo = createFirestoreContentRepository(
      fakeReader({
        [COLLECTIONS.categories]: [VALID_CATEGORY],
        [COLLECTIONS.questions]: [VALID_QUESTION],
      }),
    );

    expect(await repo.fetchCategories()).toEqual([VALID_CATEGORY]);
    expect(await repo.fetchQuestions()).toEqual([VALID_QUESTION]);
  });

  it('drops malformed documents instead of throwing', async () => {
    const repo = createFirestoreContentRepository(
      fakeReader({
        [COLLECTIONS.categories]: [
          VALID_CATEGORY,
          { id: 'broken', colour: 'not-a-hex' }, // fails schema
          null,
          42,
        ],
        [COLLECTIONS.questions]: [
          VALID_QUESTION,
          { id: 'broken', year: 'nineteen' }, // fails schema
        ],
      }),
    );

    expect(await repo.fetchCategories()).toEqual([VALID_CATEGORY]);
    expect(await repo.fetchQuestions()).toEqual([VALID_QUESTION]);
  });

  it('returns an empty array for an empty collection', async () => {
    const repo = createFirestoreContentRepository(fakeReader({}));
    expect(await repo.fetchCategories()).toEqual([]);
    expect(await repo.fetchQuestions()).toEqual([]);
  });
});
