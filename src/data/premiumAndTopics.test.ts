import {
  getCategories,
  getDailyQuestions,
  getQuestions,
  getRandomQuestion,
  getTopicOfTheDay,
  getTopicQuestions,
  getTopicRun,
  isPremiumCategory,
  TOPIC_RUN_SIZE,
  TOPICS,
} from './index';

const premiumIds = getCategories()
  .filter((c) => c.premiumOnly)
  .map((c) => c.id);

/** Questions in the premium-only categories, by id. */
const premiumQuestionIds = new Set(
  getQuestions()
    .filter((q) => premiumIds.includes(q.categoryId))
    .map((q) => q.id),
);

describe('premium categories', () => {
  it('flags Arts, Philosophy, Regional and Space as premium', () => {
    expect(premiumIds).toEqual(['arts', 'philosophy', 'regional', 'space']);
    expect(isPremiumCategory('arts')).toBe(true);
    expect(isPremiumCategory('philosophy')).toBe(true);
    expect(isPremiumCategory('regional')).toBe(true);
    expect(isPremiumCategory('space')).toBe(true);
    expect(isPremiumCategory('treaties')).toBe(false);
    expect(isPremiumCategory('sport')).toBe(false);
    expect(isPremiumCategory('trade')).toBe(false);
    expect(isPremiumCategory('technology')).toBe(false);
    expect(isPremiumCategory('events')).toBe(false);
  });
});

/**
 * Every mode draws on the whole catalogue (user decision 2026-09-03: questions
 * from all categories appear in all game modes). Premium gates playing a
 * premium category on its own, not whether its questions show up elsewhere.
 */
describe('question pools span every category', () => {
  it('random pools (Endless, Survival) can serve premium-category questions', () => {
    const seen = new Set<string>();
    const picked = new Set<string>();
    for (let i = 0; i < getQuestions().length; i += 1) {
      const q = getRandomQuestion(seen);
      seen.add(q.id);
      picked.add(q.categoryId);
    }
    for (const id of premiumIds) expect(picked).toContain(id);
  });

  it('the Daily is drawn from the full catalogue', () => {
    // Over a run of days the fixed sets must include premium-category
    // questions; a single day may not, so sample a month.
    const ids = new Set<string>();
    for (let day = 1; day <= 30; day += 1) {
      const key = `2026-09-${String(day).padStart(2, '0')}`;
      for (const q of getDailyQuestions(key)) ids.add(q.id);
    }
    expect([...ids].some((id) => premiumQuestionIds.has(id))).toBe(true);
  });

  it('topic pools include premium-category questions', () => {
    const inTopics = new Set(TOPICS.flatMap((t) => getTopicQuestions(t).map((q) => q.id)));
    expect([...inTopics].some((id) => premiumQuestionIds.has(id))).toBe(true);
  });
});

describe('topic of the day', () => {
  it('every topic has enough questions for a full run', () => {
    for (const topic of TOPICS) {
      expect(getTopicQuestions(topic).length).toBeGreaterThanOrEqual(TOPIC_RUN_SIZE);
    }
  });

  it('is deterministic per day and varies across days', () => {
    const a = getTopicOfTheDay('2026-08-24');
    expect(getTopicOfTheDay('2026-08-24')).toBe(a);
    const days = ['2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28'];
    expect(new Set(days.map((d) => getTopicOfTheDay(d).id)).size).toBeGreaterThan(1);
  });

  it('builds a fixed run of on-topic questions', () => {
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
