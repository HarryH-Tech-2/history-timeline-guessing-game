import {
  CAMPAIGN_ROUTE_SPECS,
  getCategories,
  getCategoryById,
  getDailyQuestions,
  getQuestionById,
  getQuestions,
  localizeRegion,
  REGIONS,
  resetContentToSeed,
  routeName,
  TOPICS,
} from '@/data';
import { LANGUAGES } from '@/i18n';
import { setLanguage } from '@/i18n/translate';

import { contentOverlay } from '.';

afterEach(() => {
  setLanguage('en');
  resetContentToSeed();
});

describe('translated catalogue', () => {
  it('serves the English rows untouched in English', () => {
    const before = getQuestions();
    setLanguage('en');
    expect(getQuestions()).toBe(before);
    expect(getQuestionById('evt-moon-landing')?.title).toBe('The Moon Landing');
  });

  it('swaps in the translated title and description, keeping everything else', () => {
    const en = getQuestionById('evt-moon-landing')!;
    setLanguage('pt-BR');
    const pt = getQuestionById('evt-moon-landing')!;
    expect(pt.title).not.toBe(en.title);
    expect(pt.longDescription).not.toBe(en.longDescription);
    expect({ ...pt, title: en.title, longDescription: en.longDescription }).toEqual(en);
  });

  it('keeps seeded picks identical across languages (same Daily for everyone)', () => {
    const en = getDailyQuestions('2026-09-30').map((q) => q.id);
    setLanguage('es-419');
    expect(getDailyQuestions('2026-09-30').map((q) => q.id)).toEqual(en);
  });

  it('translates category, region and route names', () => {
    setLanguage('es-419');
    expect(getCategoryById('battles')?.name).toBe('Batallas');
    expect(localizeRegion(REGIONS.find((r) => r.id === 'europe')!).name).toBe('Europa');
    expect(routeName(CAMPAIGN_ROUTE_SPECS.find((r) => r.id === 'greece-rome')!)).toBe('Grecia y Roma');
  });
});

describe.each(LANGUAGES.filter((l) => l.code !== 'en').map((l) => l.code))('%s coverage', (language) => {
  const overlay = contentOverlay(language)!;

  it('translates every bundled question', () => {
    const missing = getQuestions()
      .map((q) => q.id)
      .filter((id) => !overlay.questions[id]?.title || !overlay.questions[id]?.longDescription);
    expect(missing).toEqual([]);
  });

  it('only has translations for questions that exist', () => {
    const ids = new Set(getQuestions().map((q) => q.id));
    expect(Object.keys(overlay.questions).filter((id) => !ids.has(id))).toEqual([]);
  });

  it('translates every category, topic, region and route', () => {
    expect(getCategories().filter((c) => !overlay.categories[c.id])).toEqual([]);
    expect(TOPICS.filter((t) => !overlay.topics[t.id])).toEqual([]);
    expect(REGIONS.filter((r) => !overlay.regions[r.id])).toEqual([]);
    expect(CAMPAIGN_ROUTE_SPECS.filter((r) => !overlay.routes[r.id])).toEqual([]);
  });
});
