import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { showPlayGamesAchievements } from '@/services/playGames';

import { INITIAL_PROGRESSION } from '@/domain';

import { ACHIEVEMENTS } from './achievements';
import { AchievementsScreen } from './AchievementsScreen';
import { ProgressionProvider, progressionStore } from './index';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), canGoBack: () => false }),
}));

describe('AchievementsScreen', () => {
  afterEach(() => progressionStore.clear());

  it('lists every achievement', () => {
    render(<AchievementsScreen />);
    for (const a of ACHIEVEMENTS) {
      expect(screen.getByTestId(`achievement-${a.id}`)).toBeOnTheScreen();
    }
  });

  it('reflects earned achievements from the profile', async () => {
    await progressionStore.write({ ...INITIAL_PROGRESSION, unlocked: ['first-round'] });

    render(
      <ProgressionProvider>
        <AchievementsScreen />
      </ProgressionProvider>,
    );

    await waitFor(() => expect(screen.getByText(/1 of/)).toBeOnTheScreen());
  });
});

jest.mock('@/services/playGames', () => ({
  showPlayGamesAchievements: jest.fn(async () => true),
}));

describe('AchievementsScreen → Play Games', () => {
  afterEach(() => jest.restoreAllMocks());

  it('offers to open the Play Games achievements screen on Android', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    render(<AchievementsScreen />);
    fireEvent.press(screen.getByTestId('achievements-play-games'));
    expect(showPlayGamesAchievements).toHaveBeenCalledTimes(1);
  });

  it('hides the Play Games entry where Play Games does not exist', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    render(<AchievementsScreen />);
    expect(screen.queryByTestId('achievements-play-games')).toBeNull();
  });
});
