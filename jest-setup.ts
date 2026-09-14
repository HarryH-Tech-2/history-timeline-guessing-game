// Gesture Handler ships a Jest setup that stubs its native module.
// (@testing-library/react-native v13+ registers its matchers automatically.)
import 'react-native-gesture-handler/jestSetup';

// expo-audio needs a native player; stand in a recording double so components
// can fire stings and tests can assert on them.
jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({
    play: jest.fn(),
    pause: jest.fn(),
    seekTo: jest.fn(() => Promise.resolve()),
    remove: jest.fn(),
    isLoaded: true,
  })),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
}));

// The share-image pipeline is native on both ends: view capture and the share
// sheet. Stand in doubles so screens can share and tests can assert on it.
jest.mock('react-native-view-shot', () => ({
  captureRef: jest.fn(() => Promise.resolve('file:///tmp/capture.png')),
}));
jest.mock('react-native-share', () => ({
  __esModule: true,
  default: { open: jest.fn(() => Promise.resolve({ success: true, message: 'ok' })) },
}));

// AsyncStorage's native module isn't present under Jest; use its in-memory mock.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// PostHog talks to the network and native app-info modules; stand in a
// recording double so services can track and tests can assert on it.
jest.mock('posthog-react-native', () => {
  const instance = {
    capture: jest.fn(),
    identify: jest.fn(),
    optIn: jest.fn(() => Promise.resolve()),
    optOut: jest.fn(() => Promise.resolve()),
    flush: jest.fn(() => Promise.resolve()),
  };
  return { __esModule: true, default: jest.fn(() => instance) };
});
