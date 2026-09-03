/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  // react-native-worklets' native entrypoint needs a real native module.
  // Its bundled resolver strips the `.native` extension so Jest loads the
  // JS fallback instead of NativeWorklets.native.ts.
  resolver: '<rootDir>/node_modules/react-native-worklets/jest/resolver.js',
  setupFilesAfterEnv: ['<rootDir>/jest-setup.ts'],
  // Agent worktrees are full checkouts inside the repo; never run their copies.
  testPathIgnorePatterns: ['/node_modules/', '/\\.claude/'],
  modulePathIgnorePatterns: ['<rootDir>/\\.claude/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|nativewind|react-native-css-interop|react-native-reanimated|react-native-gesture-handler|react-native-worklets))',
  ],
};
