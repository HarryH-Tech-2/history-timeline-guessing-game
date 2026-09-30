const { withAppBuildGradle } = require('expo/config-plugins');

const UNOPTIMIZED = 'getDefaultProguardFile("proguard-android.txt")';
const OPTIMIZED = 'getDefaultProguardFile("proguard-android-optimize.txt")';

/**
 * Lets R8 optimise the release build, not just shrink it. The Expo template
 * pairs minify with Android's `proguard-android.txt`, which carries
 * `-dontoptimize`; Play Console flags that ("Improve your app's memory and
 * performance with R8 optimization"). The optimize variant keeps the same keep
 * rules and drops that flag. Minify and resource shrinking themselves are
 * switched on through expo-build-properties.
 */
function withR8Optimize(config) {
  return withAppBuildGradle(config, (c) => {
    c.modResults.contents = c.modResults.contents.replace(UNOPTIMIZED, OPTIMIZED);
    return c;
  });
}

module.exports = withR8Optimize;
module.exports.UNOPTIMIZED = UNOPTIMIZED;
module.exports.OPTIMIZED = OPTIMIZED;
