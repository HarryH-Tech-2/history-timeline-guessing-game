import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { Question } from '@/domain';
import { dateKey } from '@/utils/date';

const mockQuestions: Question[] = [
  {
    id: 'evt-a',
    categoryId: 'events',
    title: 'First Event',
    subtitle: 'The first one',
    year: 1500,
    difficulty: 'easy',
    country: 'Nowhere',
    region: 'Somewhere',
    latitude: 0,
    longitude: 0,
    shortDescription: 'a',
    longDescription: 'The first event happened long ago.',
    tags: [],
    verified: true,
    featured: false,
  },
];

jest.mock('@/data', () => ({ getDailyQuestions: () => mockQuestions }));

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));

// Pretend Firebase is configured so SaveProvider follows the auth uid...
jest.mock('@/config/env', () => ({ isFirebaseConfigured: true, firebaseConfig: {} }));

// ...but keep the cloud empty and inert, so only local state is under test.
jest.mock('@/storage/cloudSaves', () => ({
  cloudSaves: {
    load: () => Promise.resolve(null),
    save: () => Promise.resolve(),
  },
}));

const auth = { uid: null as string | null, isLoading: true };
jest.mock('@/services/firebase/auth', () => ({ useAuth: () => auth }));

/* eslint-disable import/first */
import { ProgressionProvider, useProgression } from '@/features/progression';
import { SaveProvider } from '@/features/save';

import { useDailySession } from './useDailySession';
/* eslint-enable import/first */

function wrapper({ children }: { children: ReactNode }) {
  return (
    <SaveProvider>
      <ProgressionProvider>{children}</ProgressionProvider>
    </SaveProvider>
  );
}

function useProbe() {
  return { daily: useDailySession(), progression: useProgression() };
}

const today = dateKey();

function recordFor(score: number) {
  return { date: today, totalScore: score, perfectCount: 0, rounds: [] };
}

describe('useDailySession across accounts', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    auth.uid = null;
    auth.isLoading = true;
  });

  it("does not leak the previous account's Daily record after a uid switch", async () => {
    // user-a already played today; user-b has not.
    await AsyncStorage.setItem(`chronos.daily:user-a`, JSON.stringify(recordFor(1234)));
    auth.uid = 'user-a';
    auth.isLoading = false;

    const view = renderHook(useProbe, { wrapper });
    await waitFor(() => expect(view.result.current.daily.locked).toBe(true));
    expect(view.result.current.daily.record?.totalScore).toBe(1234);

    auth.uid = 'user-b';
    await act(async () => {
      view.rerender(undefined);
    });

    await waitFor(() => expect(view.result.current.daily.loading).toBe(false));
    expect(view.result.current.daily.locked).toBe(false);
    expect(view.result.current.daily.record).toBeNull();
  });

  it('banks a run finished before the account was ready, streak credit included', async () => {
    // Auth is still resolving, so no store is ready yet.
    const view = renderHook(useProbe, { wrapper });
    expect(view.result.current.daily.locked).toBe(false);

    act(() => {
      view.result.current.daily.session.submit(1500);
    });
    act(() => {
      view.result.current.daily.session.advance();
    });
    expect(view.result.current.daily.session.status).toBe('finished');

    auth.uid = 'user-a';
    auth.isLoading = false;
    await act(async () => {
      view.rerender(undefined);
    });

    await waitFor(() => expect(view.result.current.daily.record).not.toBeNull());
    // Persisted under the account...
    await waitFor(async () => {
      expect(await AsyncStorage.getItem('chronos.daily:user-a')).not.toBeNull();
    });
    // ...and the Daily streak was credited, not dropped mid-hydration.
    await waitFor(() => expect(view.result.current.progression.state.streak.count).toBe(1));
  });
});
