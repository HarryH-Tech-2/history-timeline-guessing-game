import { render, screen, waitFor } from '@testing-library/react-native';

import { INITIAL_PROGRESSION } from '@/domain';
import { ProgressionProvider, progressionStore } from '@/features/progression';

import { MuseumScreen } from './MuseumScreen';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), canGoBack: () => false }),
}));

describe('MuseumScreen', () => {
  afterEach(() => progressionStore.clear());

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
      collection: { 'bat-thermopylae': 0 },
    });

    render(
      <ProgressionProvider>
        <MuseumScreen />
      </ProgressionProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('artefact-year-bat-thermopylae')).toHaveTextContent('480 BCE'),
    );
  });
});
