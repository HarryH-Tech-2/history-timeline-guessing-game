import { fireEvent, render, screen } from '@testing-library/react-native';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), navigate: jest.fn() }),
}));

jest.mock('@/services/analytics', () => ({ track: jest.fn() }));
const mockPremium = { isPremium: false };
jest.mock('@/features/premium/PremiumProvider', () => ({
  ...jest.requireActual('@/features/premium/PremiumProvider'),
  usePremium: () => ({
    ...jest.requireActual('@/features/premium/PremiumProvider').usePremium(),
    isPremium: mockPremium.isPremium,
  }),
}));

// eslint-disable-next-line import/first
import { getCategories } from '@/data';
// eslint-disable-next-line import/first
import { track } from '@/services/analytics';
// eslint-disable-next-line import/first
import { HomeHub } from './HomeHub';

describe('HomeHub', () => {
  it('offers all four modes', () => {
    render(<HomeHub />);
    expect(screen.getByTestId('mode-daily')).toBeOnTheScreen();
    expect(screen.getByTestId('mode-endless')).toBeOnTheScreen();
    expect(screen.getByTestId('mode-survival')).toBeOnTheScreen();
    expect(screen.getByTestId('mode-campaign')).toBeOnTheScreen();
  });

  it('no longer offers a Topic of the day', () => {
    render(<HomeHub />);
    expect(screen.queryByTestId('topic-of-the-day')).toBeNull();
  });

  it('opens the streak celebration when the streak chip is tapped', () => {
    render(<HomeHub />);
    expect(screen.queryByTestId('streak-sheet')).toBeNull();
    fireEvent.press(screen.getByTestId('home-streak'));
    expect(screen.getByTestId('streak-sheet')).toBeOnTheScreen();
  });

  it('sends free players from a locked mode to the paywall, tagged', () => {
    mockPush.mockClear();
    render(<HomeHub />);
    fireEvent.press(screen.getByTestId('mode-endless'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/paywall', params: { source: 'locked_mode' } });
  });

  it('sends free players from a locked category to the paywall, tagged', () => {
    mockPush.mockClear();
    const locked = getCategories().find((c) => c.active && c.premiumOnly);
    expect(locked).toBeDefined();
    render(<HomeHub />);
    fireEvent.press(screen.getByTestId(`category-${locked!.id}`));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/paywall',
      params: { source: 'locked_category' },
    });
  });

  describe('Premium chip', () => {
    beforeEach(() => {
      mockPremium.isPremium = false;
      mockPush.mockClear();
      jest.mocked(track).mockClear();
    });

    it('shows free players a Premium chip in the header and reports it once', () => {
      const { rerender } = render(<HomeHub />);
      expect(screen.getByTestId('home-premium')).toHaveTextContent(/Premium/);
      rerender(<HomeHub />);
      expect(jest.mocked(track).mock.calls.filter(([e]) => e === 'upsell_shown')).toEqual([
        ['upsell_shown', { placement: 'home_chip' }],
      ]);
    });

    it('opens the paywall tagged home_chip', () => {
      render(<HomeHub />);
      fireEvent.press(screen.getByTestId('home-premium'));
      expect(mockPush).toHaveBeenCalledWith({ pathname: '/paywall', params: { source: 'home_chip' } });
    });

    it('is hidden for Premium players', () => {
      mockPremium.isPremium = true;
      render(<HomeHub />);
      expect(screen.queryByTestId('home-premium')).toBeNull();
      expect(track).not.toHaveBeenCalledWith('upsell_shown', expect.anything());
    });
  });
});
