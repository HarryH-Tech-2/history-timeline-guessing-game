import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

const mockApi = {
  fetchSocialState: jest.fn(),
  fetchGroup: jest.fn(),
  createGroup: jest.fn(),
};
jest.mock('./api', () => ({
  fetchSocialState: (...a: unknown[]) => mockApi.fetchSocialState(...a),
  fetchGroup: (...a: unknown[]) => mockApi.fetchGroup(...a),
  createGroup: (...a: unknown[]) => mockApi.createGroup(...a),
  socialErrorMessage: () => 'Couldn’t reach the server. Check your connection and try again.',
}));
const mockPush = jest.fn();
jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return {
    useRouter: () => ({ push: mockPush }),
    useFocusEffect: (cb: () => void | (() => void)) => useEffect(cb, [cb]),
  };
});
jest.mock('@/services/firebase/auth', () => ({
  useAuth: () => ({ uid: 'me', isSignedIn: true, hasAccount: true }),
}));
const mockTrack = jest.fn();
jest.mock('@/services/analytics', () => ({ track: (...a: unknown[]) => mockTrack(...a) }));
const mockShare = jest.fn(() => Promise.resolve());
jest.mock('./shareInvite', () => ({
  ...jest.requireActual('./shareInvite'),
  shareGroup: (...a: unknown[]) => mockShare(...(a as [])),
}));

// eslint-disable-next-line import/first
import { GroupsPanel } from './GroupsPanel';

const group = (id: string, name: string) => ({
  id,
  name,
  ownerUid: 'me',
  inviteCode: 'ABC234',
  memberUids: ['me', 'sis'],
  createdAt: 1,
});

describe('GroupsPanel', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists the player’s groups, skipping ones they have left', async () => {
    mockApi.fetchSocialState.mockResolvedValue({ groupIds: ['g1', 'g2'], challengeCodes: [], seen: {} });
    mockApi.fetchGroup.mockImplementation(async (id: string) => (id === 'g1' ? group('g1', 'Family') : null));
    render(<GroupsPanel />);
    fireEvent.press(await screen.findByText('Family'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/group/[id]', params: { id: 'g1' } });
    expect(screen.getByText('2 members ›')).toBeOnTheScreen();
  });

  it('shows an error with retry when groups can’t load', async () => {
    mockApi.fetchSocialState.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({
      groupIds: ['g1'],
      challengeCodes: [],
      seen: {},
    });
    mockApi.fetchGroup.mockResolvedValue(group('g1', 'Family'));
    render(<GroupsPanel />);
    fireEvent.press(await screen.findByTestId('groups-retry'));
    expect(await screen.findByText('Family')).toBeOnTheScreen();
  });

  it('creates a group, shares the invite and opens it', async () => {
    mockApi.fetchSocialState.mockResolvedValue({ groupIds: [], challengeCodes: [], seen: {} });
    mockApi.createGroup.mockResolvedValue({ groupId: 'g9', inviteCode: 'XYZ789', url: 'https://x/g/XYZ789' });
    render(<GroupsPanel />);
    fireEvent.changeText(screen.getByTestId('group-name-input'), '  Work  ');
    fireEvent.press(screen.getByTestId('group-create'));
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith({ pathname: '/group/[id]', params: { id: 'g9' } }),
    );
    expect(mockApi.createGroup).toHaveBeenCalledWith('Work');
    expect(mockShare).toHaveBeenCalledWith('https://x/g/XYZ789', 'Work');
    expect(mockTrack).toHaveBeenCalledWith('group_created');
  });

  it('opens the join confirmation for a typed code', async () => {
    mockApi.fetchSocialState.mockResolvedValue({ groupIds: [], challengeCodes: [], seen: {} });
    render(<GroupsPanel />);
    fireEvent.changeText(screen.getByTestId('group-code-input'), 'abc234');
    fireEvent.press(screen.getByTestId('group-code'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/g/[code]', params: { code: 'ABC234', via: 'code' } });
    await waitFor(() => expect(mockApi.fetchSocialState).toHaveBeenCalled());
  });
});
