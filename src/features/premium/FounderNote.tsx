import { Image, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

/**
 * The developer's photo. Replace `assets/founder.jpg` with a real photo to
 * change it — the round crop and layout stay the same. (The current file is a
 * placeholder monogram until a photo is dropped in.)
 */
const FOUNDER_PHOTO = require('../../../assets/founder.jpg');

const PHOTO_SIZE = 88;

/**
 * A personal note from the developer at the top of the paywall: photo on the
 * left, a friendly message in a speech plaque beside it. Replaces the mascot
 * here on purpose — a real person asking for support converts better than an
 * owl, and the owl still hosts every other end-of-run screen.
 */
export function FounderNote({ line }: { line: string }) {
  return (
    <Animated.View
      entering={FadeInUp.springify().damping(18)}
      className="flex-row items-center gap-3"
      testID="founder-note"
    >
      <Image
        source={FOUNDER_PHOTO}
        accessibilityIgnoresInvertColors
        accessible
        accessibilityLabel="Photo of Harry, the developer"
        style={{
          width: PHOTO_SIZE,
          height: PHOTO_SIZE,
          borderRadius: PHOTO_SIZE / 2,
        }}
        className="border border-hair"
      />
      <View className="flex-1 border border-hair bg-bg-raised px-4 py-3">
        <Text className="text-base font-semibold leading-snug text-ink-primary">{line}</Text>
      </View>
    </Animated.View>
  );
}
