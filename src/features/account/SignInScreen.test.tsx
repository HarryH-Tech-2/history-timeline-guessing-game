import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { SignInScreen } from './SignInScreen';

jest.mock('@/config/env', () => ({ isFirebaseConfigured: true, firebaseConfig: {} }));

const mockRouter = { replace: jest.fn(), back: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));

const mockAuth = {
  hasAccount: false,
  signInWithGoogle: jest.fn(() => Promise.resolve()),
};
jest.mock('@/services/firebase/auth', () => ({ useAuth: () => mockAuth }));

describe('SignInScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.signInWithGoogle.mockImplementation(() => Promise.resolve());
  });

  it('offers Google sign-in only — no email or password fields', () => {
    render(<SignInScreen />);
    expect(screen.getByTestId('google-sign-in')).toBeOnTheScreen();
    expect(screen.queryByTestId('email-input')).toBeNull();
    expect(screen.queryByTestId('password-input')).toBeNull();
    expect(screen.queryByTestId('mode-toggle')).toBeNull();
    expect(screen.queryByTestId('forgot-password')).toBeNull();
  });

  it('tells the player Premium does not need an account', () => {
    render(<SignInScreen />);
    expect(screen.getByText(/without an account/)).toBeOnTheScreen();
  });

  it('signs in with Google and returns to the previous screen', async () => {
    render(<SignInScreen />);
    fireEvent.press(screen.getByTestId('google-sign-in'));
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    expect(mockAuth.signInWithGoogle).toHaveBeenCalledTimes(1);
  });

  it('shows the error when Google sign-in fails', async () => {
    mockAuth.signInWithGoogle.mockImplementation(() =>
      Promise.reject(new Error('Google sign-in was cancelled.')),
    );
    render(<SignInScreen />);
    fireEvent.press(screen.getByTestId('google-sign-in'));
    expect(await screen.findByText('Google sign-in was cancelled.')).toBeOnTheScreen();
    expect(mockRouter.back).not.toHaveBeenCalled();
  });
});
