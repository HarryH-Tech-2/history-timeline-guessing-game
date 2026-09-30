import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { INITIAL_PROGRESSION, type ProgressionState } from '@/domain';

import {
  AVATARS,
  avatarUnlockHint,
  DEFAULT_AVATAR,
  isAvatarUnlocked,
  resolveAvatar,
  type AvatarProgress,
} from './avatars';
import { AvatarSheet } from './components/AvatarSheet';

const byId = (id: string) => AVATARS.find((a) => a.id === id)!;
const nothing: AvatarProgress = { isPremium: false, achievements: new Set(), completedEras: new Set() };

describe('avatar unlocks', () => {
  it('has unique ids and starts with the free owl', () => {
    expect(new Set(AVATARS.map((a) => a.id)).size).toBe(AVATARS.length);
    expect(DEFAULT_AVATAR.id).toBe('owl');
  });

  it('opens free avatars to everyone and the rest by era, achievement or Premium', () => {
    expect(isAvatarUnlocked(byId('scribe'), nothing)).toBe(true);
    expect(isAvatarUnlocked(byId('senator'), nothing)).toBe(false);
    expect(isAvatarUnlocked(byId('senator'), { ...nothing, completedEras: new Set(['ancient']) })).toBe(true);
    expect(isAvatarUnlocked(byId('sharpshooter'), { ...nothing, achievements: new Set(['bullseye']) })).toBe(true);
    expect(isAvatarUnlocked(byId('monarch'), nothing)).toBe(false);
    expect(isAvatarUnlocked(byId('monarch'), { ...nothing, isPremium: true })).toBe(true);
  });

  it('falls back to the owl for unknown ids and lapsed Premium, never for earned ones', () => {
    expect(resolveAvatar(null, false).id).toBe('owl');
    expect(resolveAvatar('nope', false).id).toBe('owl');
    expect(resolveAvatar('dragon', true).id).toBe('dragon');
    expect(resolveAvatar('dragon', false).id).toBe('owl');
    expect(resolveAvatar('knight', false).id).toBe('knight');
  });

  it('explains how to earn a locked avatar', () => {
    const era = (id: string) => (id === 'medieval' ? 'The Middle Ages' : id);
    expect(avatarUnlockHint(byId('knight'), era)).toBe('Complete The Middle Ages');
    expect(avatarUnlockHint(byId('scholar'), era)).toBe('Earn “Scholar”');
    expect(avatarUnlockHint(byId('lion'), era)).toBe('Premium');
  });
});

const mockSetAvatar = jest.fn();
let mockState: ProgressionState = INITIAL_PROGRESSION;
let mockPremium = false;
const mockPush = jest.fn();
jest.mock('../progression/ProgressionProvider', () => ({
  useProgression: () => ({ state: mockState, setAvatar: mockSetAvatar }),
}));
jest.mock('@/features/premium/PremiumProvider', () => ({
  usePremium: () => ({ isPremium: mockPremium }),
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

describe('AvatarSheet', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockState = INITIAL_PROGRESSION;
    mockPremium = false;
    mockSetAvatar.mockClear();
    mockPush.mockClear();
  });

  it('picks an unlocked avatar and closes', async () => {
    const onClose = jest.fn();
    render(<AvatarSheet visible onClose={onClose} />);
    await act(async () => {});
    expect(screen.getByTestId('avatar-option-owl')).toBeSelected();
    fireEvent.press(screen.getByTestId('avatar-option-explorer'));
    expect(mockSetAvatar).toHaveBeenCalledWith('explorer');
    expect(onClose).toHaveBeenCalled();
  });

  it('explains a locked avatar instead of picking it', async () => {
    render(<AvatarSheet visible onClose={jest.fn()} />);
    await act(async () => {});
    fireEvent.press(screen.getByTestId('avatar-option-scholar'));
    expect(mockSetAvatar).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId('avatar-hint')).toHaveTextContent('🎓 Scholar: Earn “Scholar”'));
  });

  it('sends a free player tapping a Premium avatar to the paywall', async () => {
    render(<AvatarSheet visible onClose={jest.fn()} />);
    await act(async () => {});
    fireEvent.press(screen.getByTestId('avatar-option-dragon'));
    expect(mockSetAvatar).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/paywall', params: { source: 'profile' } });
  });

  it('lets a Premium player pick a Premium avatar', async () => {
    mockPremium = true;
    render(<AvatarSheet visible onClose={jest.fn()} />);
    await act(async () => {});
    fireEvent.press(screen.getByTestId('avatar-option-dragon'));
    expect(mockSetAvatar).toHaveBeenCalledWith('dragon');
  });
});
