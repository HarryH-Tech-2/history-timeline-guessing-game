module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    // NOTE: Do NOT add 'react-native-worklets/plugin' here. As of Expo SDK 57,
    // babel-preset-expo adds the Reanimated 4 / worklets plugin automatically.
    // Adding it manually applies it twice (and out of order), which corrupts
    // worklet closure serialisation and crashes with errors like
    // "[Worklets] Cannot copy value of type `SimultaneousGesture`".
  };
};
