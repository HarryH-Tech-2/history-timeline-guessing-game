/**
 * `@react-native-google-signin/google-signin` calls
 * `TurboModuleRegistry.getEnforcing('RNGoogleSignin')` while it is being
 * evaluated. Under Metro a throw during module evaluation is reported as a
 * FATAL error even inside try/catch, so the loader must check that the native
 * module exists *before* importing the package (Expo Go, older dev clients).
 */
describe('loadGoogleSignin', () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock('@react-native-google-signin/google-signin');
  });

  it('returns null without evaluating the package when the native module is absent', async () => {
    const factory = jest.fn(() => {
      throw new Error("TurboModuleRegistry.getEnforcing(...): 'RNGoogleSignin' could not be found");
    });
    jest.doMock('@react-native-google-signin/google-signin', factory);

    const { loadGoogleSignin } = jest.requireActual<typeof import('./googleSignin')>('./googleSignin');
    await expect(loadGoogleSignin()).resolves.toBeNull();
    expect(factory).not.toHaveBeenCalled();
  });
});
