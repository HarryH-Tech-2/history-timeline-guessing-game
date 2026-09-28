import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';

import { isAppleSignInAvailable, requestAppleCredential } from './appleSignin';

jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: jest.fn(async () => true),
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));
jest.mock('expo-crypto', () => ({
  randomUUID: () => 'raw-nonce',
  digestStringAsync: jest.fn(async (_algorithm: string, data: string) => `sha256(${data})`),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

const signInAsync = jest.mocked(AppleAuthentication.signInAsync);

describe('Sign in with Apple', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    signInAsync.mockReset();
  });
  afterEach(() => jest.restoreAllMocks());

  it('sends Apple the hashed nonce and hands Firebase the raw one', async () => {
    signInAsync.mockResolvedValue({
      identityToken: 'jwt',
      authorizationCode: 'code',
    } as AppleAuthentication.AppleAuthenticationCredential);

    await expect(requestAppleCredential()).resolves.toEqual({
      identityToken: 'jwt',
      rawNonce: 'raw-nonce',
      authorizationCode: 'code',
    });
    expect(signInAsync).toHaveBeenCalledWith({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
      nonce: 'sha256(raw-nonce)',
    });
  });

  it('treats closing the sheet as a quiet no-op', async () => {
    signInAsync.mockRejectedValue(Object.assign(new Error('canceled'), { code: 'ERR_REQUEST_CANCELED' }));
    await expect(requestAppleCredential()).resolves.toBeNull();
  });

  it('reports a missing identity token', async () => {
    signInAsync.mockResolvedValue({ identityToken: null } as AppleAuthentication.AppleAuthenticationCredential);
    await expect(requestAppleCredential()).rejects.toThrow('did not return a token');
  });

  it('is unavailable, and never touches the native module, on Android', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    jest.mocked(AppleAuthentication.isAvailableAsync).mockClear();
    await expect(isAppleSignInAvailable()).resolves.toBe(false);
    expect(AppleAuthentication.isAvailableAsync).not.toHaveBeenCalled();
    await expect(requestAppleCredential()).rejects.toThrow('only available on iPhone');
  });
});
