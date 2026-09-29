import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

const mockApi = {
  fetchChallenge: jest.fn(),
  fetchEntries: jest.fn(),
  submitChallengeEntry: jest.fn(),
  markSeen: jest.fn(() => Promise.resolve()),
  isAlreadyPlayed: (err: unknown) =>
    (err as { code?: string } | null)?.code === 'functions/already-exists',
  socialErrorCode: (err: unknown) =>
    ((err as { code?: string } | null)?.code ?? '').replace(/^functions\//, ''),
  socialErrorMessage: (err?: unknown) =>
    (err as { code?: string } | null)?.code === 'functions/failed-precondition'
      ? 'This challenge has expired.'
      : 'Couldn’t reach the server. Check your connection and try again.',
};
// Delegates lazily: the component module (and so this factory) loads before
// `mockApi` above is initialised.
jest.mock('./api', () => ({
  fetchChallenge: (...a: unknown[]) => mockApi.fetchChallenge(...a),
  fetchEntries: (...a: unknown[]) => mockApi.fetchEntries(...a),
  submitChallengeEntry: (...a: unknown[]) => mockApi.submitChallengeEntry(...a),
  markSeen: (...a: unknown[]) => mockApi.markSeen(...(a as [])),
  isAlreadyPlayed: (err: unknown) => mockApi.isAlreadyPlayed(err),
  socialErrorCode: (err: unknown) => mockApi.socialErrorCode(err),
  socialErrorMessage: (err: unknown) => mockApi.socialErrorMessage(err),
}));
let mockCanGoBack = true;
const mockBack = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace, canGoBack: () => mockCanGoBack }),
}));
let mockUid = 'me';
jest.mock('@/services/firebase/auth', () => ({ useAuth: () => ({ uid: mockUid }) }));
const mockShare = jest.fn(() => Promise.resolve());
jest.mock('./shareInvite', () => ({
  ...jest.requireActual('./shareInvite'),
  shareChallenge: (...a: unknown[]) => mockShare(...(a as [])),
}));
const mockTrack = jest.fn();
jest.mock('@/services/analytics', () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));
// A stand-in round: a press guesses 1900 while guessing, and advances once
// revealed. Records its props so tests can check challenge runs get no assist.
const mockRoundProps: Record<string, unknown>[] = [];
let mockGuess = 1900;
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
          onPress={() => (props.phase === 'guessing' ? props.onSubmit(mockGuess) : props.onNext())}
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

async function press(times: number) {
  for (let i = 0; i < times; i++) {
    await act(async () => {
      fireEvent.press(screen.getByTestId('fake-round'));
    });
  }
}

async function playEightRounds() {
  for (let i = 0; i < 16; i++) {
    await act(async () => {
      fireEvent.press(screen.getByTestId('fake-round'));
    });
  }
}

