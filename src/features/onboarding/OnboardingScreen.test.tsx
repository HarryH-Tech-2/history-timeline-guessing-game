import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { OnboardingScreen } from './OnboardingScreen';
import { onboardingStore } from './onboardingStore';

const mockRouter = { replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: () => false };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useRootNavigationState: () => ({ key: 'root' }),
}));
jest.mock('@/services/analytics', () => ({ track: jest.fn() }));
jest.mock('@/services/firebase/auth', () => ({
  useAuth: () => ({ uid: 'uid-1', isSignedIn: true, hasAccount: false, isLoading: false }),
}));
const mockReminders = {
  enabled: false,
  asked: false,
  isLoading: false,
  enable: jest.fn(async () => true),
  disable: jest.fn(),
};
const mockPremium = { isPremium: false };
jest.mock('@/features/premium/PremiumProvider', () => ({ usePremium: () => mockPremium }));
jest.mock('@/features/reminders', () => ({ useReminders: () => mockReminders }));

const { track } = jest.requireMock<typeof import('@/services/analytics')>('@/services/analytics');

describe('OnboardingScreen', () => {
  beforeEach(() => {
    jest.mocked(track).mockClear();
    mockRouter.replace.mockClear();
    mockRouter.push.mockClear();
    mockPremium.isPremium = false;
  });
  afterEach(() => onboardingStore.clear());

  it('walks through all three steps and lands in the Daily', async () => {
    render(<OnboardingScreen />);
    expect(track).toHaveBeenCalledWith('onboarding_step_viewed', { step: 1 });

    fireEvent.press(screen.getByTestId('onboarding-next')); // welcome → first guess
    expect(track).toHaveBeenCalledWith('onboarding_step_viewed', { step: 2 });
    expect(screen.getByTestId('onboarding-coach-marks')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('submit-button'));
    expect(screen.getByTestId('reveal-sheet')).toBeOnTheScreen();
    expect(screen.queryByTestId('onboarding-coach-marks')).toBeNull();
    fireEvent.press(screen.getByTestId('next-button')); // reveal → setup
    // Next hands off a frame later, once the timeline has stopped.
    await waitFor(() => expect(screen.getByTestId('onboarding-explore')).toBeOnTheScreen());
    expect(track).toHaveBeenCalledWith('onboarding_step_viewed', { step: 3 });
    expect(track).not.toHaveBeenCalledWith('onboarding_step_viewed', { step: 4 });
    expect(screen.queryByTestId('onboarding-skip')).toBeNull(); // no skipping the last step

    await act(async () => {
      fireEvent.press(screen.getByTestId('onboarding-play-daily'));
    });
    expect(track).toHaveBeenCalledWith('onboarding_completed', {
      choice: 'daily',
      named: false,
      reminders: false,
    });
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)'));
    expect(mockRouter.push).toHaveBeenCalledWith('/daily');
    expect((await onboardingStore.read()).completedAt).toEqual(expect.any(Number));
  });

  /** Walk to the last step and finish it via Explore. */
  async function finishViaExplore() {
    render(<OnboardingScreen />);
    fireEvent.press(screen.getByTestId('onboarding-next'));
    fireEvent.press(screen.getByTestId('submit-button'));
    fireEvent.press(screen.getByTestId('next-button'));
    await waitFor(() => expect(screen.getByTestId('onboarding-explore')).toBeOnTheScreen());
    await act(async () => {
      fireEvent.press(screen.getByTestId('onboarding-explore'));
    });
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)'));
  }

  it('never ends on the paywall, whichever way the player leaves', async () => {
    await finishViaExplore();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('opens only the Daily when that was the choice', async () => {
    render(<OnboardingScreen />);
    fireEvent.press(screen.getByTestId('onboarding-next'));
    fireEvent.press(screen.getByTestId('submit-button'));
    fireEvent.press(screen.getByTestId('next-button'));
    await waitFor(() => expect(screen.getByTestId('onboarding-explore')).toBeOnTheScreen());
    await act(async () => {
      fireEvent.press(screen.getByTestId('onboarding-play-daily'));
    });
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith('/daily'));
    expect(mockRouter.push.mock.calls).toEqual([['/daily']]);
  });

  it('records a skip with the step it happened on and goes home', async () => {
    render(<OnboardingScreen />);
    fireEvent.press(screen.getByTestId('onboarding-next'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('onboarding-skip'));
    });
    expect(track).toHaveBeenCalledWith('onboarding_skipped', { step: 2 });
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)'));
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect((await onboardingStore.read()).completedAt).toEqual(expect.any(Number));
  });

  it('rejects an invalid custom name instead of finishing', async () => {
    render(<OnboardingScreen />);
    fireEvent.press(screen.getByTestId('onboarding-next'));
    fireEvent.press(screen.getByTestId('submit-button'));
    fireEvent.press(screen.getByTestId('next-button'));
    await waitFor(() => expect(screen.getByTestId('onboarding-explore')).toBeOnTheScreen());

    fireEvent.changeText(screen.getByTestId('onboarding-name'), 'ab');
    fireEvent.press(screen.getByTestId('onboarding-explore'));
    expect(screen.getByText(/at least 3/)).toBeOnTheScreen();
    expect(track).not.toHaveBeenCalledWith('onboarding_completed', expect.anything());
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
});
