import { Image, View, type ImageSourcePropType } from 'react-native';

/** One painted scene per era, each with a calm winding road down its centre. */
const ERA_ART: Record<string, ImageSourcePropType> = {
  ancient: require('../../../../../assets/campaign/era-ancient.webp'),
  medieval: require('../../../../../assets/campaign/era-medieval.webp'),
  'early-modern': require('../../../../../assets/campaign/era-early-modern.webp'),
  nineteenth: require('../../../../../assets/campaign/era-nineteenth.webp'),
  modern: require('../../../../../assets/campaign/era-modern.webp'),
};

/** Half-height of the soft band that hides the seam between two paintings. */
const FADE = 80;
/** Strips per half-band; more strips, smoother ramp. */
const FADE_STEPS = 10;
/** Wash opacity right on the seam. */
const FADE_PEAK = 0.6;

export interface BackdropSection {
  id: string;
  /** Content-space top of the painted area. */
  top: number;
  height: number;
}

/**
 * The scenery behind the campaign trail: each era's painting cover-fitted to
 * its section (scaled up to cover when the section is taller than the art —
 * never tiled or mirrored), a light theme wash over the lot, and a soft band
 * of that wash thickening towards each join so one era melts into the next.
 */
export function EraBackdrop({
  sections,
  wash,
}: {
  sections: readonly BackdropSection[];
  /** The theme's base background colour (#RRGGBB). */
  wash: string;
}) {
  const bottom = sections.reduce((max, s) => Math.max(max, s.top + s.height), 0);
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, height: bottom }}
      className="overflow-hidden"
      testID="era-backdrop"
    >
      {sections.map((section) => {
        const art = ERA_ART[section.id];
        if (art === undefined) return null;
        return (
          <View
            key={section.id}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: section.top,
              height: section.height,
              overflow: 'hidden',
            }}
          >
            <Image
              source={art}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
              style={{ width: '100%', height: '100%' }}
            />
          </View>
        );
      })}
      {/* Theme-background wash over every painting so the UI on top stays readable. */}
      <View
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        className="bg-bg-base/30"
      />
      {sections.slice(1).map((section) => (
        <View
          key={`seam-${section.id}`}
          style={{ position: 'absolute', left: 0, right: 0, top: section.top - FADE }}
        >
          {Array.from({ length: FADE_STEPS * 2 }, (_, i) => {
            // 0 at the band's edges, 1 on the seam itself.
            const toSeam = i < FADE_STEPS ? (i + 1) / FADE_STEPS : (FADE_STEPS * 2 - i) / FADE_STEPS;
            const alpha = Math.round(FADE_PEAK * toSeam * toSeam * 255)
              .toString(16)
              .padStart(2, '0');
            return (
              <View
                key={i}
                style={{ height: FADE / FADE_STEPS, backgroundColor: `${wash}${alpha}` }}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}
