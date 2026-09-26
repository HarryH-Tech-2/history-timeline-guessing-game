import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { INITIAL_PROGRESSION } from '@/domain';
import { ProgressionProvider, progressionStore } from '@/features/progression';

import { MuseumScreen } from './MuseumScreen';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), canGoBack: () => false }),
  useLocalSearchParams: () => ({}),
}));
jest.mock('@/services/playGames', () => ({ showPlayGamesAchievements: jest.fn(async () => true) }));

describe('MuseumScreen', () => {
  afterEach(() => progressionStore.clear());

  it('switches to the Achievements tab in place', () => {
    render(<MuseumScreen />);
    expect(screen.queryByTestId('achievements-list')).toBeNull();
    fireEvent.press(screen.getByTestId('museum-tab-achievements'));
    expect(screen.getByTestId('achievements-list')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('museum-tab-artefacts'));
    expect(screen.queryByTestId('achievements-list')).toBeNull();
  });

  it('shows the event year under acquired artefacts and hides it on undiscovered ones', async () => {
    await progressionStore.write({
      ...INITIAL_PROGRESSION,
      collection: { 'evt-moon-landing': 0 },
    });

    render(
      <ProgressionProvider>
        <MuseumScreen />
      </ProgressionProvider>,
    );

    // Acquired: tile carries the title and the event's year.
    await waitFor(() =>
      expect(screen.getByTestId('artefact-year-evt-moon-landing')).toBeOnTheScreen(),
    );
    expect(screen.getByTestId('artefact-year-evt-moon-landing')).toHaveTextContent('1969');

    // Not acquired: stays a spoiler-free mystery tile with no year.
    expect(screen.getByTestId('artefact-locked-evt-berlin-wall')).toBeOnTheScreen();
    expect(screen.queryByTestId('artefact-year-evt-berlin-wall')).toBeNull();
  });

  it('formats BCE years on acquired ancient artefacts', async () => {
    await progressionStore.write({
      ...INITIAL_PROGRESSION,
      // In the first wing: the shelves are virtualised, so a test can only see
      // the first screenful of tiles.
      collection: { 'evt-caesar-assassination': 0 },
    });

    render(
      <ProgressionProvider>
        <MuseumScreen />
      </ProgressionProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('artefact-year-evt-caesar-assassination')).toHaveTextContent(
        '44 BCE',
      ),
    );
  });
});
