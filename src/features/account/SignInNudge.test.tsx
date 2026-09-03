import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { SignInNudge } from './SignInNudge';
import { markSignInNudgeShown, signInNudgeStore } from './signInNudgeRules';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

const mockAuth = { isSignedIn: true, hasAccount: false };
jest.mock('@/services/firebase/auth', () => ({ useAuth: () => mockAuth }));

describe('SignInNudge', () => {
  beforeEach(() => {
    mockAuth.isSignedIn = true;
    mockAuth.hasAccount = false;
    mockPush.mockClear();
  });
  afterEach(() => signInNudgeStore.clear());

  it('invites a guest to keep their progress after the milestone', async () => {
    render(<SignInNudge milestone="campaign-first-stage" active />);
    expect(await screen.findByTestId('sign-in-nudge')).toBeOnTheScreen();
    expect(screen.getByText(/playing as a guest/i)).toBeOnTheScreen();
  });

  it('says nothing to a player who already has an account', async () => {
    mockAuth.hasAccount = true;
    render(<SignInNudge milestone="campaign-first-stage" active />);
    await waitFor(() => expect(signInNudgeStore.read()).resolves.toBeDefined());
    expect(screen.queryByTestId('sign-in-nudge')).toBeNull();
  });

  it('stays quiet until the milestone is actually reached', async () => {
    render(<SignInNudge milestone="campaign-first-stage" active={false} />);
    await waitFor(() => expect(signInNudgeStore.read()).resolves.toBeDefined());
    expect(screen.queryByTestId('sign-in-nudge')).toBeNull();
  });

  it('"Not now" hides the card and never shows this milestone again', async () => {
    const { unmount } = render(<SignInNudge milestone="campaign-first-stage" active />);
    fireEvent.press(await screen.findByText('Not now'));
    expect(screen.queryByTestId('sign-in-nudge')).toBeNull();
    await waitFor(async () => {
      expect((await signInNudgeStore.read()).shown['campaign-first-stage']).toEqual(
        expect.any(Number),
      );
    });
    unmount();

    render(<SignInNudge milestone="campaign-first-stage" active />);
    await waitFor(() => expect(signInNudgeStore.read()).resolves.toBeDefined());
    expect(screen.queryByTestId('sign-in-nudge')).toBeNull();
  });

  it('"Sign in" opens the sign-in screen and counts as shown', async () => {
    render(<SignInNudge milestone="campaign-first-stage" active />);
    fireEvent.press(await screen.findByText('Sign in'));
    expect(mockPush).toHaveBeenCalledWith('/sign-in');
    await waitFor(async () => {
      expect((await signInNudgeStore.read()).shown['campaign-first-stage']).toEqual(
        expect.any(Number),
      );
    });
  });

  it('respects the cooldown after a different milestone nudged recently', async () => {
    await signInNudgeStore.write(markSignInNudgeShown({ shown: {} }, 'level-up', Date.now()));
    render(<SignInNudge milestone="campaign-first-stage" active />);
    await waitFor(() => expect(signInNudgeStore.read()).resolves.toBeDefined());
    expect(screen.queryByTestId('sign-in-nudge')).toBeNull();
  });
});
