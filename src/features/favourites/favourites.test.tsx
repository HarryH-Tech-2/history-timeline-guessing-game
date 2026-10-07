import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { INITIAL_PROGRESSION } from '@/domain';
import { ProgressionProvider, progressionStore } from '@/features/progression';
import { toggleFavourite } from '@/features/progression/reducer';
import { track } from '@/services/analytics';

import { EventDetailScreen } from './EventDetailScreen';
import { FavouriteButton } from './FavouriteButton';
import { FavouritesList } from './FavouritesList';

const mockPush = jest.fn();
let mockPremium = false;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), canGoBack: () => false }),
}));
jest.mock('@/services/analytics', () => ({ track: jest.fn() }));
jest.mock('@/services/playGames', () => ({ showPlayGamesAchievements: jest.fn(async () => true) }));
jest.mock('@/features/premium/PremiumProvider', () => ({
  ...jest.requireActual('@/features/premium/PremiumProvider'),
  usePremium: () => ({
    ...jest.requireActual('@/features/premium/PremiumProvider').usePremium(),
    isPremium: mockPremium,
  }),
}));

afterEach(() => {
  progressionStore.clear();
  mockPush.mockClear();
  jest.mocked(track).mockClear();
  mockPremium = false;
});

describe('toggleFavourite', () => {
  it('adds newest first and removes on a second toggle', () => {
    const one = toggleFavourite(INITIAL_PROGRESSION, 'a');
    expect(one.favourite).toBe(true);
    const two = toggleFavourite(one.state, 'b');
    expect(two.state.favourites).toEqual(['b', 'a']);
    const off = toggleFavourite(two.state, 'a');
    expect(off.favourite).toBe(false);
    expect(off.state.favourites).toEqual(['b']);
  });
});

describe('FavouriteButton', () => {
  it('saves and un-saves the event, tracking each', async () => {
    render(
      <ProgressionProvider>
        <FavouriteButton questionId="evt-moon-landing" />
      </ProgressionProvider>,
    );
    const button = screen.getByTestId('favourite-button');
    await waitFor(() => expect(button).toHaveTextContent(/Favourite/));

    fireEvent.press(button);
    await waitFor(() => expect(button).toHaveTextContent(/Saved/));
    expect(track).toHaveBeenCalledWith('favourite_added', { question_id: 'evt-moon-landing' });

    fireEvent.press(button);
    await waitFor(() => expect(button).toHaveTextContent(/Favourite/));
    expect(track).toHaveBeenCalledWith('favourite_removed', { question_id: 'evt-moon-landing' });
  });
});

describe('FavouritesList', () => {
  it('shows the empty state with nothing saved', () => {
    render(<FavouritesList />);
    expect(screen.getByTestId('favourites-empty')).toBeOnTheScreen();
  });

  it('lists saved events and opens one', async () => {
    await progressionStore.write({
      ...INITIAL_PROGRESSION,
      favourites: ['evt-moon-landing', 'no-longer-in-the-catalogue'],
    });
    render(
      <ProgressionProvider>
        <FavouritesList />
      </ProgressionProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('favourite-evt-moon-landing')).toBeOnTheScreen());
    expect(screen.getByTestId('favourite-evt-moon-landing')).toHaveTextContent(/1969/);

    fireEvent.press(screen.getByTestId('favourite-evt-moon-landing'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/event/[id]',
      params: { id: 'evt-moon-landing' },
    });
  });
});

describe('EventDetailScreen', () => {
  it('locks the deep dive for a free player and sends them to the paywall', () => {
    render(<EventDetailScreen questionId="evt-moon-landing" />);
    expect(screen.getByTestId('event-year')).toHaveTextContent('1969');
    expect(screen.getByTestId('event-locked')).toBeOnTheScreen();
    expect(screen.queryByTestId('event-deep-dive')).toBeNull();
    expect(track).toHaveBeenCalledWith('favourite_opened', {
      question_id: 'evt-moon-landing',
      locked: true,
    });

    fireEvent.press(screen.getByTestId('event-unlock'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/paywall', params: { source: 'favourites' } });
  });

  it('shows the whole deep dive to a Premium player', () => {
    mockPremium = true;
    render(<EventDetailScreen questionId="evt-moon-landing" />);
    expect(screen.getByTestId('event-deep-dive')).toBeOnTheScreen();
    expect(screen.queryByTestId('event-locked')).toBeNull();
  });

  it('copes with an unknown event', () => {
    render(<EventDetailScreen questionId="nope" />);
    expect(screen.getByTestId('event-not-found')).toBeOnTheScreen();
  });
});
