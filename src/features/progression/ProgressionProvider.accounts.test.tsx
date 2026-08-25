import { act, render, screen } from '@testing-library/react-native';
import { useEffect } from 'react';
import { Text } from 'react-native';

import { INITIAL_PROGRESSION, type RoundResult } from '@/domain';
import { SaveProvider } from '@/features/save';

import { progressionSaves } from './persistence';
import { ProgressionProvider, useProgression } from './ProgressionProvider';

// Pretend Firebase is configured so SaveProvider follows the auth uid, stub the
// Firestore adapter (cloud empty → hydrate keeps each uid's local copy), and
// drive the signed-in uid from the test.
jest.mock('@/config/env', () => ({ isFirebaseConfigured: true, firebaseConfig: {} }));
jest.mock('@/storage/cloudSaves', () => ({
  cloudSaves: { load: () => Promise.resolve(null), save: () => Promise.resolve() },
}));
const auth = { uid: 'guest-1' as string | null, isLoading: false };
jest.mock('@/services/firebase/auth', () => ({ useAuth: () => auth }));

function perfectRound(): RoundResult {
  return {
    question: { year: 2000 } as RoundResult['question'],
    guessYear: 2000,
    errorYears: 0,
    score: { base: 1000, comboMultiplier: 1, streakBonus: 0, total: 1000 },
    isPerfect: true,
  };
}

function Probe() {
  const { state, isLoading } = useProgression();
  return <Text>{isLoading ? 'loading' : `xp:${state.xp} coins:${state.coins}`}</Text>;
}

function Tree() {
  return (
    <SaveProvider>
      <ProgressionProvider>
        <Probe />
      </ProgressionProvider>
    </SaveProvider>
  );
}

/** Same as `Probe`, but also hands the live api out via `onApi` so a test can drive it. */
function ApiProbe({ onApi }: { onApi: (api: ReturnType<typeof useProgression>) => void }) {
  const api = useProgression();
  useEffect(() => {
    onApi(api);
  });
  return <Text>{api.isLoading ? 'loading' : `xp:${api.state.xp} coins:${api.state.coins}`}</Text>;
}

function ApiTree({ onApi }: { onApi: (api: ReturnType<typeof useProgression>) => void }) {
  return (
    <SaveProvider>
      <ProgressionProvider>
        <ApiProbe onApi={onApi} />
      </ProgressionProvider>
    </SaveProvider>
  );
}

describe('ProgressionProvider across accounts', () => {
  beforeEach(() => {
    auth.uid = 'guest-1';
  });
  afterEach(async () => {
    await progressionSaves.forUser('guest-1').clear();
    await progressionSaves.forUser('account-2').clear();
  });

  it('shows the signed-in account’s own progress, never the previous one’s', async () => {
    await progressionSaves.forUser('guest-1').write({ ...INITIAL_PROGRESSION, xp: 300 });
    await progressionSaves.forUser('account-2').write({ ...INITIAL_PROGRESSION, xp: 45 });

    const view = render(<Tree />);
    await screen.findByText('xp:300 coins:0');

    auth.uid = 'account-2';
    view.rerender(<Tree />);
    await screen.findByText('xp:45 coins:0');
  });

  it('is loading again while the new account is being read', async () => {
    const view = render(<Tree />);
    await screen.findByText('xp:0 coins:0');

    auth.uid = 'account-2';
    view.rerender(<Tree />);
    // Synchronously after the switch the old numbers must be gone.
    expect(screen.queryByText('xp:0 coins:0')).toBeNull();
    await screen.findByText('xp:0 coins:0');
  });

  it('drops (and never persists) a mutation that fires mid-hydration after a uid switch', async () => {
    await progressionSaves.forUser('account-2').write({ ...INITIAL_PROGRESSION, xp: 45 });

    let api!: ReturnType<typeof useProgression>;
    const view = render(<ApiTree onApi={(a) => (api = a)} />);
    await screen.findByText('xp:0 coins:0');

    auth.uid = 'account-2';
    view.rerender(<ApiTree onApi={(a) => (api = a)} />);
    // Synchronously after the switch — before anything is awaited — a mutator
    // fires. It must not compute on top of INITIAL_PROGRESSION and clobber
    // account-2's real save; the later hydration read is the only writer.
    act(() => {
      api.awardRound(perfectRound(), 1);
    });

    await screen.findByText('xp:45 coins:0');
    expect((await progressionSaves.forUser('account-2').read()).xp).toBe(45);
  });
});
