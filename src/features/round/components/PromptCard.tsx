import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import { Card, ImageLightbox } from '@/components/ui';
import { imageForQuestion } from '@/data';

interface PromptCardProps {
  questionId: string;
  title: string;
  subtitle: string;
  /**
   * Collapsed layout for the reveal: thumbnail plus headline only, so the
   * timeline and the reveal sheet both fit on screen without overlapping.
   */
  compact?: boolean;
}

/** The question prompt: illustration, headline, supporting line. Tapping the
 * illustration opens it full-screen with pinch-to-zoom. */
export function PromptCard({ questionId, title, subtitle, compact = false }: PromptCardProps) {
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
      <Card className="flex-row items-center gap-3 py-3" testID="prompt-card-compact">
        {image && (
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
              className="h-12 w-12 bg-bg-overlay"
              style={{ aspectRatio: 1 }}
              testID="prompt-image"
            />
          </Pressable>
        )}
        <Text numberOfLines={2} className="flex-1 text-lg font-bold leading-tight text-ink-primary">
          {title}
        </Text>
        {lightbox}
      </Card>
    );
  }

  return (
    <Card className="items-center gap-3">
      {image && (
        <Pressable
          onPress={() => setZoomed(true)}
          accessibilityRole="imagebutton"
          accessibilityLabel={`Enlarge illustration of ${title}`}
          testID="prompt-image-button"
          className="self-center"
        >
          <Image
            source={image}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
            className="h-64 w-64 bg-bg-overlay"
            style={{ aspectRatio: 1 }}
            testID="prompt-image"
          />
        </Pressable>
      )}

      <Text className="text-center text-2xl font-bold leading-tight text-ink-primary">
        {title}
      </Text>
      {subtitle.length > 0 && (
        <Text className="text-center text-base text-ink-secondary">{subtitle}</Text>
      )}
      {lightbox}
    </Card>
  );
}
