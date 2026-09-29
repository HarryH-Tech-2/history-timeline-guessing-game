import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

const mockJoin = jest.fn();
jest.mock('./api', () => ({
  joinGroup: (...a: unknown[]) => mockJoin(...a),
  socialErrorMessage: (e: unknown) =>
    (e as { code?: string } | null)?.code === 'functions/not-found'
      ? 'That code doesn’t match anything. Check it and try again.'
      : 'Couldn’t reach the server. Check your connection and try again.',
}));
let mockCanGoBack = true;
const mockBack = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace, push: jest.fn(), canGoBack: () => mockCanGoBack }),
}));
jest.mock('@/services/firebase/auth', () => ({ useAuth: () => ({ uid: 'me', isSignedIn: true, hasAccount: true }) }));
const mockTrack = jest.fn();
jest.mock('@/services/analytics', () => ({ track: (...a: unknown[]) => mockTrack(...a) }));

// eslint-disable-next-line import/first
import { JoinGroupScreen } from './JoinGroupScreen';

describe('JoinGroupScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanGoBack = true;
  });

  it('joins only on tap, then opens the group', async () => {
    mockJoin.mockResolvedValue({ groupId: 'g1' });
    render(<JoinGroupScreen code="abc234" via="link" />);
    expect(mockJoin).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('group-join'));
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith({ pathname: '/group/[id]', params: { id: 'g1' } }),
    );
    expect(mockJoin).toHaveBeenCalledWith('ABC234');
    expect(mockTrack).toHaveBeenCalledWith('group_joined', { via: 'link' });
  });

  it('explains an unknown code in plain words', async () => {
    mockJoin.mockRejectedValue({ code: 'functions/not-found' });
    render(<JoinGroupScreen code="ABC234" via="code" />);
    fireEvent.press(screen.getByTestId('group-join'));
    expect(await screen.findByText(/doesn’t match anything/)).toBeOnTheScreen();
  });

  it('never calls the server for a malformed code', () => {
    render(<JoinGroupScreen code="nope" via="link" />);
    expect(screen.getByText('That doesn’t look like a group code.')).toBeOnTheScreen();
    expect(screen.queryByTestId('group-join')).toBeNull();
  });

  it('goes home from a cold link open', () => {
    mockCanGoBack = false;
    render(<JoinGroupScreen code="ABC234" via="link" />);
    fireEvent.press(screen.getByText('Not now'));
    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});
