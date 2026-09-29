import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

const mockApi = { createChallenge: jest.fn() };
jest.mock('./api', () => ({
  createChallenge: (...a: unknown[]) => mockApi.createChallenge(...a),
  socialErrorMessage: () => 'Couldn’t reach the server. Check your connection and try again.',
}));
jest.mock('@/services/firebase/auth', () => ({ useAuth: () => ({ uid: 'guest-anon-uid' }) }));
const mockTrack = jest.fn();
jest.mock('@/services/analytics', () => ({ track: (...a: unknown[]) => mockTrack(...a) }));
const mockShare = jest.fn(() => Promise.resolve());
jest.mock('./shareInvite', () => ({ shareChallenge: (...a: unknown[]) => mockShare(...(a as [])) }));

// eslint-disable-next-line import/first
import { ChallengeFromRun } from './ChallengeFromRun';

const ids = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'];

describe('ChallengeFromRun', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders nothing unless there are exactly 8 questions', () => {
    render(<ChallengeFromRun questionIds={ids.slice(0, 5)} source="daily" />);
    expect(screen.queryByTestId('challenge-from-run')).toBeNull();
  });

  it('creates a challenge from these questions, tracks it and opens the share sheet (guests too)', async () => {
    mockApi.createChallenge.mockResolvedValue({ code: 'ABC234', url: 'https://x/c/ABC234' });
    render(<ChallengeFromRun questionIds={ids} source="daily" />);
    fireEvent.press(screen.getByTestId('challenge-from-run'));
    await waitFor(() => expect(mockShare).toHaveBeenCalledWith('https://x/c/ABC234', expect.any(String)));
    expect(mockApi.createChallenge).toHaveBeenCalledWith({ questionIds: ids, name: expect.any(String) });
    expect(mockTrack).toHaveBeenCalledWith('challenge_created', { source: 'daily' });
  });

  it('shows a friendly error and lets the player retry', async () => {
    mockApi.createChallenge.mockRejectedValueOnce(new Error('unavailable'));
    render(<ChallengeFromRun questionIds={ids} source="daily" />);
    fireEvent.press(screen.getByTestId('challenge-from-run'));
    expect(await screen.findByText(/Couldn’t reach the server/)).toBeTruthy();
    expect(mockTrack).not.toHaveBeenCalled();

    mockApi.createChallenge.mockResolvedValueOnce({ code: 'ABC234', url: 'https://x/c/ABC234' });
    fireEvent.press(screen.getByTestId('challenge-from-run'));
    await waitFor(() => expect(mockShare).toHaveBeenCalled());
    expect(screen.queryByText(/Couldn’t reach the server/)).toBeNull();
  });
});
