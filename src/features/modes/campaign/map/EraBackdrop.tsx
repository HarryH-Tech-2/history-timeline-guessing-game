import { useEffect, useState } from 'react';
import { Image, View, type ImageSourcePropType } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';

/** One painted scene per era, each with a calm winding road down its centre. */
const ERA_ART: Record<string, ImageSourcePropType> = {
  ancient: require('../../../../../assets/campaign/era-ancient.webp'),
  medieval: require('../../../../../assets/campaign/era-medieval.webp'),
  'early-modern': require('../../../../../assets/campaign/era-early-modern.webp'),
  nineteenth: require('../../../../../assets/campaign/era-nineteenth.webp'),
  modern: require('../../../../../assets/campaign/era-modern.webp'),
};

/** How long one era's painting takes to dissolve into the next. */
export const CROSSFADE_MS = 200;

function Painting({ eraId }: { eraId: string }) {
  const art = ERA_ART[eraId];
  if (art === undefined) return null;
  return (
    <Image
      source={art}
      resizeMode="cover"
      accessibilityIgnoresInvertColors
      style={{ width: '100%', height: '100%' }}
      testID={`era-backdrop-${eraId}`}
    />
  );
}

/**
 * The scenery behind the campaign trail: fixed full-screen (it doesn't
 * scroll), showing the painting of the era in view cover-fitted to the
 * screen, so the art stays sharp and there are no joins. When the era in view
 * changes, the new painting fades in over the outgoing one (instantly under
 * reduced motion); at most those two are ever mounted. A light theme wash
 * keeps the UI on top readable.
 */
export function EraBackdrop({ eraId }: { eraId: string }) {
  const reducedMotion = useReducedMotion();
  const [layers, setLayers] = useState<{ current: string; outgoing?: string }>({
    current: eraId,
  });

  // Adjust during render (not in an effect) so the incoming painting mounts
  // in the same frame the era changes.
  if (layers.current !== eraId) {
    setLayers({
      current: eraId,
      outgoing: reducedMotion ? undefined : layers.current,
    });
  }

  const outgoing = layers.outgoing;
  useEffect(() => {
    if (outgoing === undefined) return;
    const timer = setTimeout(() => setLayers((l) => ({ current: l.current })), CROSSFADE_MS + 50);
    return () => clearTimeout(timer);
  }, [outgoing]);

  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      className="overflow-hidden"
      testID="era-backdrop"
    >
      {outgoing !== undefined && (
        <View key={outgoing} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <Painting eraId={outgoing} />
        </View>
      )}
      <Animated.View
        key={layers.current}
        entering={
          outgoing === undefined || reducedMotion ? undefined : FadeIn.duration(CROSSFADE_MS)
        }
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      >
        <Painting eraId={layers.current} />
      </Animated.View>
      {/* Theme-background wash so the UI on top stays readable. */}
      <View
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        className="bg-bg-base/30"
      />
    </View>
  );
}
