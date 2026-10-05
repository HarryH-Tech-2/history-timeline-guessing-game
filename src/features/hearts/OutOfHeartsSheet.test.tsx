import { fireEvent, render, screen, within } from '@testing-library/react-native';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/services/analytics', () => ({ track: jest.fn() }));
const mockPremium = { trialDays: {} as Partial<Record<'monthly' | 'yearly' | 'lifetime', number>> };
jest.mock('@/features/premium/PremiumProvider', () => ({ usePremium: () => mockPremium }));
jest.mock('./useHearts', () => ({
  useHearts: () => ({ count: 0, max: 10, nextIn: '12:30', refillCost: 100, canRefill: false, refill: jest.fn() }),
}));

// eslint-disable-next-line import/first
import { OutOfHeartsSheet } from './OutOfHeartsSheet';

describe('OutOfHeartsSheet', () => {
  beforeEach(() => {
    mockPremium.trialDays = {};
    mockPush.mockClear();
  });

  it('pitches Premium and opens the paywall tagged hearts', () => {
    render(<OutOfHeartsSheet onLeave={jest.fn()} />);
    const cta = screen.getByTestId('hearts-premium');
    expect(within(cta).getByText('Go Premium · unlimited hearts')).toBeOnTheScreen();
    fireEvent.press(cta);
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/paywall', params: { source: 'hearts' } });
  });

  it('keeps refilling and leaving as quiet links', () => {
    const onLeave = jest.fn();
    render(<OutOfHeartsSheet onLeave={onLeave} />);
    expect(screen.getByTestId('hearts-refill')).toBeDisabled();
    fireEvent.press(screen.getByTestId('hearts-leave'));
    expect(onLeave).toHaveBeenCalled();
  });

  it('leads with the free trial when the store offers one', () => {
    mockPremium.trialDays = { monthly: 7 };
    render(<OutOfHeartsSheet onLeave={jest.fn()} />);
    const cta = within(screen.getByTestId('hearts-premium'));
    expect(cta.getByText('Keep playing · 7 days free')).toBeOnTheScreen();
    expect(cta.getByText('Unlimited hearts with Premium')).toBeOnTheScreen();
  });
});
