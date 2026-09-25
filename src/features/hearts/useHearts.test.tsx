import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { INITIAL_PROGRESSION } from '@/domain';
import { ProgressionProvider, progressionStore } from '@/features/progression';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));

// eslint-disable-next-line import/first
import { useHearts } from './useHearts';

const wrapper = ({ children }: { children: ReactNode }) => (
  <ProgressionProvider>{children}</ProgressionProvider>
);

const emptyMeter = { count: 0, updatedAt: Date.now() };

describe('useHearts while hearts are not yet at stake', () => {
  afterEach(() => progressionStore.clear());

  it('never reports empty during a new player’s free games', async () => {
    await progressionStore.write({
      ...INITIAL_PROGRESSION,
      hearts: emptyMeter,
      stats: { ...INITIAL_PROGRESSION.stats, gamesPlayed: 1 },
    });
    const view = renderHook(useHearts, { wrapper });
    await waitFor(() => expect(view.result.current.atStake).toBe(false));
    expect(view.result.current.empty).toBe(false);
  });

  it('reports empty once hearts are at stake', async () => {
    await progressionStore.write({
      ...INITIAL_PROGRESSION,
      hearts: emptyMeter,
      stats: { ...INITIAL_PROGRESSION.stats, gamesPlayed: 2 },
    });
    const view = renderHook(useHearts, { wrapper });
    await waitFor(() => expect(view.result.current.atStake).toBe(true));
    expect(view.result.current.empty).toBe(true);
  });
});
