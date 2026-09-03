import { renderHook, waitFor } from '@testing-library/react-native';

import { INITIAL_PROGRESSION, type ProgressionState } from '@/domain';

const mockPublish = jest.fn<Promise<void>, [string, unknown]>(() => Promise.resolve());
let mockState: ProgressionState = INITIAL_PROGRESSION;

jest.mock('@/config/env', () => ({ isFirebaseConfigured: true }));
jest.mock('./service', () => ({
  publishEntry: (uid: string, entry: unknown) => mockPublish(uid, entry),
}));
jest.mock('@/services/firebase/auth', () => ({
  useAuth: () => ({
    uid: 'uid-1',
    isSignedIn: true,
    hasAccount: true,
    isLoading: false,
    // A Google account with a real name attached — which must never be published.
    user: { uid: 'uid-1', displayName: 'Harry Harrison', email: 'h@example.com' },
  }),
}));
jest.mock('@/features/progression', () => ({
  useProgression: () => ({ state: mockState, isLoading: false }),
}));

// eslint-disable-next-line import/first
import { handleForUid } from './types';
// eslint-disable-next-line import/first
import { useLeaderboardSync } from './useLeaderboardSync';

describe('useLeaderboardSync', () => {
  beforeEach(() => {
    mockPublish.mockClear();
  });

  it('publishes the generated handle, not the Google name, when no name is chosen', async () => {
    mockState = { ...INITIAL_PROGRESSION, xp: 120, displayName: null };
    renderHook(() => useLeaderboardSync());
    await waitFor(() => expect(mockPublish).toHaveBeenCalledTimes(1));
    expect(mockPublish).toHaveBeenCalledWith(
      'uid-1',
      expect.objectContaining({ displayName: handleForUid('uid-1'), xp: 120 }),
    );
  });

  it('publishes the chosen name once one is set', async () => {
    mockState = { ...INITIAL_PROGRESSION, xp: 120, displayName: 'Chronos Fan' };
    renderHook(() => useLeaderboardSync());
    await waitFor(() => expect(mockPublish).toHaveBeenCalledTimes(1));
    expect(mockPublish).toHaveBeenCalledWith(
      'uid-1',
      expect.objectContaining({ displayName: 'Chronos Fan' }),
    );
  });
});
