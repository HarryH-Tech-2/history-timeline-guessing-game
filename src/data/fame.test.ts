import { mulberry32 } from '@/utils/rng';

import { dealByFame, fameTier, pickByFame } from './fame';
import {
  DAILY_WHOLE_CATALOGUE_FROM,
  getDailyQuestions,
  getQuestionById,
  getQuestions,
  isDailyEligible,
  isInRotation,
} from './index';

describe('fameTier', () => {
  it('reads fame off difficulty unless overridden', () => {
    expect(fameTier(getQuestionById('evt-moon-landing')!)).toBe('famous');
    // Hard to date, but everyone has heard of it.
    expect(fameTier(getQuestionById('evt-magna-carta')!)).toBe('famous');
    expect(fameTier(getQuestionById('bat-adrianople')!)).toBe('obscure');
  });

  it('starts route and Regional expansion questions a tier lower', () => {
    // Graded "medium" inside its own Crusades fork.
    expect(fameTier(getQuestionById('rte-battle-of-sluys')!)).toBe('niche');
  });
});

describe('pickByFame', () => {
  it('favours well-known questions over obscure ones', () => {
    const rand = mulberry32(7);
    const counts = { famous: 0, known: 0, niche: 0, obscure: 0 };
    for (let i = 0; i < 2000; i += 1) counts[fameTier(pickByFame(getQuestions(), rand)!)] += 1;
    expect(counts.famous).toBeGreaterThan(counts.known);
    expect(counts.known).toBeGreaterThan(counts.niche);
    expect(counts.niche).toBeGreaterThan(counts.obscure);
    expect(counts.obscure).toBeLessThan(2000 * 0.06);
  });

  it('still draws from a pool with a single tier', () => {
    const obscure = getQuestions().filter((q) => fameTier(q) === 'obscure');
    expect(pickByFame(obscure)).toBeDefined();
    expect(pickByFame([])).toBeUndefined();
  });
});

describe('dealByFame', () => {
  it('deals distinct questions, repeatably for a seed', () => {
    const a = dealByFame(getQuestions(), 10, 42).map((q) => q.id);
    expect(new Set(a).size).toBe(10);
    expect(dealByFame(getQuestions(), 10, 42).map((q) => q.id)).toEqual(a);
  });
});

describe('the Daily fame mix', () => {
  it('deals four famous, three known and one niche question', () => {
    for (const key of ['2026-10-12', '2026-11-03', '2027-02-28']) {
      const daily = getDailyQuestions(key);
      const tiers = daily.map(fameTier).sort();
      expect(tiers).toEqual(['famous', 'famous', 'famous', 'famous', 'known', 'known', 'known', 'niche']);
      expect(new Set(daily.map((q) => q.id)).size).toBe(8);
      expect(daily.every(key < DAILY_WHOLE_CATALOGUE_FROM ? isInRotation : isDailyEligible)).toBe(true);
      expect(getDailyQuestions(key).map((q) => q.id)).toEqual(daily.map((q) => q.id));
    }
  });

  it('leaves earlier days on the uniform draw', () => {
    const tiers = new Set<string>();
    for (let day = 1; day <= 30; day += 1) {
      for (const q of getDailyQuestions(`2026-09-${String(day).padStart(2, '0')}`)) tiers.add(fameTier(q));
    }
    expect(tiers.has('obscure')).toBe(true);
  });
});
