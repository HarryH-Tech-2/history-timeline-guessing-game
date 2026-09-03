import { act, render, waitFor } from '@testing-library/react-native';
import { useEffect } from 'react';
import { Text } from 'react-native';

import type { RoundResult } from '@/domain';
import { unlockPlayGamesAchievement } from '@/services/playGames';

import { progressionStore } from './persistence';
import { playGamesSyncedStore } from './playGamesSync';
import { ProgressionProvider, useProgression } from './ProgressionProvider';

jest.mock('@/services/playGames', () => ({
  unlockPlayGamesAchievement: jest.fn(async () => true),
}));

// Give two achievements a Console id so the sync has something to send.
jest.mock('./playGamesAchievements', () => {
  const actual = jest.requireActual<typeof import('./playGamesAchievements')>(
    './playGamesAchievements',
  );
  return {
    ...actual,
    PLAY_GAMES_ACHIEVEMENTS: {
      ...actual.PLAY_GAMES_ACHIEVEMENTS,
      'first-round': { playId: 'CgkI-first-round', points: 5 },
      bullseye: { playId: 'CgkI-bullseye', points: 10 },
    },
  };
});

const unlock = unlockPlayGamesAchievement as jest.MockedFunction<typeof unlockPlayGamesAchievement>;

function perfectRound(): RoundResult {
  return {
    question: { year: 2000 } as RoundResult['question'],
    guessYear: 2000,
    errorYears: 0,
    score: { base: 1000, comboMultiplier: 1, streakBonus: 0, total: 1000 },
    isPerfect: true,
  };
}

function Probe({ onReady }: { onReady: (api: ReturnType<typeof useProgression>) => void }) {
  const api = useProgression();
  useEffect(() => {
    if (!api.isLoading) onReady(api);
  }, [api, onReady]);
  return <Text>{api.state.unlocked.join(',')}</Text>;
}

describe('ProgressionProvider → Play Games achievements', () => {
  afterEach(async () => {
    unlock.mockClear();
    await progressionStore.clear();
    await playGamesSyncedStore.clear();
  });

  it('unlocks freshly earned achievements on Play Games by their Console id', async () => {
    let api!: ReturnType<typeof useProgression>;
    render(
      <ProgressionProvider>
        <Probe onReady={(a) => (api = a)} />
      </ProgressionProvider>,
    );
    await waitFor(() => expect(api).toBeDefined());

    act(() => {
      api.awardRound(perfectRound(), 1); // earns first-round and bullseye
    });

    await waitFor(() => {
      expect(unlock.mock.calls.map((c) => c[0]).sort()).toEqual([
        'CgkI-bullseye',
        'CgkI-first-round',
      ]);
    });
  });

  it('replays achievements earned earlier (before Play Games could hear about them)', async () => {
    await progressionStore.write({
      ...(await progressionStore.read()),
      unlocked: ['first-round'],
    });

    render(
      <ProgressionProvider>
        <Probe onReady={() => {}} />
      </ProgressionProvider>,
    );

    await waitFor(() => expect(unlock).toHaveBeenCalledWith('CgkI-first-round'));
  });
});
