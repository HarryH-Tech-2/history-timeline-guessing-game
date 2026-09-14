import { useState } from 'react';
import { Image, Pressable, View, type ImageSourcePropType } from 'react-native';

import { ImageLightbox } from '@/components/ui';

interface RevealImageProps {
  source: ImageSourcePropType;
  title: string;
}

/**
 * Takes the timeline's place once the answer is revealed: the reveal sheet
 * gives the year and the distance, so the illustration is the payoff here.
 * Fills the stage the track occupied; tap to open full-screen.
 */
export function RevealImage({ source, title }: RevealImageProps) {
  const [zoomed, setZoomed] = useState(false);
  return (
    <View className="flex-1 items-center justify-center py-2" testID="reveal-image">
      <Pressable
        onPress={() => setZoomed(true)}
        accessibilityRole="imagebutton"
        accessibilityLabel={`Enlarge illustration of ${title}`}
        testID="reveal-image-button"
        className="w-full flex-1 items-center"
      >
        <Image
          source={source}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
          className="bg-bg-overlay"
          style={{ width: '100%', flex: 1, maxHeight: 256, aspectRatio: 1 }}
        />
      </Pressable>
      <ImageLightbox
        visible={zoomed}
        source={source}
        title={title}
        onClose={() => setZoomed(false)}
      />
    </View>
  );
}
