import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { INITIAL_PROGRESSION } from '@/domain';
import { showPlayGamesAchievements } from '@/services/playGames';

import { ACHIEVEMENTS } from '../achievements';
import { playGamesLinked } from '../playGamesAchievements';
import { ProgressionProvider, progressionStore } from '../index';
import { AchievementsList } from './AchievementsList';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), canGoBack: () => false }),
  useLocalSearchParams: () => ({}),
}));
jest.mock('@/services/playGames', () => ({
  showPlayGamesAchievements: jest.fn(async () => true),
}));
jest.mock('../playGamesAchievements', () => ({
  ...jest.requireActual('../playGamesAchievements'),
  playGamesLinked: jest.fn(() => true),
}));

describe('AchievementsList', () => {
  afterEach(() => progressionStore.clear());

  it('lists every achievement', () => {
    render(<AchievementsList />);
    for (const a of ACHIEVEMENTS) {
      expect(screen.getByTestId(`achievement-${a.id}`)).toBeOnTheScreen();
    }
  });

  it('reflects earned achievements from the profile', async () => {
    await progressionStore.write({ ...INITIAL_PROGRESSION, unlocked: ['first-round'] });
    render(
      <ProgressionProvider>
        <AchievementsList />
      </ProgressionProvider>,
    );
    await waitFor(() => expect(screen.getByText(/1 of/)).toBeOnTheScreen());
  });
});

describe('AchievementsList → Play Games', () => {
  afterEach(() => jest.restoreAllMocks());

  it('offers to open the Play Games achievements screen on Android', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    render(<AchievementsList />);
    fireEvent.press(screen.getByTestId('achievements-play-games'));
    expect(showPlayGamesAchievements).toHaveBeenCalledTimes(1);
  });

  it('hides the Play Games entry where Play Games does not exist', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    render(<AchievementsList />);
    expect(screen.queryByTestId('achievements-play-games')).toBeNull();
  });

  it('hides the Play Games entry until an achievement is wired to Play Games', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    jest.mocked(playGamesLinked).mockReturnValueOnce(false);
    render(<AchievementsList />);
    expect(screen.queryByTestId('achievements-play-games')).toBeNull();
  });
});
