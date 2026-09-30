import { act, fireEvent, render, screen } from '@testing-library/react-native';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/services/analytics', () => ({ track: jest.fn() }));
const mockPremium = {
  isPremium: false,
  isLoading: false,
  winback: { price: '£8.99', amount: 8.99, currencyCode: 'GBP' } as
    | { price: string; amount: number; currencyCode: string }
    | null,
  priceLabels: { monthly: '£2.49 / month', yearly: '£14.99 / year', lifetime: '£39.99 once' },
  priceAmounts: { yearly: { amount: 14.99, currencyCode: 'GBP' } },
};
jest.mock('./PremiumProvider', () => ({ usePremium: () => mockPremium }));

// eslint-disable-next-line import/first
import { track } from '@/services/analytics';
// eslint-disable-next-line import/first
import { winbackStore } from './winback';
// eslint-disable-next-line import/first
import { WinbackCard } from './WinbackCard';

const DAY = 24 * 60 * 60 * 1000;

async function renderCard() {
  render(<WinbackCard />);
  await act(async () => {});
}

describe('WinbackCard', () => {
  beforeEach(async () => {
    await winbackStore.clear();
    mockPremium.isPremium = false;
    mockPremium.winback = { price: '£8.99', amount: 8.99, currencyCode: 'GBP' };
    mockPush.mockClear();
    jest.mocked(track).mockClear();
  });

  it('stays hidden until the offer opens', async () => {
    await winbackStore.write({ dismissedAt: Date.now() - DAY });
    await renderCard();
    expect(screen.queryByTestId('winback-card')).toBeNull();
  });

  it('shows the discount once it opens, starts its week and opens the paywall for it', async () => {
    await winbackStore.write({ dismissedAt: Date.now() - 4 * DAY });
    await renderCard();
    expect(screen.getByTestId('winback-card')).toHaveTextContent(/40% off your first year/);
    expect(screen.getByTestId('winback-card')).toHaveTextContent(/ends in 7 days/);
    expect(track).toHaveBeenCalledWith('winback_offered', { percent_off: 40 });
    expect((await winbackStore.read()).openedAt).toBeDefined();
    fireEvent.press(screen.getByTestId('winback-card'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/paywall', params: { source: 'winback' } });
  });

  it('never shows to a subscriber, or when Play has no discount for this player', async () => {
    await winbackStore.write({ dismissedAt: Date.now() - 4 * DAY });
    mockPremium.isPremium = true;
    await renderCard();
    expect(screen.queryByTestId('winback-card')).toBeNull();
    mockPremium.isPremium = false;
    mockPremium.winback = null;
    await renderCard();
    expect(screen.queryByTestId('winback-card')).toBeNull();
  });
});
