import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { dateKey } from '@/utils/date';

import { SummaryUpsell } from './SummaryUpsell';
import { summaryUpsellStore } from './upsellStore';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/services/analytics', () => ({ track: jest.fn() }));
const { track } = jest.requireMock<typeof import('@/services/analytics')>('@/services/analytics');
const mockPremium = { isPremium: false, isLoading: false };
jest.mock('./PremiumProvider', () => ({ usePremium: () => mockPremium }));

/** Render and let the once-a-day check resolve. */
async function renderUpsell() {
  render(<SummaryUpsell />);
  await act(async () => {});
}

describe('SummaryUpsell', () => {
  beforeEach(() => {
    mockPremium.isPremium = false;
    mockPremium.isLoading = false;
    mockPush.mockClear();
    jest.mocked(track).mockClear();
  });
  afterEach(() => summaryUpsellStore.clear());

  it('pitches Premium to a free player the first time today, and reports it', async () => {
    await renderUpsell();
    expect(screen.getByTestId('summary-upsell')).toBeOnTheScreen();
    expect(screen.getByText('Enjoying it?')).toBeOnTheScreen();
    expect(screen.getByText(/unlimited hearts, the full campaign and Endless/)).toBeOnTheScreen();
    expect(track).toHaveBeenCalledWith('upsell_shown', { placement: 'run_summary' });
    expect(track).toHaveBeenCalledTimes(1);
    expect((await summaryUpsellStore.read()).lastShownDay).toBe(dateKey());
  });

  it('stays hidden the second time on the same day', async () => {
    await summaryUpsellStore.write({ lastShownDay: dateKey() });
    await renderUpsell();
    expect(screen.queryByTestId('summary-upsell')).toBeNull();
    expect(track).not.toHaveBeenCalled();
  });

  it('comes back on a new day', async () => {
    await summaryUpsellStore.write({ lastShownDay: '2000-01-01' });
    await renderUpsell();
    expect(screen.getByTestId('summary-upsell')).toBeOnTheScreen();
  });

  it('never shows for a Premium player', async () => {
    mockPremium.isPremium = true;
    await renderUpsell();
    expect(screen.queryByTestId('summary-upsell')).toBeNull();
    expect(track).not.toHaveBeenCalled();
    expect((await summaryUpsellStore.read()).lastShownDay).toBeNull();
  });

  it('opens the paywall tagged with the run summary', async () => {
    await renderUpsell();
    fireEvent.press(screen.getByTestId('summary-upsell-cta'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/paywall', params: { source: 'run_summary' } });
  });
});
