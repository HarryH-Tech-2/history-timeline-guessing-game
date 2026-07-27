import { act, render, screen, waitFor } from '@testing-library/react-native';
import { useEffect } from 'react';
import { Text } from 'react-native';

import type { RoundResult } from '@/domain';

import { progressionStore } from './persistence';
import { ProgressionProvider, useProgression } from './ProgressionProvider';

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
  return <Text>{`xp:${api.state.xp} coins:${api.state.coins}`}</Text>;
}

describe('ProgressionProvider', () => {
  afterEach(() => progressionStore.clear());

  it('awards a round and persists it', async () => {
    let api!: ReturnType<typeof useProgression>;
    render(
      <ProgressionProvider>
        <Probe onReady={(a) => (api = a)} />
      </ProgressionProvider>,
    );

    await waitFor(() => expect(api).toBeDefined());

    act(() => {
      api.awardRound(perfectRound(), 1);
    });

    await screen.findByText('xp:150 coins:10');
    await waitFor(async () => {
      expect((await progressionStore.read()).xp).toBe(150);
    });
  });

  it('spends coins only when affordable', async () => {
    let api!: ReturnType<typeof useProgression>;
    render(
      <ProgressionProvider>
        <Probe onReady={(a) => (api = a)} />
      </ProgressionProvider>,
    );
    await waitFor(() => expect(api).toBeDefined());

    let ok = true;
    act(() => {
      ok = api.spend(50);
    });
    expect(ok).toBe(false);

    act(() => {
      api.awardRound(perfectRound(), 1); // +10 coins
    });
    act(() => {
      ok = api.spend(10);
    });
    expect(ok).toBe(true);
    await screen.findByText('xp:150 coins:0');
  });
});

describe('useProgression without a provider', () => {
  it('is a harmless offline no-op', () => {
    function Bare() {
      const api = useProgression();
      return <Text>{`loading:${api.isLoading} spend:${api.spend(5)}`}</Text>;
    }
    render(<Bare />);
    expect(screen.getByText('loading:false spend:false')).toBeOnTheScreen();
  });
});
