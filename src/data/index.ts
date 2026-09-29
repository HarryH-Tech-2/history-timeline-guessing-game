import { z } from 'zod';

import { CategorySchema, QuestionSchema, type Category, type Question } from '@/domain';
import { pickDeterministic, seedFromString } from '@/utils/rng';

import { CATEGORIES } from './categories';
import { REGIONAL_EXPANSION } from './packs/regionalExpansion';
import { QUESTIONS } from './questions';
import { REGION_RUN_LENGTH, REGIONAL_CATEGORY_ID, regionById, REGIONS, type Region } from './regions';
import { TOPICS, type Topic } from './topics';

export { QUESTION_IMAGES, imageForQuestion } from './questionImages';

/**
 * Validate the local seed at module load. Bad data fails loudly and early
 * rather than corrupting a round. The seed is the app's offline default and
 * permanent fallback: it must always be valid, so a malformed entry throws here.
 */
const seedCategories: readonly Category[] = z.array(CategorySchema).parse(CATEGORIES);
const seedQuestions: readonly Question[] = z.array(QuestionSchema).parse(QUESTIONS);

const seedCategoryIds = new Set(seedCategories.map((c) => c.id));
for (const q of seedQuestions) {
  if (!seedCategoryIds.has(q.categoryId)) {
    throw new Error(`Question "${q.id}" references unknown category "${q.categoryId}"`);
  }
}

/**
 * The content the game currently reads from. Starts as the local seed so the
 * app is playable instantly and offline; `hydrateContent` swaps in remote
 * content (from Firestore) once it arrives, without any consumer changes — the
 * getters below are the single source of truth for the rest of the app.
 */
let activeCategories: readonly Category[] = seedCategories;
let activeQuestions: readonly Question[] = seedQuestions;

/**
 * Consumers that render the catalogue subscribe here so a remote refresh
 * landing after first paint re-renders them (otherwise Home could still show
 * a category the lookup no longer knows).
 */
type ContentListener = () => void;
const listeners = new Set<ContentListener>();
let contentVersion = 0;

