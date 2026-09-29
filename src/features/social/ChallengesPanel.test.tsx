import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react-native';

const mockApi = {
  fetchSocialState: jest.fn(),
  fetchChallenge: jest.fn(),
  fetchEntries: jest.fn(),
  markSeen: jest.fn(() => Promise.resolve()),
  createChallenge: jest.fn(),
};
jest.mock('./api', () => ({
  fetchSocialState: (...a: unknown[]) => mockApi.fetchSocialState(...a),
  fetchChallenge: (...a: unknown[]) => mockApi.fetchChallenge(...a),
  fetchEntries: (...a: unknown[]) => mockApi.fetchEntries(...a),
  markSeen: (...a: unknown[]) => mockApi.markSeen(...(a as [])),
  createChallenge: (...a: unknown[]) => mockApi.createChallenge(...a),
  socialErrorMessage: () => 'Couldn’t reach the server. Check your connection and try again.',
}));
const mockPush = jest.fn();
jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return {
    useRouter: () => ({ push: mockPush }),
    // Run the focus callback as a plain effect (re-runs when it changes).
    useFocusEffect: (cb: () => void | (() => void)) => useEffect(cb, [cb]),
  };
});
jest.mock('@/services/firebase/auth', () => ({ useAuth: () => ({ uid: 'me' }) }));
const mockShare = jest.fn(() => Promise.resolve());
jest.mock('./shareInvite', () => ({
  ...jest.requireActual('./shareInvite'),
  shareChallenge: (...a: unknown[]) => mockShare(...(a as [])),
}));

// eslint-disable-next-line import/first
import { ChallengesPanel } from './ChallengesPanel';
// eslint-disable-next-line import/first
import { resetSocialBadgeForTests, useSocialBadge } from './useSocialBadge';

const challenge = {
  code: 'ABC234',
  creatorUid: 'sam',
  creatorName: 'Sam',
  questionIds: [],
  createdAt: 1,
  expiresAt: 2,
};
const entry = (uid: string, s: number) => ({
  uid,
  name: uid,
  guessYears: Array(8).fill(1900),
  roundScores: Array(8).fill(s),
  total: s * 8,
  finishedAt: 1,
});

describe('ChallengesPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetSocialBadgeForTests();
  });

  it('lists my challenges with where each stands', async () => {
    mockApi.fetchSocialState.mockResolvedValue({ challengeCodes: ['ABC234'], groupIds: [], seen: {} });
    mockApi.fetchChallenge.mockResolvedValue(challenge);
    mockApi.fetchEntries.mockResolvedValue([entry('sam', 500), entry('me', 500)]);
    render(<ChallengesPanel />);
    await waitFor(() => expect(screen.getByTestId('challenge-row-ABC234')).toBeOnTheScreen());
    expect(screen.getByTestId('challenges-panel')).toBeOnTheScreen();
    expect(screen.getByText('Sam’s challenge')).toBeOnTheScreen();
    expect(screen.getByText('It’s a tie')).toBeOnTheScreen();
    expect(mockApi.markSeen).toHaveBeenCalledWith('me', 'ABC234', 2);
  });

  it('shows an error with retry when the list cannot load', async () => {
    mockApi.fetchSocialState.mockRejectedValueOnce(new Error('offline'));
    render(<ChallengesPanel />);
    await waitFor(() => expect(screen.getByText(/Couldn’t reach the server/)).toBeOnTheScreen());
    mockApi.fetchSocialState.mockResolvedValue({ challengeCodes: ['ABC234'], groupIds: [], seen: {} });
    mockApi.fetchChallenge.mockResolvedValue(challenge);
    mockApi.fetchEntries.mockResolvedValue([]);
    await act(async () => {
      fireEvent.press(screen.getByTestId('challenges-retry'));
    });
    await waitFor(() => expect(screen.getByTestId('challenge-row-ABC234')).toBeOnTheScreen());
    expect(screen.queryByText(/Couldn’t reach the server/)).toBeNull();
  });

  it('creates a challenge, shares it and opens it', async () => {
    mockApi.fetchSocialState.mockResolvedValue({ challengeCodes: [], groupIds: [], seen: {} });
    mockApi.createChallenge.mockResolvedValue({ code: 'XYZ789', url: 'https://x/c/XYZ789' });
    render(<ChallengesPanel />);
    await act(async () => {
      fireEvent.press(screen.getByTestId('challenge-create'));
    });
    expect(mockShare).toHaveBeenCalledWith('https://x/c/XYZ789', expect.any(String));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/c/[code]', params: { code: 'XYZ789' } });
  });

  it('skips the seen write when the entry count has not changed', async () => {
    mockApi.fetchSocialState.mockResolvedValue({
      challengeCodes: ['ABC234'],
      groupIds: [],
      seen: { ABC234: 2 },
    });
    mockApi.fetchChallenge.mockResolvedValue(challenge);
    mockApi.fetchEntries.mockResolvedValue([entry('sam', 500), entry('me', 500)]);
    render(<ChallengesPanel />);
    await waitFor(() => expect(screen.getByTestId('challenge-row-ABC234')).toBeOnTheScreen());
    expect(mockApi.markSeen).not.toHaveBeenCalled();
  });

  it('clears the Social tab dot as soon as the panel marks results seen', async () => {
    mockApi.fetchSocialState.mockResolvedValue({ challengeCodes: ['ABC234'], groupIds: [], seen: { ABC234: 1 } });
    mockApi.fetchChallenge.mockResolvedValue(challenge);
    mockApi.fetchEntries.mockResolvedValue([entry('sam', 500), entry('me', 500)]);
    const badge = renderHook(() => useSocialBadge());
    await waitFor(() => expect(badge.result.current).toBe(true));

    render(<ChallengesPanel />);
    await waitFor(() => expect(screen.getByTestId('challenge-row-ABC234')).toBeOnTheScreen());
    expect(mockApi.markSeen).toHaveBeenCalledWith('me', 'ABC234', 2);
    await waitFor(() => expect(badge.result.current).toBe(false));
  });
});
