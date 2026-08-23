import { Image, Text, View } from 'react-native';

import { Card } from '@/components/ui';
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

/** The question prompt: illustration, headline, supporting line. */
export function PromptCard({ questionId, title, subtitle, compact = false }: PromptCardProps) {
  const image = imageForQuestion(questionId);

  if (compact) {
    return (
      <Card className="flex-row items-center gap-3 py-3" testID="prompt-card-compact">
        {image && (
          <Image
            source={image}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
            accessible
            accessibilityLabel={`Illustration of ${title}`}
            className="h-12 w-12 rounded-lg bg-bg-overlay"
            style={{ aspectRatio: 1 }}
            testID="prompt-image"
          />
        )}
        <Text numberOfLines={2} className="flex-1 text-lg font-bold leading-tight text-ink-primary">
          {title}
        </Text>
      </Card>
    );
  }

  return (
    <Card className="items-center gap-3">
      {image && (
        <Image
          source={image}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
          accessible
          accessibilityLabel={`Illustration of ${title}`}
          className="h-64 w-64 self-center rounded-xl bg-bg-overlay"
          style={{ aspectRatio: 1 }}
          testID="prompt-image"
        />
      )}

      <Text className="text-center text-2xl font-bold leading-tight text-ink-primary">
        {title}
      </Text>
      {subtitle.length > 0 && (
        <Text className="text-center text-base text-ink-secondary">{subtitle}</Text>
      )}
    </Card>
  );
}