export function subscribeContent(listener: ContentListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getContentVersion(): number {
  return contentVersion;
}

function publishContent(): void {
  contentVersion += 1;
  listeners.forEach((l) => l());
}

/**
 * Apply remote corrections to the bundled seed. The seed is the catalogue:
 * what this build ships art for, how it is grouped and what is behind the
 * paywall. The remote copy can only fix what a bundled row says. Rules:
 *  - a remote row is used only when its id is bundled; categories and
 *    questions this build has never heard of are ignored, so a category the
 *    app has since dropped can't come back from an old backend copy;
 *  - a question keeps its bundled category and tags (the Regional picker reads
 *    the tags), a category its bundled paywall flag and position; everything
 *    else (titles, years, descriptions, `active`) follows the remote row.
 * An empty payload is ignored, so a failed fetch never changes anything.
 */
export function hydrateContent(
  categories: readonly Category[],
  questions: readonly Question[],
): void {
  if (categories.length === 0 || questions.length === 0) return;

  const remoteCategories = new Map(categories.map((c) => [c.id, c] as const));
  const remoteQuestions = new Map(questions.map((q) => [q.id, q] as const));

  activeCategories = seedCategories.map((seed) => {
    const remote = remoteCategories.get(seed.id);
    if (!remote) return seed;
    return { ...remote, premiumOnly: seed.premiumOnly, displayOrder: seed.displayOrder };
  });
  activeQuestions = seedQuestions.map((seed) => {
    const remote = remoteQuestions.get(seed.id);
    if (!remote) return seed;
    return { ...remote, categoryId: seed.categoryId, tags: seed.tags };
  });
  publishContent();
}

/** Reset the active content back to the bundled seed (used by tests). */
export function resetContentToSeed(): void {
  activeCategories = seedCategories;
  activeQuestions = seedQuestions;
  publishContent();
}

export function getCategories(): readonly Category[] {
  return activeCategories;
}

export function getQuestions(): readonly Question[] {
  return activeQuestions;
}

export function getQuestionsByCategory(categoryId: string): readonly Question[] {
  return activeQuestions.filter((q) => q.categoryId === categoryId);
}

export function getCategoryById(categoryId: string): Category | undefined {
  return activeCategories.find((c) => c.id === categoryId);
}

export function getQuestionById(questionId: string): Question | undefined {
  return activeQuestions.find((q) => q.id === questionId);
}

/* ------------------------------------------------------------------------ */
/* Premium                                                                   */
/* ------------------------------------------------------------------------ */

/**
 * True when the category is behind the paywall. Premium gates playing such a
 * category on its own (the Category practice run); it does not thin the
 * pools below — every mode draws on every category, so a free player still
 * meets Arts or Philosophy questions in the Daily, Campaign, Survival and
 * topic runs (user decision 2026-09-03).
 */
export function isPremiumCategory(categoryId: string): boolean {
  return getCategoryById(categoryId)?.premiumOnly === true;
}

/**
 * The fixed set of questions for a given day. Seeded purely from the date key
 * (`YYYY-MM-DD`), so every player and every device sees the same run — and the
 * same day always reproduces it.
 */
export function getDailyQuestions(dateKey: string, count = 8): readonly Question[] {
  return pickDeterministic(
    activeQuestions.filter(isInRotation),
    count,
    seedFromString(`daily-${dateKey}`),
  );
}

/** Ids of packs that are played only in their own category. */
const OUT_OF_ROTATION = new Set(REGIONAL_EXPANSION.map((q) => q.id));

/**
 * Whether a question takes part in the shared, seeded modes (the Daily and the
 * campaign). The Regional expansion does not: the Daily is seeded over the
 * whole pool and the campaign slices it into stages, so adding questions there
 * would give old and new builds different Dailies on the same day and move
 * questions between stages players have already starred.
 */
export function isInRotation(question: Question): boolean {
  return !OUT_OF_ROTATION.has(question.id);
}

/** Pick a random question, optionally excluding ids already seen this session. */
export function getRandomQuestion(excludeIds: ReadonlySet<string> = new Set()): Question {
  const pool = activeQuestions.filter((q) => !excludeIds.has(q.id));
  const source = pool.length > 0 ? pool : activeQuestions;
  const index = Math.floor(Math.random() * source.length);
  const picked = source[index];
  if (!picked) throw new Error('No questions available in the seed dataset');
  return picked;
}

/* ------------------------------------------------------------------------ */
/* Regions                                                                   */
/* ------------------------------------------------------------------------ */

export { REGION_RUN_LENGTH, REGIONAL_CATEGORY_ID, REGIONS, regionById };
export type { Region };

/**
 * The Regional category's questions for one region: those tagged with the
 * region's tag. Unknown regions yield an empty pool rather than throwing, so a
 * stale deep link can't wedge the screen.
 */
export function getRegionalQuestions(regionId: string): readonly Question[] {
  const region = regionById(regionId);
  if (!region) return [];
  return activeQuestions.filter(
    (q) => q.categoryId === REGIONAL_CATEGORY_ID && q.tags.includes(region.tag),
  );
}

/* ------------------------------------------------------------------------ */
/* Topic of the day                                                          */
/* ------------------------------------------------------------------------ */

export { TOPICS, topicById } from './topics';
export type { Topic };

function inTopic(topic: Topic, pool: readonly Question[]): readonly Question[] {
  const tags = new Set(topic.tags);
  return pool.filter((q) => q.tags.some((t) => tags.has(t)));
}

/** Every question in the topic, across all categories. */
export function getTopicQuestions(topic: Topic): readonly Question[] {
  return inTopic(topic, activeQuestions);
}

/** Questions per topic run. */
export const TOPIC_RUN_SIZE = 5;

/**
 * The topic featured on a given day, chosen deterministically from the date so
 * everyone shares it. Topics too thin for a full run are skipped so the run is
 * never padded.
 */
export function getTopicOfTheDay(dateKey: string): Topic {
  const start = seedFromString(`topic-${dateKey}`) % TOPICS.length;
  for (let i = 0; i < TOPICS.length; i += 1) {
    const topic = TOPICS[(start + i) % TOPICS.length]!;
    if (inTopic(topic, activeQuestions).length >= TOPIC_RUN_SIZE) return topic;
  }
  return TOPICS[start]!;
}

/** The day's fixed question set for a topic — same order for everyone. */
export function getTopicRun(topic: Topic, dateKey: string): readonly Question[] {
  return pickDeterministic(
    getTopicQuestions(topic),
    TOPIC_RUN_SIZE,
    seedFromString(`topic-${topic.id}-${dateKey}`),
  );
}