describe('ChallengeScreen', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockGuess = 1900;
    mockRoundProps.length = 0;
    mockUid = 'me';
    mockCanGoBack = true;
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

  it('treats an invalid code as no match without reading Firestore', async () => {
    render(<ChallengeScreen code="" via="link" />);
    await waitFor(() => expect(screen.getByText(/doesn’t match/)).toBeOnTheScreen());
    expect(mockApi.fetchChallenge).not.toHaveBeenCalled();
  });

  it('goes back when there is history', async () => {
    mockApi.fetchChallenge.mockResolvedValue(null);
    mockApi.fetchEntries.mockResolvedValue([]);
    render(<ChallengeScreen code="ABC234" via="code" />);
    await waitFor(() => expect(screen.getByText(/doesn’t match/)).toBeOnTheScreen());
    fireEvent.press(screen.getByText('Back'));
    expect(mockBack).toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('goes home from a cold app-link open with no history', async () => {
    mockCanGoBack = false;
    mockApi.fetchChallenge.mockResolvedValue({ ...base, questionIds: ids });
    mockApi.fetchEntries.mockResolvedValue([e('sam', 600), e('me', 700)]);
    render(<ChallengeScreen code="ABC234" via="link" />);
    await waitFor(() => expect(screen.getByTestId('head-to-head-done')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('head-to-head-done'));
    expect(mockReplace).toHaveBeenCalledWith('/');
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('offers retry and a way out when a submit fails transiently', async () => {
    mockCanGoBack = false;
    mockApi.fetchChallenge.mockResolvedValue({ ...base, questionIds: ids });
    mockApi.fetchEntries.mockResolvedValue([e('sam', 600)]);
    mockApi.submitChallengeEntry.mockRejectedValue(new Error('offline'));
    render(<ChallengeScreen code="ABC234" via="link" />);
    await waitFor(() => expect(screen.getByTestId('fake-round')).toBeOnTheScreen());
    await playEightRounds();
    await waitFor(() => expect(screen.getByTestId('challenge-submit-retry')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('challenge-submit-back'));
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('hides retry when the submit can never succeed', async () => {
    mockApi.fetchChallenge.mockResolvedValue({ ...base, questionIds: ids });
    mockApi.fetchEntries.mockResolvedValue([e('sam', 600)]);
    mockApi.submitChallengeEntry.mockRejectedValue({ code: 'functions/failed-precondition' });
    render(<ChallengeScreen code="ABC234" via="link" />);
    await waitFor(() => expect(screen.getByTestId('fake-round')).toBeOnTheScreen());
    await playEightRounds();
    await waitFor(() => expect(screen.getByText('This challenge has expired.')).toBeOnTheScreen());
    expect(screen.queryByTestId('challenge-submit-retry')).toBeNull();
    fireEvent.press(screen.getByTestId('challenge-submit-back'));
    expect(mockBack).toHaveBeenCalled();
  });

  it('resumes a quit run at the next unanswered round, keeping the earlier guesses', async () => {
    mockApi.fetchChallenge.mockResolvedValue({ ...base, questionIds: ids });
    mockApi.fetchEntries.mockResolvedValue([e('sam', 600)]);
    mockApi.submitChallengeEntry.mockResolvedValue({});
    const first = render(<ChallengeScreen code="ABC234" via="link" />);
    await waitFor(() => expect(screen.getByText('Question 1/8')).toBeOnTheScreen());
    mockGuess = 1500;
    // Submit round 1, next, round 2, next, round 3: round 3's answer is revealed.
    await press(5);
    first.unmount();

    mockGuess = 1900;
    render(<ChallengeScreen code="ABC234" via="link" />);
    await waitFor(() => expect(screen.getByText('Question 4/8')).toBeOnTheScreen());
    expect(screen.getByText(ids[3]!)).toBeOnTheScreen();
    // Rounds 4–8: submit + next (Finish) each.
    await press(10);
    await waitFor(() => expect(mockApi.submitChallengeEntry).toHaveBeenCalledTimes(1));
    expect(mockApi.submitChallengeEntry).toHaveBeenCalledWith(
      expect.objectContaining({ guessYears: [1500, 1500, 1500, 1900, 1900, 1900, 1900, 1900] }),
    );
  });

  it('forgets the stored progress once the entry is submitted', async () => {
    mockApi.fetchChallenge.mockResolvedValue({ ...base, questionIds: ids });
    mockApi.fetchEntries.mockResolvedValueOnce([e('sam', 600)]);
    mockApi.fetchEntries.mockResolvedValue([e('sam', 600), e('me', 700)]);
    mockApi.submitChallengeEntry.mockResolvedValue({});
    render(<ChallengeScreen code="ABC234" via="link" />);
    await waitFor(() => expect(screen.getByTestId('fake-round')).toBeOnTheScreen());
    await playEightRounds();
    await waitFor(() => expect(screen.getByTestId('head-to-head')).toBeOnTheScreen());
    const keys = await AsyncStorage.getAllKeys();
    expect(keys.filter((k) => k.includes('ABC234'))).toEqual([]);
  });

  it('submits a fully answered run straight away if the app closed before submitting', async () => {
    mockApi.fetchChallenge.mockResolvedValue({ ...base, questionIds: ids });
    mockApi.fetchEntries.mockResolvedValue([e('sam', 600)]);
    mockApi.submitChallengeEntry.mockRejectedValue(new Error('offline'));
    const first = render(<ChallengeScreen code="ABC234" via="link" />);
    await waitFor(() => expect(screen.getByTestId('fake-round')).toBeOnTheScreen());
    await playEightRounds();
    await waitFor(() => expect(screen.getByTestId('challenge-submit-retry')).toBeOnTheScreen());
    first.unmount();

    mockApi.submitChallengeEntry.mockReset().mockResolvedValue({});
    mockApi.fetchEntries.mockResolvedValueOnce([e('sam', 600)]);
    mockApi.fetchEntries.mockResolvedValue([e('sam', 600), e('me', 700)]);
    render(<ChallengeScreen code="ABC234" via="link" />);
    await waitFor(() => expect(screen.getByTestId('head-to-head')).toBeOnTheScreen());
    expect(mockApi.submitChallengeEntry).toHaveBeenCalledTimes(1);
    expect(mockApi.submitChallengeEntry).toHaveBeenCalledWith(
      expect.objectContaining({ guessYears: Array(8).fill(1900) }),
    );
  });

  it('offers “Challenge more friends” only to the creator', async () => {
    mockApi.fetchChallenge.mockResolvedValue({ ...base, questionIds: ids });
    mockApi.fetchEntries.mockResolvedValue([e('sam', 600), e('me', 700)]);
    const view = render(<ChallengeScreen code="ABC234" via="link" />);
    await waitFor(() => expect(screen.getByTestId('head-to-head')).toBeOnTheScreen());
    expect(screen.queryByText(/Challenge more friends/)).toBeNull();
    view.unmount();

    mockUid = 'sam';
    render(<ChallengeScreen code="ABC234" via="link" />);
    await waitFor(() => expect(screen.getByTestId('head-to-head')).toBeOnTheScreen());
    fireEvent.press(screen.getByText(/Challenge more friends/));
    expect(mockShare).toHaveBeenCalled();
  });

  it('shows my own total while waiting for the creator, and to the creator', async () => {
    mockApi.fetchChallenge.mockResolvedValue({ ...base, questionIds: ids });
    mockApi.fetchEntries.mockResolvedValue([e('me', 700)]);
    const view = render(<ChallengeScreen code="ABC234" via="link" />);
    await waitFor(() => expect(screen.getByText('Waiting for Sam')).toBeOnTheScreen());
    expect(screen.getByText('Your score: 5,600')).toBeOnTheScreen();
    view.unmount();

    mockUid = 'sam';
    mockApi.fetchEntries.mockResolvedValue([e('sam', 600)]);
    render(<ChallengeScreen code="ABC234" via="link" />);
    await waitFor(() => expect(screen.getByText('Waiting for friends')).toBeOnTheScreen());
    expect(screen.getByText('Your score: 4,800')).toBeOnTheScreen();
  });

  it('marks the challenge seen with its entry count once loaded', async () => {
    mockApi.fetchChallenge.mockResolvedValue({ ...base, questionIds: ids });
    mockApi.fetchEntries.mockResolvedValueOnce([e('sam', 600)]);
    mockApi.fetchEntries.mockResolvedValue([e('sam', 600), e('me', 700)]);
    mockApi.submitChallengeEntry.mockResolvedValue({});
    render(<ChallengeScreen code="ABC234" via="link" />);
    await waitFor(() => expect(mockApi.markSeen).toHaveBeenCalledWith('me', 'ABC234', 1));
    await playEightRounds();
    await waitFor(() => expect(mockApi.markSeen).toHaveBeenCalledWith('me', 'ABC234', 2));
    expect(mockApi.markSeen).toHaveBeenCalledTimes(2);
  });
});
