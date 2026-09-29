import { CAMPAIGN } from '@/features/modes/campaign/campaignMap';

import {
  CAMPAIGN_ROUTE_SPECS,
  getCategoryById,
  getDailyQuestions,
  getQuestionById,
  getQuestions,
  isCampaignRouteQuestion,
  isInRotation,
} from './index';
import { CAMPAIGN_ROUTES } from './packs/campaignRoutes';
import { REGIONAL_EXPANSION } from './packs/regionalExpansion';
import { imageForQuestion } from './questionImages';
import { OUT_OF_ROTATION_IDS } from './rotation';

/** Eras whose 30 route questions are written. Each content task appends its era. */
const COMPLETE_ERAS: readonly string[] = ['ancient', 'medieval', 'early-modern', 'nineteenth'];

/** Inclusive year span of each campaign era (ERAS in campaignMap.ts: 500 is Ancient). */
const ERA_YEARS: Record<string, readonly [number, number]> = {
  ancient: [-999, 500],
  medieval: [501, 1499],
  'early-modern': [1500, 1799],
  nineteenth: [1800, 1899],
  modern: [1900, 2025],
};

const specIds = new Set(CAMPAIGN_ROUTE_SPECS.map((s) => s.id));
const eraOfRoute = new Map(CAMPAIGN_ROUTE_SPECS.map((s) => [s.id, s.eraId] as const));
const routeQuestionIds = new Set(CAMPAIGN_ROUTES.map((q) => q.id));

function dateKeys(days: number): string[] {
  const start = new Date(2026, 0, 1);
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;
  });
}

describe('campaign route specs', () => {
  it('forks every era into the two designed routes', () => {
    expect(CAMPAIGN_ROUTE_SPECS.map((r) => `${r.eraId} ${r.id} ${r.icon} ${r.name}`)).toEqual([
      'ancient egypt-near-east 🏺 Egypt & the Near East',
      'ancient greece-rome 🏛️ Greece & Rome',
      'medieval crusades-castles ⚔️ Crusades & Castles',
      'medieval silk-road 🐪 Silk Road & Trade',
      'early-modern voyages ⛵ Voyages of Discovery',
      'early-modern renaissance 🎨 Renaissance & Reformation',
      'nineteenth revolutions 🗽 Revolutions & Nations',
      'nineteenth steam-science 🚂 Steam & Science',
      'modern world-at-war 🎖️ World at War',
      'modern space-tech 🚀 Space & Technology',
    ]);
  });
});

describe('rotation', () => {
  it('takes exactly the Regional expansion and the route questions out of rotation', () => {
    expect([...OUT_OF_ROTATION_IDS].sort()).toEqual(
      [...REGIONAL_EXPANSION, ...CAMPAIGN_ROUTES].map((q) => q.id).sort(),
    );
    for (const q of getQuestions()) expect(isInRotation(q)).toBe(!OUT_OF_ROTATION_IDS.has(q.id));
  });

  it('recognises route questions by pack membership, not by tag', () => {
    // 'renaissance' is also an ordinary tag on older, in-rotation questions.
    const lookalikes = getQuestions().filter(
      (q) => q.tags.includes('renaissance') && !routeQuestionIds.has(q.id),
    );
    expect(lookalikes.length).toBeGreaterThan(0);
    for (const q of lookalikes) expect(isCampaignRouteQuestion(q)).toBe(false);
    for (const q of CAMPAIGN_ROUTES) expect(isCampaignRouteQuestion(q)).toBe(true);
  });

  it('never deals a route question in the Daily', () => {
    for (const key of dateKeys(400)) {
      for (const q of getDailyQuestions(key)) expect(routeQuestionIds.has(q.id)).toBe(false);
    }
  });
});

describe('campaign route questions', () => {
  it('are bundled in the catalogue under unique rte- ids', () => {
    const ids = CAMPAIGN_ROUTES.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const q of CAMPAIGN_ROUTES) {
      expect(q.id.startsWith('rte-')).toBe(true);
      expect(getQuestionById(q.id)).toBeDefined();
    }
  });

  it('carry exactly one route tag and sit inside that route’s era', () => {
    for (const q of CAMPAIGN_ROUTES) {
      const routes = q.tags.filter((t) => specIds.has(t));
      expect(routes).toHaveLength(1);
      const [min, max] = ERA_YEARS[eraOfRoute.get(routes[0]!)!]!;
      expect(q.year).toBeGreaterThanOrEqual(min);
      expect(q.year).toBeLessThanOrEqual(max);
    }
  });

  it('follow the content policy', () => {
    for (const q of CAMPAIGN_ROUTES) {
      expect(q.year).not.toBe(0);
      expect(q.year).toBeGreaterThanOrEqual(-999);
      expect(q.year).toBeLessThanOrEqual(2025);
      if (q.day !== undefined) expect(q.month).toBeDefined();
      expect(q.source?.startsWith('https://en.wikipedia.org/wiki/')).toBe(true);
      expect(q.verified).toBe(true);
      expect(getCategoryById(q.categoryId)).toBeDefined();
      expect(q.categoryId).not.toBe('regional');
      const year = String(Math.abs(q.year));
      for (const text of [q.title, q.subtitle, q.shortDescription]) expect(text).not.toContain(year);
    }
  });

  it('keeps titles unique across the whole catalogue', () => {
    const titles = getQuestions().map((q) => q.title.toLowerCase());
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('illustrates every route question', () => {
    expect(CAMPAIGN_ROUTES.filter((q) => imageForQuestion(q.id) === undefined).map((q) => q.id)).toEqual([]);
  });

  for (const eraId of COMPLETE_ERAS) {
    it(`gives ${eraId} two routes of 15 questions: five easy, five medium, five hard`, () => {
      for (const spec of CAMPAIGN_ROUTE_SPECS.filter((s) => s.eraId === eraId)) {
        const own = CAMPAIGN_ROUTES.filter((q) => q.tags.includes(spec.id));
        expect(own).toHaveLength(15);
        for (const d of ['easy', 'medium', 'hard']) {
          expect(own.filter((q) => q.difficulty === d)).toHaveLength(5);
        }
      }
    });
  }

  const FORK_AFTER: Record<string, string> = {
    ancient: 'ancient-s2',
    medieval: 'medieval-s3',
    'early-modern': 'early-modern-s4',
    nineteenth: 'nineteenth-s4',
    modern: 'modern-s8',
  };

  for (const eraId of COMPLETE_ERAS) {
    it(`forks ${eraId} after ${FORK_AFTER[eraId]} into two routes of three five-question stages`, () => {
      const world = CAMPAIGN.find((w) => w.id === eraId)!;
      expect(world.routes.map((r) => r.id)).toEqual(
        CAMPAIGN_ROUTE_SPECS.filter((s) => s.eraId === eraId).map((s) => s.id),
      );
      for (const route of world.routes) {
        expect(route.afterStageId).toBe(FORK_AFTER[eraId]);
        expect(route.stages.map((s) => s.id)).toEqual([1, 2, 3].map((n) => `${eraId}-${route.id}-s${n}`));
        for (const stage of route.stages) expect(stage.questionIds).toHaveLength(5);
      }
    });
  }

  it('adds thirty questions per completed era', () => {
    expect(CAMPAIGN_ROUTES).toHaveLength(COMPLETE_ERAS.length * 30);
  });
});
