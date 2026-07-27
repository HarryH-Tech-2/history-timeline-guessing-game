import { z } from 'zod';

import { CategorySchema, QuestionSchema, type Category, type Question } from '@/domain';
import { pickDeterministic, seedFromString } from '@/utils/rng';

import { CATEGORIES } from './categories';
import { QUESTIONS } from './questions';

/**
 * Validate the local seed at module load. Bad data fails loudly and early
 * rather than corrupting a round. When this source is swapped for a Firestore
 * fetch (later slice), the same schemas guard the network payload.
 */
const categories: readonly Category[] = z.array(CategorySchema).parse(CATEGORIES);
const questions: readonly Question[] = z.array(QuestionSchema).parse(QUESTIONS);

const categoryIds = new Set(categories.map((c) => c.id));
for (const q of questions) {
  if (!categoryIds.has(q.categoryId)) {
    throw new Error(`Question "${q.id}" references unknown category "${q.categoryId}"`);
  }
}

export function getCategories(): readonly Category[] {
  return categories;
}

export function getQuestions(): readonly Question[] {
  return questions;
}

export function getQuestionsByCategory(categoryId: string): readonly Question[] {
  return questions.filter((q) => q.categoryId === categoryId);
}

export function getCategoryById(categoryId: string): Category | undefined {
  return categories.find((c) => c.id === categoryId);
}

export function getQuestionById(questionId: string): Question | undefined {
  return questions.find((q) => q.id === questionId);
}

/**
 * The fixed set of questions for a given day. Seeded purely from the date key
 * (`YYYY-MM-DD`), so every player and every device sees the same run — and the
 * same day always reproduces it.
 */
export function getDailyQuestions(dateKey: string, count = 8): readonly Question[] {
  return pickDeterministic(questions, count, seedFromString(`daily-${dateKey}`));
}

/** Pick a random question, optionally excluding ids already seen this session. */
export function getRandomQuestion(excludeIds: ReadonlySet<string> = new Set()): Question {
  const pool = questions.filter((q) => !excludeIds.has(q.id));
  const source = pool.length > 0 ? pool : questions;
  const index = Math.floor(Math.random() * source.length);
  const picked = source[index];
  if (!picked) throw new Error('No questions available in the seed dataset');
  return picked;
}
