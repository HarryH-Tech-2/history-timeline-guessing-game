import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { INITIAL_PROGRESSION, MAX_HEARTS, QuestionSchema, type Question } from '@/domain';
import { ProgressionProvider, progressionStore, useProgression } from '@/features/progression';
import { evaluateGuess } from '@/features/timeline/math';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));
jest.mock('@/features/review', () => ({ requestReviewAfterRun: jest.fn() }));

// eslint-disable-next-line import/first
import { useRoundRewards } from './useRoundRewards';
// eslint-disable-next-line import/first
import type { GameSession } from './useGameSession';

const question: Question = QuestionSchema.parse({
  id: 'q1',
  categoryId: 'events',
  title: 'Moon Landing',
  subtitle: 'Apollo 11',
  year: 1969,
  difficulty: 'easy',
  country: 'United States',
  region: 'Florida',
  latitude: 28.5,
  longitude: -80.6,
  shortDescription: 'a',
  longDescription: 'b',
  tags: [],
  verified: true,
  featured: false,
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <ProgressionProvider>{children}</ProgressionProvider>
);

/** A session that has just revealed one wildly wrong guess. */
function sessionWithLooseMiss(): GameSession {
  const result = evaluateGuess(question, 56);
  return {
    question,
    phase: 'revealed',
    status: 'active',
    result,
    results: [result],
    roundNumber: 1,
    totalScore: result.score.total,
    submit: () => result,
    advance: () => undefined,
  };
}

/** Progression ignores writes until it has loaded, so hold the session back. */
function useRewardsOnceLoaded(session: GameSession) {
  const { isLoading } = useProgression();
  return useRoundRewards(
    isLoading ? { ...session, status: 'active', results: [], result: null } : session,
  );
}

async function seed(gamesPlayed: number) {
  await progressionStore.write({
    ...INITIAL_PROGRESSION,
    stats: { ...INITIAL_PROGRESSION.stats, gamesPlayed },
  });
}

describe('useRoundRewards hearts', () => {
  afterEach(() => progressionStore.clear());

  it('does not charge a heart for a loose guess during the free games', async () => {
    await seed(0);
    const session = sessionWithLooseMiss();
    renderHook(() => useRewardsOnceLoaded(session), { wrapper });
    // Let the provider load and the round effect run before checking the meter.
    await waitFor(async () => expect((await progressionStore.read()).stats.rounds).toBe(1));
    expect((await progressionStore.read()).hearts.count).toBe(MAX_HEARTS);
  });

  it('charges a heart for a loose guess once hearts are at stake', async () => {
    await seed(2);
    const session = sessionWithLooseMiss();
    renderHook(() => useRewardsOnceLoaded(session), { wrapper });
    await waitFor(async () => expect((await progressionStore.read()).hearts.count).toBe(MAX_HEARTS - 1));
  });
});

describe('useRoundRewards review ask', () => {
  afterEach(() => progressionStore.clear());

  it('hands the finished run and everything it unlocked to the review ask', async () => {
    await seed(0);
    const session = { ...sessionWithLooseMiss(), status: 'finished' as const };
    renderHook(() => useRewardsOnceLoaded(session), { wrapper });
    const { requestReviewAfterRun } = jest.requireMock('@/features/review');
    await waitFor(() => expect(requestReviewAfterRun).toHaveBeenCalled());
    expect(requestReviewAfterRun).toHaveBeenCalledWith(
      session.results,
      expect.arrayContaining(['first-round']),
    );
  });
});
