import { render, screen, waitFor } from '@testing-library/react-native';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { INITIAL_PROGRESSION } from '@/domain';
import { progressionSaves } from '@/features/progression/persistence';

import { SaveProvider, useSaves } from './SaveProvider';

// Pretend Firebase is configured so SaveProvider follows the auth uid...
jest.mock('@/config/env', () => ({ isFirebaseConfigured: true, firebaseConfig: {} }));

// ...but stub the Firestore adapter so nothing touches the SDK.
const mockCloud = { docs: new Map<string, unknown>() };
jest.mock('@/storage/cloudSaves', () => ({
  cloudSaves: {
    load: (uid: string, key: string) => Promise.resolve(mockCloud.docs.get(`${uid}/${key}`) ?? null),
    save: (uid: string, key: string, value: unknown) => {
      mockCloud.docs.set(`${uid}/${key}`, value);
      return Promise.resolve();
    },
  },
}));

const auth = { uid: null as string | null, isLoading: true };
jest.mock('@/services/firebase/auth', () => ({ useAuth: () => auth }));

function Probe() {
  const { uid, isReady } = useSaves();
  return <Text>{`uid:${uid} ready:${isReady}`}</Text>;
}

describe('SaveProvider', () => {
  beforeEach(() => {
    mockCloud.docs.clear();
    auth.uid = null;
    auth.isLoading = true;
  });

  it('is not ready while auth is still resolving', () => {
    render(
      <SaveProvider>
        <Probe />
      </SaveProvider>,
    );
    expect(screen.getByText('uid:local ready:false')).toBeOnTheScreen();
  });

  it('hydrates the auth uid and becomes ready', async () => {
    auth.uid = 'user-a';
    auth.isLoading = false;
    render(
      <SaveProvider>
        <Probe />
      </SaveProvider>,
    );
    await screen.findByText('uid:user-a ready:true');
  });

  it('switching uid re-hydrates and serves that account’s cloud save', async () => {
    mockCloud.docs.set('user-b/chronos.progression', { ...INITIAL_PROGRESSION, xp: 777 });
    auth.uid = 'user-a';
    auth.isLoading = false;

    function XpProbe() {
      const { uid, isReady, progression } = useSaves();
      const [xp, setXp] = useState<number | null>(null);
      useEffect(() => {
        if (!isReady) return;
        void progression.read().then((s) => setXp(s.xp));
      }, [uid, isReady, progression]);
      return <Text>{`uid:${uid} ready:${isReady} xp:${xp ?? '-'}`}</Text>;
    }

    const view = render(
      <SaveProvider>
        <XpProbe />
      </SaveProvider>,
    );
    await screen.findByText('uid:user-a ready:true xp:0');

    auth.uid = 'user-b';
    view.rerender(
      <SaveProvider>
        <XpProbe />
      </SaveProvider>,
    );
    await screen.findByText('uid:user-b ready:true xp:777');
    await waitFor(async () => {
      expect((await progressionSaves.forUser('user-b').read()).xp).toBe(777);
    });
  });

  it('falls back to the local uid when auth finished without a user', async () => {
    auth.uid = null;
    auth.isLoading = false;
    render(
      <SaveProvider>
        <Probe />
      </SaveProvider>,
    );
    await screen.findByText('uid:local ready:true');
  });
});

describe('useSaves without a provider', () => {
  it('serves the local uid, ready immediately', () => {
    render(<Probe />);
    expect(screen.getByText('uid:local ready:true')).toBeOnTheScreen();
  });
});
