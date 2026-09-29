import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

const mockApi = {
  fetchChallenge: jest.fn(),
  fetchEntries: jest.fn(),
  submitChallengeEntry: jest.fn(),
  isAlreadyPlayed: (err: unknown) =>
    (err as { code?: string } | null)?.code === 'functions/already-exists',
  socialErrorMessage: () => 'Couldn’t reach the server. Check your connection and try again.',
};
// Delegates lazily: the component module (and so this factory) loads before
// `mockApi` above is initialised.
jest.mock('./api', () => ({
  fetchChallenge: (...a: unknown[]) => mockApi.fetchChallenge(...a),
  fetchEntries: (...a: unknown[]) => mockApi.fetchEntries(...a),
  submitChallengeEntry: (...a: unknown[]) => mockApi.submitChallengeEntry(...a),
  isAlreadyPlayed: (err: unknown) => mockApi.isAlreadyPlayed(err),
  socialErrorMessage: () => mockApi.socialErrorMessage(),
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), replace: jest.fn() }) }));
let mockUid = 'me';
jest.mock('@/services/firebase/auth', () => ({ useAuth: () => ({ uid: mockUid }) }));
const mockTrack = jest.fn();
jest.mock('@/services/analytics', () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));
// A stand-in round: a press guesses 1900 while guessing, and advances once
// revealed. Records its props so tests can check challenge runs get no assist.
const mockRoundProps: Record<string, unknown>[] = [];
jest.mock('@/features/round', () => {
  const { Pressable, Text } = require('react-native');
  const { useGameSession } = jest.requireActual('@/features/round/useGameSession');
  return {
    useGameSession,
    RoundView: (props: {
      question: { id: string };
      phase: string;
      onSubmit: (y: number) => void;
      onNext: () => void;
    }) => {
      mockRoundProps.push(props);
      return (
        <Pressable
          testID="fake-round"
          onPress={() => (props.phase === 'guessing' ? props.onSubmit(1900) : props.onNext())}
        >
          <Text>{props.question.id}</Text>
        </Pressable>
      );
    },
  };
});

// eslint-disable-next-line import/first
import { ChallengeScreen } from './ChallengeScreen';

const ids = [
  'bat-cannae',
  'bat-zama',
  'bat-yorktown',
  'evt-hijra',
  'trd-jiaozi',
  'reg-granada-falls',
  'spc-curiosity',
  'trt-utrecht',
];
const base = {
  code: 'ABC234',
  creatorUid: 'sam',
  creatorName: 'Sam',
  createdAt: 1,
  expiresAt: Date.now() + 1e6,
};
const e = (uid: string, s: number) => ({
  uid,
  name: uid,
  guessYears: Array(8).fill(1900),
  roundScores: Array(8).fill(s),
  total: s * 8,
  finishedAt: 1,
});

async function playEightRounds() {
  for (let i = 0; i < 16; i++) {
    await act(async () => {
      fireEvent.press(screen.getByTestId('fake-round'));
    });
  }
}

