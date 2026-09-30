import type { Category, Question } from '@/domain';
import type { Language } from '@/i18n/languages';

import esMeta from './es-419/meta.json';
import esQ1 from './es-419/questions-1.json';
import esQ2 from './es-419/questions-2.json';
import esQ3 from './es-419/questions-3.json';
import esQ4 from './es-419/questions-4.json';
import esQ5 from './es-419/questions-5.json';
import esQ6 from './es-419/questions-6.json';
import jaMeta from './ja/meta.json';
import jaQ1 from './ja/questions-1.json';
import jaQ2 from './ja/questions-2.json';
import jaQ3 from './ja/questions-3.json';
import jaQ4 from './ja/questions-4.json';
import jaQ5 from './ja/questions-5.json';
import jaQ6 from './ja/questions-6.json';
import ptMeta from './pt-BR/meta.json';
import ptQ1 from './pt-BR/questions-1.json';
import ptQ2 from './pt-BR/questions-2.json';
import ptQ3 from './pt-BR/questions-3.json';
import ptQ4 from './pt-BR/questions-4.json';
import ptQ5 from './pt-BR/questions-5.json';
import ptQ6 from './pt-BR/questions-6.json';

/**
 * Translated catalogue text, keyed by id. Only what players see is
 * translated: a question's title and reveal description; a category's name
 * and description; topic/region names and blurbs; route names. Anything
 * missing (e.g. a question added later, or only in Firestore) falls back to
 * the English row, so a new question never shows up blank.
 */
interface ContentOverlay {
  questions: Record<string, { title: string; longDescription: string }>;
  categories: Record<string, { name: string; description: string }>;
  topics: Record<string, { name: string; blurb: string }>;
  regions: Record<string, { name: string; blurb: string }>;
  routes: Record<string, { name: string }>;
}

const OVERLAYS: Partial<Record<Language, ContentOverlay>> = {
  'pt-BR': { ...ptMeta, questions: { ...ptQ1, ...ptQ2, ...ptQ3, ...ptQ4, ...ptQ5, ...ptQ6 } },
  'es-419': { ...esMeta, questions: { ...esQ1, ...esQ2, ...esQ3, ...esQ4, ...esQ5, ...esQ6 } },
  ja: { ...jaMeta, questions: { ...jaQ1, ...jaQ2, ...jaQ3, ...jaQ4, ...jaQ5, ...jaQ6 } },
};

export function contentOverlay(language: Language): ContentOverlay | undefined {
  return OVERLAYS[language];
}

export function localizeQuestion(question: Question, overlay: ContentOverlay | undefined): Question {
  const text = overlay?.questions[question.id];
  return text ? { ...question, title: text.title, longDescription: text.longDescription } : question;
}

export function localizeCategory(category: Category, overlay: ContentOverlay | undefined): Category {
  const text = overlay?.categories[category.id];
  return text ? { ...category, name: text.name, description: text.description } : category;
}

/** `name` and `blurb` of a topic or region in the overlay, or the item unchanged. */
export function localizeNamed<T extends { id: string; name: string; blurb: string }>(
  item: T,
  table: 'topics' | 'regions',
  overlay: ContentOverlay | undefined,
): T {
  const text = overlay?.[table][item.id];
  return text ? { ...item, name: text.name, blurb: text.blurb } : item;
}

export function localizeRouteName(routeId: string, fallback: string, overlay: ContentOverlay | undefined): string {
  return overlay?.routes[routeId]?.name ?? fallback;
}
