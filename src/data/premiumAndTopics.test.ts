import {
  getCategories,
  getDailyQuestions,
  getFreeQuestions,
  getPlayableQuestions,
  getQuestions,
  getRandomQuestion,
  getTopicOfTheDay,
  getTopicQuestions,
  getTopicRun,
  isPremiumCategory,
  isTopicAvailable,
  setPremiumUnlocked,
  TOPIC_RUN_SIZE,
  TOPICS,
} from './index';

afterEach(() => setPremiumUnlocked(false));

describe('premium gating of question pools', () => {
  const premiumIds = getCategories().filter((c) => c.premiumOnly).map((c) => c.id);

  it('flags only Arts & Culture as premium', () => {
    expect(premiumIds).toEqual(['arts']);
    expect(isPremiumCategory('arts')).toBe(true);
    expect(isPremiumCategory('technology')).toBe(false);
    expect(isPremiumCategory('events')).toBe(false);
  });

  it('excludes premium categories from the free pool', () => {
    const free = getFreeQuestions();
    expect(free.length).toBeLessThan(getQuestions().length);
    expect(free.some((q) => premiumIds.includes(q.categoryId))).toBe(false);
  });

  it('serves only free questions until Premium is unlocked', () => {
    expect(getPlayableQuestions()).toHaveLength(getFreeQuestions().length);
    for (let i = 0; i < 50; i += 1) {
      expect(premiumIds).not.toContain(getRandomQuestion().categoryId);
    }
    setPremiumUnlocked(true);
    expect(getPlayableQuestions()).toHaveLength(getQuestions().length);
  });

  it('keeps the Daily identical for free and Premium players', () => {
    const free = getDailyQuestions('2026-08-24').map((q) => q.id);
    setPremiumUnlocked(true);
    expect(getDailyQuestions('2026-08-24').map((q) => q.id)).toEqual(free);
    expect(free.some((id) => id.startsWith('art-'))).toBe(false);
  });
});

describe('topic of the day', () => {
  it('every topic has enough questions for a full run with Premium', () => {
    setPremiumUnlocked(true);
    for (const topic of TOPICS) {
      expect(getTopicQuestions(topic).length).toBeGreaterThanOrEqual(TOPIC_RUN_SIZE);
      expect(isTopicAvailable(topic)).toBe(true);
    }
  });

  it('locks premium-heavy topics for free players but keeps most playable', () => {
    const available = TOPICS.filter((t) => isTopicAvailable(t));
    expect(available.length).toBeGreaterThanOrEqual(TOPICS.length - 4);
    expect(isTopicAvailable(TOPICS.find((t) => t.id === 'inventions')!)).toBe(true);
    expect(isTopicAvailable(TOPICS.find((t) => t.id === 'rome')!)).toBe(true);
  });

  it('is deterministic per day, the same for free and Premium, and varies across days', () => {
    const a = getTopicOfTheDay('2026-08-24');
    expect(getTopicOfTheDay('2026-08-24')).toBe(a);
    setPremiumUnlocked(true);
    expect(getTopicOfTheDay('2026-08-24')).toBe(a);
    setPremiumUnlocked(false);
    const days = ['2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28'];
    expect(new Set(days.map((d) => getTopicOfTheDay(d).id)).size).toBeGreaterThan(1);
  });

  it('builds a fixed run of on-topic questions', () => {
    setPremiumUnlocked(true);
    const topic = getTopicOfTheDay('2026-08-24');
    const run = getTopicRun(topic, '2026-08-24');
    expect(run).toHaveLength(TOPIC_RUN_SIZE);
    expect(new Set(run.map((q) => q.id)).size).toBe(TOPIC_RUN_SIZE);
    for (const q of run) {
      expect(q.tags.some((t) => topic.tags.includes(t))).toBe(true);
    }
    expect(getTopicRun(topic, '2026-08-24').map((q) => q.id)).toEqual(run.map((q) => q.id));
  });
});
