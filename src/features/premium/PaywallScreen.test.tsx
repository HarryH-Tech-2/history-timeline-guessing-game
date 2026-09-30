import { act, fireEvent, render, screen, within } from '@testing-library/react-native';

import { STORE_LABEL } from '@/config/store';

import {
  ctaLabel,
  footerCopy,
  PaywallScreen,
  planBadge,
  planSubline,
  splitPrice,
  trialLength,
} from './PaywallScreen';
import { recordPaywallDismissal } from './useWinbackOffer';

const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
  replace: jest.fn(),
  canGoBack: jest.fn(() => true),
};
let mockParams: Record<string, string | string[] | undefined> = {};
let mockBeforeRemove: (() => void) | null = null;
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
  useNavigation: () => ({
    addListener: (_event: string, listener: () => void) => {
      mockBeforeRemove = listener;
      return () => undefined;
    },
  }),
}));
let mockWinback: { offer: unknown; now: number; markShown: jest.Mock } = { offer: null, now: Date.now(), markShown: jest.fn() };
jest.mock('./useWinbackOffer', () => ({
  useWinbackOffer: () => mockWinback,
  recordPaywallDismissal: jest.fn(async () => {}),
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
  winback: null as { price: string; amount: number; currencyCode: string } | null,
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
    expect(planSubline('lifetime', undefined)).toBeUndefined();
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
    mockPremium.purchase.mockClear();
    mockPremium.winback = null;
    mockWinback = { offer: null, now: Date.now(), markShown: jest.fn() };
    mockBeforeRemove = null;
    jest.mocked(recordPaywallDismissal).mockClear();
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
    // The monthly card itself leads with the trial, whichever plan is selected.
    const monthly = within(screen.getByTestId('paywall-plan-monthly'));
    expect(monthly.getByTestId('paywall-free-monthly')).toHaveTextContent('Free');
    expect(monthly.getByText('for 7 days')).toBeOnTheScreen();
    expect(monthly.getByText('then £2.49 / month')).toBeOnTheScreen();
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
    expect(screen.queryByTestId('paywall-subline-lifetime')).toBeNull();
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

describe('splitPrice', () => {
  it('splits a store label into the amount and its period', () => {
    expect(splitPrice('£2.49 / month')).toEqual({ amount: '£2.49', period: '/ month' });
    expect(splitPrice('$19.99 / year')).toEqual({ amount: '$19.99', period: '/ year' });
    expect(splitPrice('₹499.00 once')).toEqual({ amount: '₹499.00', period: 'once' });
  });

  it('keeps an unrecognised label whole', () => {
    expect(splitPrice('Free')).toEqual({ amount: 'Free', period: '' });
  });
});

describe('PaywallScreen funnel and win-back', () => {
  beforeEach(() => {
    mockParams = {};
    mockPremium.trialDays = {};
    mockPremium.priceAmounts = {};
    mockPremium.winback = null;
    mockPremium.purchase.mockClear();
    mockPremium.purchase.mockImplementation(async () => 'cancelled');
    mockWinback = { offer: null, now: Date.now(), markShown: jest.fn() };
    mockBeforeRemove = null;
    jest.mocked(recordPaywallDismissal).mockClear();
    jest.mocked(track).mockClear();
  });

  it('speaks to the locked category the player tapped', () => {
    mockParams = { source: 'locked_category', category: 'space' };
    render(<PaywallScreen />);
    expect(screen.getByTestId('paywall-personal-category')).toHaveTextContent(/questions waiting for you$/);
  });

  it('leaves the personal card off the win-back offer', () => {
    mockParams = { source: 'winback', category: 'space' };
    mockWinback = {
      offer: { price: '£8.99', fullPrice: '£14.99 / year', percentOff: 40, endsAt: Date.now() + 86_400_000 },
      now: Date.now(),
      markShown: jest.fn(),
    };
    render(<PaywallScreen />);
    expect(screen.queryByTestId('paywall-personal')).toBeNull();
  });

  it('reports each plan the player taps', () => {
    mockParams = { source: 'hearts' };
    render(<PaywallScreen />);
    fireEvent.press(screen.getByTestId('paywall-plan-monthly'));
    expect(track).toHaveBeenCalledWith('paywall_plan_selected', { plan: 'monthly', source: 'hearts' });
  });

  it('reports leaving without buying, and starts the win-back clock', () => {
    mockParams = { source: 'campaign' };
    mockPremium.priceAmounts = { yearly: { amount: 14.99, currencyCode: 'GBP' } };
    mockPremium.winback = { price: '£8.99', amount: 8.99, currencyCode: 'GBP' };
    render(<PaywallScreen />);
    fireEvent.press(screen.getByTestId('paywall-plan-lifetime'));
    act(() => mockBeforeRemove?.());
    expect(track).toHaveBeenCalledWith(
      'paywall_dismissed',
      expect.objectContaining({ source: 'campaign', plan: 'lifetime' }),
    );
    expect(recordPaywallDismissal).toHaveBeenCalledWith(40);
  });

  it('does not count a purchase as a dismissal', async () => {
    mockPremium.purchase.mockImplementation(async () => 'purchased');
    render(<PaywallScreen />);
    await act(async () => {
      fireEvent.press(screen.getByTestId('paywall-subscribe'));
    });
    act(() => mockBeforeRemove?.());
    expect(track).not.toHaveBeenCalledWith('paywall_dismissed', expect.anything());
    expect(recordPaywallDismissal).not.toHaveBeenCalled();
  });

  it('opened from the win-back card, leads with the discount and buys it', async () => {
    mockParams = { source: 'winback' };
    mockWinback = {
      offer: { price: '£8.99', fullPrice: '£14.99 / year', percentOff: 40, endsAt: Date.now() + 3 * 86_400_000 },
      now: Date.now(),
      markShown: jest.fn(),
    };
    render(<PaywallScreen />);
    expect(mockWinback.markShown).toHaveBeenCalled();
    expect(screen.getByTestId('paywall-headline')).toHaveTextContent('40% off your first year');
    expect(screen.getByTestId('paywall-offer-ends')).toHaveTextContent(/ends in 3 days/);
    expect(screen.getByTestId('paywall-badge-yearly')).toHaveTextContent('40% off');
    expect(screen.getByTestId('paywall-offer-yearly')).toHaveTextContent('£8.99');
    const cta = within(screen.getByTestId('paywall-subscribe'));
    expect(cta.getByText('Claim 40% off')).toBeOnTheScreen();
    expect(screen.getByText(/£8\.99 for your first year, then £14\.99 \/ year/)).toBeOnTheScreen();
    await act(async () => {
      fireEvent.press(screen.getByTestId('paywall-subscribe'));
    });
    expect(mockPremium.purchase).toHaveBeenCalledWith('yearly', 'winback', { winback: true });
  });

  it('keeps the normal prices on a paywall not opened for the offer', () => {
    mockParams = { source: 'hearts' };
    mockWinback = {
      offer: { price: '£8.99', fullPrice: '£14.99 / year', percentOff: 40, endsAt: Date.now() + 86_400_000 },
      now: Date.now(),
      markShown: jest.fn(),
    };
    render(<PaywallScreen />);
    expect(screen.queryByTestId('paywall-offer-yearly')).toBeNull();
    expect(mockWinback.markShown).not.toHaveBeenCalled();
  });
});
