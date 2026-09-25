import { fireEvent, render, screen } from '@testing-library/react-native';

import { ctaLabel, footerCopy, PaywallScreen, trialLength } from './PaywallScreen';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

const mockPremium = {
  isPremium: false,
  isLoading: false,
  billingAvailable: true,
  priceLabels: { monthly: '£2.49 / month', yearly: '£14.99 / year', lifetime: '£39.99 once' },
  trialDays: {} as Partial<Record<'monthly' | 'yearly' | 'lifetime', number>>,
  purchase: jest.fn(async () => 'cancelled' as const),
  restore: jest.fn(async () => false),
  revokeForTesting: jest.fn(),
};
jest.mock('./PremiumProvider', () => ({ usePremium: () => mockPremium }));

describe('paywall copy helpers', () => {
  it('names what the player gets, per plan', () => {
    expect(ctaLabel('monthly', '£2.49 / month')).toBe('Get my monthly subscription · £2.49 / month');
    expect(ctaLabel('yearly', '£14.99 / year')).toBe('Get my yearly subscription · £14.99 / year');
    expect(ctaLabel('lifetime', '£39.99 once')).toBe('Get lifetime access · £39.99 once');
  });

  it('leads with the free trial when the store offers one', () => {
    expect(ctaLabel('monthly', '£2.49 / month', 7)).toBe('Start my free 1-week trial');
    expect(footerCopy('monthly', '£2.49 / month', 7)).toContain('Free for 7 days, then £2.49 / month');
    expect(trialLength(14)).toBe('2-week');
    expect(trialLength(30)).toBe('1-month');
    expect(trialLength(3)).toBe('3-day');
  });
});

describe('PaywallScreen', () => {
  beforeEach(() => {
    mockPremium.trialDays = {};
  });

  it('defaults to yearly and relabels the button as plans change', () => {
    render(<PaywallScreen />);
    expect(screen.getByText('Get my yearly subscription · £14.99 / year')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('paywall-plan-lifetime'));
    expect(screen.getByText('Get lifetime access · £39.99 once')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('paywall-plan-monthly'));
    expect(screen.getByText('Get my monthly subscription · £2.49 / month')).toBeOnTheScreen();
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
    expect(screen.getByText(/not paying a big company/)).toBeOnTheScreen();
  });
});
