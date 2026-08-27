import { z } from 'zod';

import { CategorySchema, QuestionSchema, type Category, type Question } from '@/domain';
import { pickDeterministic, seedFromString } from '@/utils/rng';

import { CATEGORIES } from './categories';
import { QUESTIONS } from './questions';
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
 * Replace the active content with a remotely fetched set. Referential integrity
 * is enforced by dropping questions whose category is missing, so one bad remote
 * document can't wedge a round. An empty set is ignored, guaranteeing we never
 * downgrade a working catalogue to nothing on a partial/failed fetch.
 */
export function hydrateContent(
  categories: readonly Category[],
  questions: readonly Question[],
): void {
  if (categories.length === 0 || questions.length === 0) return;
  const ids = new Set(categories.map((c) => c.id));
  activeCategories = categories;
  activeQuestions = questions.filter((q) => ids.has(q.categoryId));
}

/** Reset the active content back to the bundled seed (used by tests). */
export function resetContentToSeed(): void {
  activeCategories = seedCategories;
  activeQuestions = seedQuestions;
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
/* Premium access                                                            */
/* ------------------------------------------------------------------------ */

/**
 * Whether the player currently holds Premium. Set by the PremiumProvider and
 * read here so the random pools below never hand a free player a question
 * from a premium-only category. Module-level on purpose: the getters are plain
 * functions used from hooks and non-React code alike.
 */
let premiumUnlocked = false;

export function setPremiumUnlocked(unlocked: boolean): void {
  premiumUnlocked = unlocked;
}

export function isPremiumUnlocked(): boolean {
  return premiumUnlocked;
}

/** True when the category is behind the paywall (regardless of entitlement). */
export function isPremiumCategory(categoryId: string): boolean {
  return getCategoryById(categoryId)?.premiumOnly === true;
}

/** Questions every player can see: premium-only categories excluded. */
export function getFreeQuestions(): readonly Question[] {
  return activeQuestions.filter((q) => !isPremiumCategory(q.categoryId));
}

/** Questions this player can be served right now, given their entitlement. */
export function getPlayableQuestions(): readonly Question[] {
  return premiumUnlocked ? activeQuestions : getFreeQuestions();
}

/**
 * The fixed set of questions for a given day. Seeded purely from the date key
 * (`YYYY-MM-DD`), so every player and every device sees the same run — and the
 * same day always reproduces it. Drawn from the free pool so the Daily is
 * identical for free and Premium players alike.
 */
export function getDailyQuestions(dateKey: string, count = 8): readonly Question[] {
  return pickDeterministic(getFreeQuestions(), count, seedFromString(`daily-${dateKey}`));
}

/** Pick a random question, optionally excluding ids already seen this session. */
export function getRandomQuestion(excludeIds: ReadonlySet<string> = new Set()): Question {
  const playable = getPlayableQuestions();
  const pool = playable.filter((q) => !excludeIds.has(q.id));
  const source = pool.length > 0 ? pool : playable;
  const index = Math.floor(Math.random() * source.length);
  const picked = source[index];
  if (!picked) throw new Error('No questions available in the seed dataset');
  return picked;
}

/**
 * Pick a random question from one category, excluding ids already seen. Once
 * the category is exhausted the exclusion resets (like Endless's seen-set), so
 * a category run can continue for as long as the player likes.
 */
export function getRandomQuestionInCategory(
  categoryId: string,
  excludeIds: ReadonlySet<string> = new Set(),
): Question {
  const inCategory = activeQuestions.filter((q) => q.categoryId === categoryId);
  const pool = inCategory.filter((q) => !excludeIds.has(q.id));
  const source = pool.length > 0 ? pool : inCategory;
  const index = Math.floor(Math.random() * source.length);
  const picked = source[index];
  if (!picked) throw new Error(`No questions available for category "${categoryId}"`);
  return picked;
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

/** Questions in the topic that this player can be served. */
export function getTopicQuestions(topic: Topic): readonly Question[] {
  return inTopic(topic, getPlayableQuestions());
}

/** Questions per topic run. */
export const TOPIC_RUN_SIZE = 5;

/**
 * Whether this player has enough questions to play the topic. Topics that
 * live mostly in premium categories (Inventions, Music, …) are locked for
 * free players — the home card shows the lock and offers Premium.
 */
export function isTopicAvailable(topic: Topic): boolean {
  return getTopicQuestions(topic).length >= TOPIC_RUN_SIZE;
}

/**
 * The topic featured on a given day, chosen deterministically from the date so
 * everyone shares it regardless of entitlement. Topics too thin even for the
 * full catalogue are skipped so the run is never padded.
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
