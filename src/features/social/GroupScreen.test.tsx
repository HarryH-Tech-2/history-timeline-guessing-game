import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert, type AlertButton } from 'react-native';

import { weekKey } from '@/utils/date';

const mockApi = {
  fetchGroup: jest.fn(),
  fetchMemberRows: jest.fn(),
  leaveGroup: jest.fn(),
};
jest.mock('./api', () => ({
  fetchGroup: (...a: unknown[]) => mockApi.fetchGroup(...a),
  fetchMemberRows: (...a: unknown[]) => mockApi.fetchMemberRows(...a),
  leaveGroup: (...a: unknown[]) => mockApi.leaveGroup(...a),
  socialErrorMessage: () => 'Couldn’t reach the server. Check your connection and try again.',
}));
let mockCanGoBack = true;
const mockBack = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return {
    useRouter: () => ({ back: mockBack, replace: mockReplace, canGoBack: () => mockCanGoBack }),
    useFocusEffect: (cb: () => void | (() => void)) => useEffect(cb, [cb]),
  };
});
jest.mock('@/services/firebase/auth', () => ({ useAuth: () => ({ uid: 'me' }) }));
const mockTrack = jest.fn();
jest.mock('@/services/analytics', () => ({ track: (...a: unknown[]) => mockTrack(...a) }));
jest.mock('./shareInvite', () => ({
  ...jest.requireActual('./shareInvite'),
  shareGroup: jest.fn(() => Promise.resolve()),
}));

// eslint-disable-next-line import/first
import { GroupScreen } from './GroupScreen';

const group = {
  id: 'g1',
  name: 'Family',
  ownerUid: 'me',
  inviteCode: 'ABC234',
  memberUids: ['me', 'sis', 'house-1'],
  createdAt: 1,
};

describe('GroupScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanGoBack = true;
  });

  /** Press Leave group, then the confirm dialog's button labelled `choice`. */
  async function leaveVia(choice: 'Leave' | 'Cancel') {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    fireEvent.press(await screen.findByTestId('group-leave'));
    expect(alert).toHaveBeenCalledTimes(1);
    const buttons = (alert.mock.calls[0]![2] ?? []) as AlertButton[];
    buttons.find((b) => b.text === choice)?.onPress?.();
    alert.mockRestore();
  }

  it('shows this week’s board; members without a row score 0 and house rows never appear', async () => {
    mockApi.fetchGroup.mockResolvedValue(group);
    mockApi.fetchMemberRows.mockResolvedValue([
      { uid: 'me', displayName: 'Harry', weekKey: weekKey(), weekXp: 300 },
      { uid: 'house-1', displayName: 'Ghost', weekKey: weekKey(), weekXp: 9999 },
    ]);
    render(<GroupScreen groupId="g1" />);
    expect(await screen.findByText('1. Harry')).toBeOnTheScreen();
    expect(screen.getByText('300 XP')).toBeOnTheScreen();
    expect(screen.getByText('0 XP')).toBeOnTheScreen();
    expect(screen.queryByText(/Ghost/)).toBeNull();
    expect(mockApi.fetchMemberRows).toHaveBeenCalledWith(['me', 'sis']);
  });

  it('ends the spinner with an error and retries', async () => {
    mockApi.fetchGroup.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(group);
    mockApi.fetchMemberRows.mockResolvedValue([]);
    render(<GroupScreen groupId="g1" />);
    fireEvent.press(await screen.findByTestId('group-retry'));
    expect(await screen.findByText('Family')).toBeOnTheScreen();
    expect(mockApi.fetchGroup).toHaveBeenCalledTimes(2);
  });

  it('treats a failed board read as a load error too', async () => {
    mockApi.fetchGroup.mockResolvedValue(group);
    mockApi.fetchMemberRows.mockRejectedValue(new Error('offline'));
    render(<GroupScreen groupId="g1" />);
    expect(await screen.findByTestId('group-retry')).toBeOnTheScreen();
  });

  it('says so when the player is no longer a member, and leaves home on a cold open', async () => {
    mockCanGoBack = false;
    mockApi.fetchGroup.mockResolvedValue(null);
    render(<GroupScreen groupId="g1" />);
    fireEvent.press(await screen.findByText('Back'));
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('leaves the group', async () => {
    mockApi.fetchGroup.mockResolvedValue(group);
    mockApi.fetchMemberRows.mockResolvedValue([]);
    mockApi.leaveGroup.mockResolvedValue({ ok: true });
    render(<GroupScreen groupId="g1" />);
    await leaveVia('Leave');
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(mockApi.leaveGroup).toHaveBeenCalledWith('g1');
    expect(mockTrack).toHaveBeenCalledWith('group_left');
  });

  it('shows an error when leaving fails', async () => {
    mockApi.fetchGroup.mockResolvedValue(group);
    mockApi.fetchMemberRows.mockResolvedValue([]);
    mockApi.leaveGroup.mockRejectedValue(new Error('offline'));
    render(<GroupScreen groupId="g1" />);
    await leaveVia('Leave');
    expect(await screen.findByText(/Couldn’t reach the server/)).toBeOnTheScreen();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('asks before leaving, and Cancel keeps the player in the group', async () => {
    mockApi.fetchGroup.mockResolvedValue(group);
    mockApi.fetchMemberRows.mockResolvedValue([]);
    render(<GroupScreen groupId="g1" />);
    await leaveVia('Cancel');
    expect(mockApi.leaveGroup).not.toHaveBeenCalled();
  });
});
