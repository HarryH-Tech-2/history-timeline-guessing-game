import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { INITIAL_PROGRESSION } from '@/domain';
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
});
