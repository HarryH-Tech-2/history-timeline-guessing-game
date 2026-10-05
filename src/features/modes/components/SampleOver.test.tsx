import { fireEvent, render, screen, within } from '@testing-library/react-native';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/services/analytics', () => ({ track: jest.fn() }));
const mockPremium = {
  trialDays: {} as Partial<Record<'monthly' | 'yearly' | 'lifetime', number>>,
  priceLabels: { monthly: '£2.49 / month', yearly: '£14.99 / year', lifetime: '£39.99 once' },
};
jest.mock('@/features/premium/PremiumProvider', () => ({ usePremium: () => mockPremium }));

// eslint-disable-next-line import/first
import { track } from '@/services/analytics';
// eslint-disable-next-line import/first
import { SampleOver } from './SampleOver';

const ROUNDS = [
  { key: '0', label: 'Fall of Constantinople', score: 900, detail: '3 yrs off' },
  { key: '1', label: 'Moon landing', score: 1000, detail: 'Exact year' },
  { key: '2', label: 'Magna Carta', score: 400, detail: '80 yrs off' },
];
const PAYWALL = { pathname: '/paywall', params: { source: 'locked_mode' } } as const;

function renderOver(props: Partial<Parameters<typeof SampleOver>[0]> = {}) {
  const onLeave = jest.fn();
  render(
    <SampleOver
      target="endless"
      name="Endless"
      score={2300}
      rounds={ROUNDS}
      body="With Premium the run never ends."
      paywall={PAYWALL}
      onLeave={onLeave}
      {...props}
    />,
  );
  return { onLeave };
}

describe('SampleOver', () => {
  beforeEach(() => {
    mockPremium.trialDays = {};
    mockPush.mockClear();
    jest.mocked(track).mockClear();
  });

  it('shows the score, every round and how far Endless goes', () => {
    renderOver();
    expect(screen.getByTestId('sample-score')).toHaveTextContent('2,300');
    const rounds = within(screen.getByTestId('sample-rounds'));
    expect(rounds.getByText('Moon landing')).toBeOnTheScreen();
    expect(rounds.getByText('+1,000')).toBeOnTheScreen();
    const trackStrip = screen.getByTestId('sample-track');
    expect(trackStrip).toHaveTextContent(/3 rounds played/);
    expect(trackStrip).toHaveTextContent(/∞ with Premium/);
    expect(track).toHaveBeenCalledWith('sample_completed', { target: 'endless', score: 2300 });
  });

  it('counts a category taster against the whole category', () => {
    renderOver({ target: 'category:space', name: 'Space', total: 48 });
    expect(screen.getByTestId('sample-track')).toHaveTextContent(/48 with Premium/);
  });

  it('opens the paywall it was given, or goes home', () => {
    const { onLeave } = renderOver();
    expect(within(screen.getByTestId('sample-premium')).getByText('Keep playing Endless')).toBeOnTheScreen();
    expect(screen.getByTestId('sample-price')).toHaveTextContent('From £2.49 / month');
    fireEvent.press(screen.getByTestId('sample-premium'));
    expect(mockPush).toHaveBeenCalledWith(PAYWALL);
    fireEvent.press(screen.getByTestId('sample-leave'));
    expect(onLeave).toHaveBeenCalled();
  });

  it('leads with the free trial when the store offers one', () => {
    mockPremium.trialDays = { monthly: 7 };
    renderOver();
    expect(within(screen.getByTestId('sample-premium')).getByText('Start my free week')).toBeOnTheScreen();
    expect(screen.getByTestId('sample-price')).toHaveTextContent('then £2.49 / month');
  });
});
