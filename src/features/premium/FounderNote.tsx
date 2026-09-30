import { Image, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { t } from '@/i18n';

/**
 * The developer's photo. Replace `assets/founder.jpg` with a real photo to
 * change it — the round crop and layout stay the same. (The current file is a
 * placeholder monogram until a photo is dropped in.)
 */
const FOUNDER_PHOTO = require('../../../assets/founder.webp');

const PHOTO_SIZE = 88;
const COMPACT_PHOTO_SIZE = 56;

/**
 * A personal note from the developer at the top of the paywall: photo on the
 * left, a friendly message in a speech plaque beside it. Replaces the mascot
 * here on purpose — a real person asking for support converts better than an
 * owl, and the owl still hosts every other end-of-run screen.
 *
 * `paragraphs[0]` is the greeting and renders bold; the rest render as short
 * regular-weight paragraphs. The bubble sits in a narrow column beside the
 * photo, so one long bold block reads as a wall — keep each beat short.
 */
export function FounderNote({
  paragraphs,
  compact = false,
}: {
  paragraphs: string[];
  /** Smaller photo and bubble, for the top of the paywall above the plans. */
  compact?: boolean;
}) {
  const [greeting, ...body] = paragraphs;
  const size = compact ? COMPACT_PHOTO_SIZE : PHOTO_SIZE;
  return (
    <Animated.View
      entering={FadeInUp.springify().damping(18)}
      className="flex-row items-center gap-3"
      testID="founder-note"
    >
      <Image
        source={FOUNDER_PHOTO}
        resizeMethod="resize"
        accessibilityIgnoresInvertColors
        accessible
        accessibilityLabel={t('paywall.founder.photo')}
        testID="founder-photo"
        style={{ width: size, height: size, borderRadius: size / 2 }}
        className="border border-hair"
      />
      <View className="relative flex-1">
        <View
          className={`gap-1.5 rounded-2xl border border-hair bg-bg-raised ${
            compact ? 'px-3 py-2' : 'px-4 py-3'
          }`}
        >
          <Text
            className={`${compact ? 'text-sm' : 'text-base'} font-semibold leading-snug text-ink-primary`}
            testID="founder-line"
          >
            {greeting}
          </Text>
          {body.map((paragraph) => (
            <Text key={paragraph} className="text-[15px] leading-relaxed text-ink-primary">
              {paragraph}
            </Text>
          ))}
        </View>
        {/* Speech-bubble tail: a rotated square over the bubble's left border,
            so only its two outward edges read as the tail's outline. */}
        <View
          className="absolute h-3 w-3 border-b border-l border-hair bg-bg-raised"
          style={{ left: -6, top: '50%', marginTop: -6, transform: [{ rotate: '45deg' }] }}
        />
      </View>
    </Animated.View>
  );
}
