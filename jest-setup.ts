// Gesture Handler ships a Jest setup that stubs its native module.
// (@testing-library/react-native v13+ registers its matchers automatically.)
import 'react-native-gesture-handler/jestSetup';

// AsyncStorage's native module isn't present under Jest; use its in-memory mock.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
