import { act, fireEvent, render, screen, within } from '@testing-library/react-native';

import { STORE_LABEL } from '@/config/store';

import { ctaLabel, footerCopy, PaywallScreen, planBadge, planSubline, trialLength } from './PaywallScreen';

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
jest.mock('@/features/reminders/scheduler', () => ({ scheduleTrialReminder: jest.fn(async () => {}) }));
const { scheduleTrialReminder } = jest.requireMock<
  typeof import('@/features/reminders/scheduler')
>('@/features/reminders/scheduler');

const mockPremium = {
  isPremium: false,
  isLoading: false,
  billingAvailable: true,
  priceLabels: { monthly: '£2.49 / month', yearly: '£14.99 / year', lifetime: '£39.99 once' },
  trialDays: {} as Partial<Record<'monthly' | 'yearly' | 'lifetime', number>>,
  priceAmounts: {} as Partial<
    Record<'monthly' | 'yearly' | 'lifetime', { amount: number; currencyCode: string }>
  >,
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
      label: 'Start my free week',
      sublabel: 'then £2.49 / month',
    });
    expect(footerCopy('monthly', '£2.49 / month', 7)).toContain('Free for 7 days, then £2.49 / month');
    expect(trialLength(14)).toBe('2-week');
    expect(trialLength(30)).toBe('1-month');
    expect(trialLength(3)).toBe('3-day');
  });

  it('badges and sub-lines each plan from store prices', () => {
    expect(planBadge('yearly', { save: 44 })).toBe('Save 44%');
    expect(planBadge('yearly', { save: null })).toBe('Best value');
    expect(planBadge('monthly', { save: 44, trialDays: 7 })).toBe('1-week free trial');
    expect(planBadge('monthly', { save: 44 })).toBeUndefined();
    expect(planSubline('lifetime', undefined)).toBe('Pay once, keep forever');
    expect(planSubline('yearly', undefined)).toBeUndefined();
    expect(planSubline('yearly', { amount: 14.99, currencyCode: 'GBP' })).toMatch(
      /1\.25\/month, billed yearly$/,
    );
  });
});

describe('PaywallScreen', () => {
  beforeEach(() => {
    mockPremium.trialDays = {};
    mockPremium.priceAmounts = {};
    mockPremium.purchase.mockImplementation(async () => 'cancelled');
    jest.mocked(scheduleTrialReminder).mockClear();
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

  it('shows the trial badge, CTA and timeline on the monthly plan when eligible', () => {
    mockPremium.trialDays = { monthly: 7 };
    render(<PaywallScreen />);
    expect(screen.getByTestId('paywall-badge-monthly')).toHaveTextContent(/1-week free trial/i);
    // Yearly (the default) has no trial: normal CTA, no timeline.
    expect(screen.queryByTestId('paywall-trial-timeline')).toBeNull();
    fireEvent.press(screen.getByTestId('paywall-plan-monthly'));
    expect(
      within(screen.getByTestId('paywall-subscribe')).getByText('Start my free week'),
    ).toBeOnTheScreen();
    expect(screen.getByText(/Free for 7 days/)).toBeOnTheScreen();
    const timeline = within(screen.getByTestId('paywall-trial-timeline'));
    expect(timeline.getByText('Today')).toBeOnTheScreen();
    expect(timeline.getByText('Day 5')).toBeOnTheScreen();
    expect(timeline.getByText('Day 7')).toBeOnTheScreen();
    expect(timeline.getByText('£2.49 / month, cancel anytime')).toBeOnTheScreen();
  });

  it('leads with the trial on the default yearly plan when it has one', async () => {
    mockPremium.trialDays = { yearly: 7 };
    mockPremium.purchase.mockImplementation(async () => 'purchased');
    render(<PaywallScreen />);
    expect(
      within(screen.getByTestId('paywall-subscribe')).getByText('Start my free week'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('paywall-trial-timeline')).toBeOnTheScreen();
    await act(async () => {
      fireEvent.press(screen.getByTestId('paywall-subscribe'));
    });
    expect(scheduleTrialReminder).toHaveBeenCalledWith(
      expect.objectContaining({ trialDays: 7, atDay: 5 }),
    );
  });

  it('shows the yearly per-month price and saving from store amounts', () => {
    mockPremium.priceAmounts = {
      monthly: { amount: 2.49, currencyCode: 'GBP' },
      yearly: { amount: 14.99, currencyCode: 'GBP' },
    };
    render(<PaywallScreen />);
    expect(screen.getByTestId('paywall-badge-yearly')).toHaveTextContent('Save 49%');
    expect(screen.getByTestId('paywall-subline-yearly')).toHaveTextContent(
      /1\.25\/month, billed yearly/,
    );
    expect(screen.getByTestId('paywall-subline-lifetime')).toHaveTextContent(
      'Pay once, keep forever',
    );
  });

  it('titles the screen "Start My Free Week" when any plan has a trial', () => {
    mockPremium.trialDays = { monthly: 7 };
    mockParams = { source: 'hearts' };
    render(<PaywallScreen />);
    expect(screen.getByTestId('paywall-headline')).toHaveTextContent('Start My Free Week');
    // The source-aware copy still speaks through the founder's bubble.
    expect(screen.getByTestId('founder-line')).toHaveTextContent(/Out of hearts/);
  });

  it('uses the source-aware title when no plan has a trial', () => {
    mockParams = { source: 'hearts' };
    render(<PaywallScreen />);
    expect(screen.getByTestId('paywall-headline')).toHaveTextContent(
      'Never wait for a heart again',
    );
    expect(screen.getByTestId('paywall-lead-hearts')).toBeOnTheScreen();
  });

  it('puts the founder photo and speech bubble at the top', () => {
    render(<PaywallScreen />);
    expect(screen.getByTestId('founder-photo')).toBeOnTheScreen();
    expect(screen.getByTestId('founder-line')).toHaveTextContent(/Hi, I’m Harry/);
    expect(screen.getAllByTestId('founder-note')).toHaveLength(1);
  });

  it('offers restore and the cancel-anytime promise under the button', async () => {
    render(<PaywallScreen />);
    expect(screen.getByTestId('paywall-trust')).toHaveTextContent(`Cancel anytime in ${STORE_LABEL}`);
    await act(async () => {
      fireEvent.press(screen.getByTestId('paywall-restore'));
    });
    expect(mockPremium.restore).toHaveBeenCalled();
    expect(screen.getByTestId('paywall-notice')).toHaveTextContent('No active subscription found.');
  });
});
