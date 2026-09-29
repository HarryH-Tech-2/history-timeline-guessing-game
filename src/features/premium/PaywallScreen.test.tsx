import { act, fireEvent, render, screen, within } from '@testing-library/react-native';

import { ctaLabel, footerCopy, PaywallScreen, trialLength } from './PaywallScreen';

const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
  replace: jest.fn(),
  canGoBack: jest.fn(() => true),
};
let mockParams: Record<string, string | string[] | undefined> = {};
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
}));
jest.mock('@/services/analytics', () => ({ track: jest.fn() }));
const { track } = jest.requireMock<typeof import('@/services/analytics')>('@/services/analytics');

const mockPremium = {
  isPremium: false,
  isLoading: false,
  billingAvailable: true,
  priceLabels: { monthly: '£2.49 / month', yearly: '£14.99 / year', lifetime: '£39.99 once' },
  trialDays: {} as Partial<Record<'monthly' | 'yearly' | 'lifetime', number>>,
  purchase: jest.fn(async (..._args: unknown[]) => 'cancelled' as 'cancelled' | 'purchased'),
  restore: jest.fn(async () => false),
  revokeForTesting: jest.fn(),
};
jest.mock('./PremiumProvider', () => ({ usePremium: () => mockPremium }));

describe('paywall copy helpers', () => {
  it('names what the player gets, per plan', () => {
    expect(ctaLabel('monthly', '£2.49 / month')).toEqual({
      label: 'Get my monthly subscription',
      sublabel: '£2.49 / month',
    });
    expect(ctaLabel('yearly', '£14.99 / year')).toEqual({
      label: 'Get my yearly subscription',
      sublabel: '£14.99 / year',
    });
    expect(ctaLabel('lifetime', '£39.99 once')).toEqual({
      label: 'Get lifetime access',
      sublabel: '£39.99 once',
    });
  });

  it('leads with the free trial when the store offers one', () => {
    expect(ctaLabel('monthly', '£2.49 / month', 7)).toEqual({
      label: 'Start my free 1-week trial',
      sublabel: 'then £2.49 / month',
    });
    expect(footerCopy('monthly', '£2.49 / month', 7)).toContain('Free for 7 days, then £2.49 / month');
    expect(trialLength(14)).toBe('2-week');
    expect(trialLength(30)).toBe('1-month');
    expect(trialLength(3)).toBe('3-day');
  });
});

describe('PaywallScreen', () => {
  beforeEach(() => {
    mockPremium.trialDays = {};
    mockParams = {};
    jest.mocked(track).mockClear();
    mockRouter.back.mockClear();
    mockRouter.replace.mockClear();
    mockRouter.canGoBack.mockReturnValue(true);
  });

  it('reports the view with the source it was opened from', () => {
    mockParams = { source: 'hearts' };
    render(<PaywallScreen />);
    expect(track).toHaveBeenCalledWith('paywall_viewed', { source: 'hearts' });
  });

  it('reports an unrecognised or missing source as unknown', () => {
    mockParams = { source: 'somewhere' };
    render(<PaywallScreen />);
    expect(track).toHaveBeenCalledWith('paywall_viewed', { source: 'unknown' });
  });

  it('passes the source through to the purchase for attribution', async () => {
    mockParams = { source: 'run_summary' };
    render(<PaywallScreen />);
    await act(async () => {
      fireEvent.press(screen.getByTestId('paywall-subscribe'));
    });
    expect(mockPremium.purchase).toHaveBeenCalledWith('yearly', 'run_summary');
  });

  it('closes back to whatever opened it', () => {
    render(<PaywallScreen />);
    fireEvent.press(screen.getByTestId('paywall-close'));
    expect(mockRouter.back).toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('closes to home when nothing is underneath (straight from onboarding)', () => {
    mockRouter.canGoBack.mockReturnValue(false);
    mockParams = { source: 'onboarding' };
    render(<PaywallScreen />);
    fireEvent.press(screen.getByTestId('paywall-close'));
    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(mockRouter.replace).toHaveBeenCalledWith('/');
  });

  it('defaults to yearly and relabels the button as plans change', () => {
    render(<PaywallScreen />);
    const cta = () => within(screen.getByTestId('paywall-subscribe'));
    expect(cta().getByText('Get my yearly subscription')).toBeOnTheScreen();
    expect(cta().getByText('£14.99 / year')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('paywall-plan-lifetime'));
    expect(cta().getByText('Get lifetime access')).toBeOnTheScreen();
    expect(cta().getByText('£39.99 once')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('paywall-plan-monthly'));
    expect(cta().getByText('Get my monthly subscription')).toBeOnTheScreen();
    expect(cta().getByText('£2.49 / month')).toBeOnTheScreen();
  });

  it('shows the trial badge and CTA on the monthly plan when eligible', () => {
    mockPremium.trialDays = { monthly: 7 };
    render(<PaywallScreen />);
    expect(screen.getByTestId('paywall-badge-monthly')).toHaveTextContent(/1-week free trial/i);
    fireEvent.press(screen.getByTestId('paywall-plan-monthly'));
    expect(screen.getByText('Start my free 1-week trial')).toBeOnTheScreen();
    expect(screen.getByText(/Free for 7 days/)).toBeOnTheScreen();
  });

  it('carries the new founder note', () => {
    render(<PaywallScreen />);
    expect(screen.getByText(/pay a big company/)).toBeOnTheScreen();
  });
});
