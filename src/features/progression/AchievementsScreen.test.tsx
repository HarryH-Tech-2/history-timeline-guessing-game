import { render, screen, waitFor } from '@testing-library/react-native';

import { INITIAL_PROGRESSION } from '@/domain';

import { ACHIEVEMENTS } from './achievements';
import { AchievementsScreen } from './AchievementsScreen';
import { ProgressionProvider, progressionStore } from './index';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
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
