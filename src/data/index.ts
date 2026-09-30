import { z } from 'zod';

import { CategorySchema, QuestionSchema, type Category, type Question } from '@/domain';
import { getLanguage } from '@/i18n/translate';
import { pickDeterministic, seedFromString } from '@/utils/rng';

import { CATEGORIES } from './categories';
import {
  contentOverlay,
  localizeCategory,
  localizeNamed,
  localizeQuestion,
  localizeRouteName,
} from './i18n';
import { CAMPAIGN_ROUTES } from './packs/campaignRoutes';
import { QUESTIONS } from './questions';
import { REGION_RUN_LENGTH, REGIONAL_CATEGORY_ID, regionById, REGIONS, type Region } from './regions';
import { OUT_OF_ROTATION_IDS } from './rotation';
import { TOPICS, type Topic } from './topics';

export { QUESTION_IMAGES, imageForQuestion } from './questionImages';
export { CAMPAIGN_ROUTE_SPECS, type CampaignRouteSpec } from './packs/campaignRoutes';

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

/* ------------------------------------------------------------------------ */
/* Language                                                                  */
/* ------------------------------------------------------------------------ */

/**
 * The active content in the player's language: the same rows in the same
 * order (so seeded picks are unchanged), with translated titles, descriptions
 * and names from src/data/i18n swapped in. English, and anything without a
 * translation, is the row itself. Rebuilt only when the language or the
 * content changes; scripts run in English, so they seed the source text.
 */
let localized: {
  key: string;
  categories: readonly Category[];
  questions: readonly Question[];
} | null = null;

function view(): { categories: readonly Category[]; questions: readonly Question[] } {
  const language = getLanguage();
  const key = `${language}:${contentVersion}`;
  if (localized?.key !== key) {
    const overlay = contentOverlay(language);
    localized = {
      key,
      categories: overlay ? activeCategories.map((c) => localizeCategory(c, overlay)) : activeCategories,
      questions: overlay ? activeQuestions.map((q) => localizeQuestion(q, overlay)) : activeQuestions,
    };
  }
  return localized;
}

/** A region's name and blurb in the player's language. */
export function localizeRegion(region: Region): Region {
  return localizeNamed(region, 'regions', contentOverlay(getLanguage()));
}

/** A topic's name and blurb in the player's language. */
export function localizeTopic(topic: Topic): Topic {
  return localizeNamed(topic, 'topics', contentOverlay(getLanguage()));
}

/** A campaign route's name in the player's language. */
export function routeName(route: { id: string; name: string }): string {
  return localizeRouteName(route.id, route.name, contentOverlay(getLanguage()));
}

export function getCategories(): readonly Category[] {
  return view().categories;
}

export function getQuestions(): readonly Question[] {
  return view().questions;
}

export function getQuestionsByCategory(categoryId: string): readonly Question[] {
  return view().questions.filter((q) => q.categoryId === categoryId);
}

export function getCategoryById(categoryId: string): Category | undefined {
  return view().categories.find((c) => c.id === categoryId);
}

export function getQuestionById(questionId: string): Question | undefined {
  return view().questions.find((q) => q.id === questionId);
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
    view().questions.filter(isInRotation),
    count,
    seedFromString(`daily-${dateKey}`),
  );
}

/**
 * Whether a question takes part in the shared, seeded modes (the Daily and the
 * campaign main path). The Regional expansion and the campaign route questions
 * do not: the Daily is seeded over the whole pool and the campaign slices it
 * into stages, so adding questions there would give old and new builds
 * different Dailies on the same day and move questions between stages players
 * have already starred.
 */
export function isInRotation(question: Question): boolean {
  return !OUT_OF_ROTATION_IDS.has(question.id);
}

const ROUTE_QUESTION_IDS = new Set(CAMPAIGN_ROUTES.map((q) => q.id));

/** Whether a question belongs to a campaign route fork (by pack membership, not tag). */
export function isCampaignRouteQuestion(question: Question): boolean {
  return ROUTE_QUESTION_IDS.has(question.id);
}

/** Pick a random question, optionally excluding ids already seen this session. */
export function getRandomQuestion(excludeIds: ReadonlySet<string> = new Set()): Question {
  const all = view().questions;
  const pool = all.filter((q) => !excludeIds.has(q.id));
  const source = pool.length > 0 ? pool : all;
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
  return view().questions.filter(
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
  return inTopic(topic, view().questions);
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
    if (inTopic(topic, activeQuestions).length >= TOPIC_RUN_SIZE) return localizeTopic(topic);
  }
  return localizeTopic(TOPICS[start]!);
}

/** The day's fixed question set for a topic — same order for everyone. */
export function getTopicRun(topic: Topic, dateKey: string): readonly Question[] {
  return pickDeterministic(
    getTopicQuestions(topic),
    TOPIC_RUN_SIZE,
    seedFromString(`topic-${topic.id}-${dateKey}`),
  );
}
