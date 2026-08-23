import { Platform } from 'react-native';

/**
 * Metro treats an exception thrown while a module is first evaluated as a
 * FATAL error (metro-runtime `guardedLoadModule` → `ErrorUtils.reportFatalError`)
 * even when the `import()` that triggered it sits inside try/catch. So the
 * native bridge must never throw at evaluation time — a build without the
 * module (older dev client, Expo Go) has to degrade to "unavailable" instead
 * of crashing on launch.
 */
describe('expo-play-games native bridge', () => {
  it('evaluates without throwing when the native module is absent', () => {
    let bridge: unknown = 'unset';
    expect(() => {
      bridge = jest.requireActual<{ default: unknown }>('../../modules/expo-play-games').default;
    }).not.toThrow();
    expect(bridge).toBeNull();
  });
});

describe('warmUpPlayGames', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('resolves false on Android when the native module is absent', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const { warmUpPlayGames } = jest.requireActual<typeof import('./playGames')>('./playGames');
    await expect(warmUpPlayGames()).resolves.toBe(false);
  });
});
