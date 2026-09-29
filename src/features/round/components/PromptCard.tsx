import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import { Card, ImageLightbox } from '@/components/ui';
import { imageForQuestion } from '@/data';

/** Largest illustration edge (it is also capped at the card's width), and
 * the smallest it may shrink to when the screen is short. */
const IMAGE_MAX = 360;
const IMAGE_MIN = 112;

interface PromptCardProps {
  questionId: string;
  title: string;
  /**
   * Collapsed layout for the reveal: thumbnail plus headline only, so the
   * timeline and the reveal sheet both fit on screen without overlapping.
   */
  compact?: boolean;
  /** Hide the thumbnail in the compact layout (the illustration is shown
   * large elsewhere on screen, so it need not repeat here). */
  showImage?: boolean;
}

/** The question prompt: illustration and the event's name. Tapping the
 * illustration opens it full-screen with pinch-to-zoom. */
export function PromptCard({
  questionId,
  title,
  compact = false,
  showImage = true,
}: PromptCardProps) {
  const image = imageForQuestion(questionId);
  const [zoomed, setZoomed] = useState(false);

  const lightbox = image ? (
    <ImageLightbox
      visible={zoomed}
      source={image}
      title={title}
      onClose={() => setZoomed(false)}
    />
  ) : null;

  if (compact) {
    return (
      <Card className="items-center gap-1.5 py-3" testID="prompt-card-compact">
        {image && showImage && (
          <Pressable
            onPress={() => setZoomed(true)}
            accessibilityRole="imagebutton"
            accessibilityLabel={`Enlarge illustration of ${title}`}
            hitSlop={6}
            testID="prompt-image-button"
          >
            <Image
              source={image}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
              className="h-16 w-16 bg-bg-overlay"
              style={{ aspectRatio: 1 }}
              testID="prompt-image"
            />
          </Pressable>
        )}
        {/* A short accent rule above the headline: the reveal's "plaque" moment. */}
        <View className="h-0.5 w-8 rounded-full bg-accent" />
        <Text
          numberOfLines={2}
          className="text-center text-xl font-extrabold leading-tight text-ink-primary"
          style={{ textWrap: 'balance' } as object}
        >
          {title}
        </Text>
        {lightbox}
      </Card>
    );
  }

  // The illustration is the one part of the round that can give up space: on
  // shorter phones, or under a taller header, it shrinks (square, never below
  // IMAGE_MIN) so the timeline below keeps its full height instead of being
  // squeezed and spilling over this card and the buttons.
  return (
    <Card className="shrink items-center gap-3 p-4" style={{ minHeight: 0 }}>
      {image && (
        <Pressable
          onPress={() => setZoomed(true)}
          accessibilityRole="imagebutton"
          accessibilityLabel={`Enlarge illustration of ${title}`}
          testID="prompt-image-button"
          className="shrink self-center"
          style={{ height: IMAGE_MAX, minHeight: IMAGE_MIN, maxWidth: '100%', aspectRatio: 1 }}
        >
          <Image
            source={image}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
            className="h-full w-full bg-bg-overlay"
            testID="prompt-image"
          />
        </Pressable>
      )}

      <Text className="text-center text-2xl font-bold leading-tight text-ink-primary">
        {title}
      </Text>
      {lightbox}
    </Card>
  );
}