describe('ChallengeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRoundProps.length = 0;
    mockUid = 'me';
  });

  it('asks for an update when this build lacks a question', async () => {
    mockApi.fetchChallenge.mockResolvedValue({ ...base, questionIds: Array(8).fill('not-in-build') });
    mockApi.fetchEntries.mockResolvedValue([]);
    render(<ChallengeScreen code="ABC234" via="link" />);
    await waitFor(() => expect(screen.getByText(/Update the app/)).toBeOnTheScreen());
  });

  it('asks for an update when the challenge is not exactly 8 questions', async () => {
    mockApi.fetchChallenge.mockResolvedValue({ ...base, questionIds: ids.slice(0, 7) });
    mockApi.fetchEntries.mockResolvedValue([]);
    render(<ChallengeScreen code="ABC234" via="link" />);
    await waitFor(() => expect(screen.getByText(/Update the app/)).toBeOnTheScreen());
  });

  it('says so when the code matches nothing', async () => {
    mockApi.fetchChallenge.mockResolvedValue(null);
    mockApi.fetchEntries.mockResolvedValue([]);
    render(<ChallengeScreen code="ABC234" via="code" />);
    await waitFor(() => expect(screen.getByText(/doesn’t match/)).toBeOnTheScreen());
    expect(mockTrack).toHaveBeenCalledWith('challenge_opened', { via: 'code' });
  });

  it('says so when the challenge has expired', async () => {
    mockApi.fetchChallenge.mockResolvedValue({ ...base, questionIds: ids, expiresAt: Date.now() - 1 });
    mockApi.fetchEntries.mockResolvedValue([e('sam', 600)]);
    render(<ChallengeScreen code="ABC234" via="link" />);
    await waitFor(() => expect(screen.getByText(/expired/)).toBeOnTheScreen());
  });

  it('ends the spinner with an error and retry when loading fails', async () => {
    mockApi.fetchChallenge.mockRejectedValueOnce(new Error('offline'));
    mockApi.fetchEntries.mockResolvedValue([]);
    render(<ChallengeScreen code="ABC234" via="link" />);
    await waitFor(() => expect(screen.getByText(/Couldn’t reach the server/)).toBeOnTheScreen());
    mockApi.fetchChallenge.mockResolvedValue(null);
    await act(async () => {
      fireEvent.press(screen.getByTestId('challenge-retry'));
    });
    await waitFor(() => expect(screen.getByText(/doesn’t match/)).toBeOnTheScreen());
  });

  it('shows the head-to-head straight away if I already played', async () => {
    mockApi.fetchChallenge.mockResolvedValue({ ...base, questionIds: ids });
    mockApi.fetchEntries.mockResolvedValue([e('sam', 600), e('me', 700)]);
    render(<ChallengeScreen code="ABC234" via="link" />);
    await waitFor(() => expect(screen.getByTestId('head-to-head')).toBeOnTheScreen());
    expect(screen.getByText(/You won/)).toBeOnTheScreen();
    // Re-viewing a finished challenge is not a completion.
    expect(mockTrack).not.toHaveBeenCalledWith('challenge_completed', expect.anything());
  });

  it('plays 8 plain rounds, submits them once and shows the result', async () => {
    mockApi.fetchChallenge.mockResolvedValue({ ...base, questionIds: ids });
    mockApi.fetchEntries.mockResolvedValueOnce([e('sam', 600)]);
    mockApi.fetchEntries.mockResolvedValue([e('sam', 600), e('me', 700)]);
    mockApi.submitChallengeEntry.mockResolvedValue({});
    render(<ChallengeScreen code="ABC234" via="link" />);
    await waitFor(() => expect(screen.getByText('Sam’s challenge')).toBeOnTheScreen());
    await playEightRounds();
    await waitFor(() => expect(screen.getByTestId('head-to-head')).toBeOnTheScreen());
    expect(mockApi.submitChallengeEntry).toHaveBeenCalledTimes(1);
    expect(mockApi.submitChallengeEntry).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'ABC234', guessYears: Array(8).fill(1900) }),
    );
    expect(mockRoundProps.length).toBeGreaterThan(0);
    expect(mockRoundProps.every((p) => p.assist === undefined)).toBe(true);
    const completed = mockTrack.mock.calls.filter(([name]) => name === 'challenge_completed');
    expect(completed).toEqual([['challenge_completed', { won: true }]]);
  });

  it('treats an already-played rejection as played and shows the head-to-head', async () => {
    mockApi.fetchChallenge.mockResolvedValue({ ...base, questionIds: ids });
    mockApi.fetchEntries.mockResolvedValueOnce([e('sam', 600)]);
    mockApi.fetchEntries.mockResolvedValue([e('sam', 600), e('me', 500)]);
    mockApi.submitChallengeEntry.mockRejectedValue({ code: 'functions/already-exists' });
    render(<ChallengeScreen code="ABC234" via="link" />);
    await waitFor(() => expect(screen.getByTestId('fake-round')).toBeOnTheScreen());
    await playEightRounds();
    await waitFor(() => expect(screen.getByTestId('head-to-head')).toBeOnTheScreen());
    expect(screen.getByText(/sam won/)).toBeOnTheScreen();
    expect(screen.queryByText(/Couldn’t reach/)).toBeNull();
  });

  it('lets the creator play once, then lists challengers instead of a you-vs-you', async () => {
    mockUid = 'sam';
    mockApi.fetchChallenge.mockResolvedValue({ ...base, questionIds: ids });
    mockApi.fetchEntries.mockResolvedValueOnce([]);
    mockApi.fetchEntries.mockResolvedValue([e('sam', 600), e('ana', 650)]);
    mockApi.submitChallengeEntry.mockResolvedValue({});
    render(<ChallengeScreen code="ABC234" via="link" />);
    await waitFor(() => expect(screen.getByText('Your challenge')).toBeOnTheScreen());
    await playEightRounds();
    await waitFor(() => expect(screen.getByTestId('head-to-head')).toBeOnTheScreen());
    expect(screen.getByText('1 friend played')).toBeOnTheScreen();
    expect(screen.getByText(/ana/)).toBeOnTheScreen();
    expect(screen.queryByText(/won/)).toBeNull();
  });
});
