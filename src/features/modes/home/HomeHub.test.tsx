import { act, fireEvent, render, screen } from '@testing-library/react-native';

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
import { categorySample, resetSamplesForTests, sampleStore } from '@/features/premium/sample';
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

  describe('locked cards', () => {
    const locked = () => getCategories().find((c) => c.active && c.premiumOnly)!;

    /** Render with the taster store settled, `used` already played. */
    async function renderWithTasters(used: string[]) {
      await sampleStore.write({ used });
      resetSamplesForTests();
      mockPush.mockClear();
      render(<HomeHub />);
      await act(async () => {});
    }

    it('open the free taster while it is unplayed', async () => {
      await renderWithTasters([]);
      expect(screen.getByTestId('mode-endless')).toHaveTextContent(/Try it free/);
      fireEvent.press(screen.getByTestId('mode-endless'));
      expect(mockPush).toHaveBeenCalledWith('/endless');
      fireEvent.press(screen.getByTestId(`category-${locked().id}`));
      expect(mockPush).toHaveBeenCalledWith(`/category/${locked().id}`);
    });

    it('send free players from a played mode to the paywall, tagged', async () => {
      await renderWithTasters(['endless']);
      fireEvent.press(screen.getByTestId('mode-endless'));
      expect(mockPush).toHaveBeenCalledWith({ pathname: '/paywall', params: { source: 'locked_mode' } });
    });

    it('send free players from a played category to the paywall, tagged', async () => {
      await renderWithTasters([categorySample(locked().id)]);
      fireEvent.press(screen.getByTestId(`category-${locked().id}`));
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/paywall',
        params: { source: 'locked_category', category: locked().id },
      });
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
