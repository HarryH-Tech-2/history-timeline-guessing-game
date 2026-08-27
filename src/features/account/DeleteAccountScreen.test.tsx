import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { DeleteAccountScreen } from './DeleteAccountScreen';

jest.mock('@/config/env', () => ({ isFirebaseConfigured: true, firebaseConfig: {} }));

const mockRouter = { replace: jest.fn(), back: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));

const mockCalls: string[] = [];
const mockAuth = {
  uid: 'u1',
  hasAccount: true,
  user: { uid: 'u1', email: 'p@example.com', providerIds: ['password'] },
  reauthenticate: jest.fn((password?: string) => {
    mockCalls.push(`reauth:${password ?? ''}`);
    return Promise.resolve();
  }),
  deleteAccount: jest.fn(() => {
    mockCalls.push('delete');
    return Promise.resolve();
  }),
};
jest.mock('@/services/firebase/auth', () => ({ useAuth: () => mockAuth }));

const mockForgetUser = jest.fn((uid: string) => {
  mockCalls.push(`forget:${uid}`);
  return Promise.resolve();
});
jest.mock('@/features/save/SaveProvider', () => ({ forgetUser: (uid: string) => mockForgetUser(uid) }));

/** Auto-press the destructive option of the native confirm dialog. */
function confirmDialogs() {
  jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
    buttons?.find((b) => b.style === 'destructive')?.onPress?.();
  });
}

describe('DeleteAccountScreen', () => {
  beforeEach(() => {
    mockCalls.length = 0;
    jest.clearAllMocks();
    mockAuth.user = { uid: 'u1', email: 'p@example.com', providerIds: ['password'] };
    confirmDialogs();
  });

  it('asks for the password only when the account signs in with one', () => {
    render(<DeleteAccountScreen />);
    expect(screen.getByTestId('delete-password-input')).toBeTruthy();

    mockAuth.user = { uid: 'u1', email: 'g@example.com', providerIds: ['google.com'] };
    screen.unmount();
    render(<DeleteAccountScreen />);
    expect(screen.queryByTestId('delete-password-input')).toBeNull();
  });

  it('re-authenticates, wipes local saves, deletes the account, then leaves the screen', async () => {
    render(<DeleteAccountScreen />);
    fireEvent.changeText(screen.getByTestId('delete-password-input'), 'hunter22');
    fireEvent.press(screen.getByTestId('delete-account-submit'));

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/profile'));
    expect(mockCalls).toEqual(['reauth:hunter22', 'forget:u1', 'delete']);
  });

  it('refuses to start without a password for a password account', () => {
    render(<DeleteAccountScreen />);
    fireEvent.press(screen.getByTestId('delete-account-submit'));

    expect(screen.getByText('Enter your password to confirm.')).toBeTruthy();
    expect(mockCalls).toEqual([]);
  });

  it('shows the failure and keeps the account when re-authentication fails', async () => {
    mockAuth.reauthenticate.mockRejectedValueOnce(new Error('Email or password is incorrect.'));
    render(<DeleteAccountScreen />);
    fireEvent.changeText(screen.getByTestId('delete-password-input'), 'wrong');
    fireEvent.press(screen.getByTestId('delete-account-submit'));

    expect(await screen.findByText('Email or password is incorrect.')).toBeTruthy();
    expect(mockForgetUser).not.toHaveBeenCalled();
    expect(mockAuth.deleteAccount).not.toHaveBeenCalled();
  });
});
