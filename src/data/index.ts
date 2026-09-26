import { z } from 'zod';

import { CategorySchema, QuestionSchema, type Category, type Question } from '@/domain';
import { pickDeterministic, seedFromString } from '@/utils/rng';

import { CATEGORIES } from './categories';
import { QUESTIONS } from './questions';
import { REGIONAL_CATEGORY_ID, regionById, REGIONS, type Region } from './regions';
import { TOPICS, type Topic } from './topics';

import { imageForQuestion } from './questionImages';

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

interface HydrateOptions {
  /**
   * Whether this build ships the illustration for a question id. Defaults to
   * the bundled image table; tests inject their own.
   */
  hasIllustration?: (questionId: string) => boolean;
}

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
 * Merge a remotely fetched catalogue over the bundled seed. The seed is what
 * this build can actually show — art ships in the app, not in Firestore — so
 * the remote copy corrects and extends it; it can never remove a bundled
 * category or question. Rules:
 *  - a remote row with a bundled id replaces that row (text and date fixes);
 *  - remote questions need a bundled illustration and a known category, or
 *    they're dropped, so a reseed can't surface pictureless rounds;
 *  - a remote-only category with no playable questions is dropped.
 * An empty payload is ignored, so a failed fetch never changes anything.
 */
export function hydrateContent(
  categories: readonly Category[],
  questions: readonly Question[],
  { hasIllustration = (id) => imageForQuestion(id) !== undefined }: HydrateOptions = {},
): void {
  if (categories.length === 0 || questions.length === 0) return;

  const categoryById = new Map(seedCategories.map((c) => [c.id, c] as const));
  for (const c of categories) categoryById.set(c.id, c);

  const questionById = new Map(seedQuestions.map((q) => [q.id, q] as const));
  for (const q of questions) {
    if (categoryById.has(q.categoryId) && hasIllustration(q.id)) questionById.set(q.id, q);
  }

  const mergedQuestions = [...questionById.values()].filter((q) => categoryById.has(q.categoryId));
  const populated = new Set(mergedQuestions.map((q) => q.categoryId));
  const bundledIds = new Set(seedCategories.map((c) => c.id));
  activeCategories = [...categoryById.values()].filter(
    (c) => bundledIds.has(c.id) || populated.has(c.id),
  );
  activeQuestions = mergedQuestions;
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
  return pickDeterministic(activeQuestions, count, seedFromString(`daily-${dateKey}`));
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

export { REGIONAL_CATEGORY_ID, REGIONS, regionById };
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
