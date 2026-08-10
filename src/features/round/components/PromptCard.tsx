import { Image, Text, View } from 'react-native';

import { Card } from '@/components/ui';
import { imageForQuestion } from '@/data';

interface PromptCardProps {
  questionId: string;
  title: string;
  subtitle: string;
  categoryName: string;
  categoryColour: string;
  roundNumber: number;
}

/** The question prompt: illustration, category chip, headline, supporting line. */
export function PromptCard({
  questionId,
  title,
  subtitle,
  categoryName,
  categoryColour,
  roundNumber,
}: PromptCardProps) {
  const image = imageForQuestion(questionId);

  return (
    <Card className="gap-3">
      {image && (
        <Image
          source={image}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
          accessible
          accessibilityLabel={`Illustration of ${title}`}
          className="h-44 w-44 self-center rounded-xl bg-bg-overlay"
          style={{ aspectRatio: 1 }}
          testID="prompt-image"
        />
      )}

      <View className="flex-row items-center justify-between">
        <View
          className="flex-row items-center gap-2 rounded-full px-3 py-1"
          style={{ backgroundColor: `${categoryColour}22` }}
        >
          <View className="h-2 w-2 rounded-full" style={{ backgroundColor: categoryColour }} />
          <Text className="text-xs font-semibold" style={{ color: categoryColour }}>
            {categoryName}
          </Text>
        </View>
        <Text className="text-xs font-medium text-ink-muted">Round {roundNumber}</Text>
      </View>

      <Text className="text-2xl font-bold leading-tight text-ink-primary">{title}</Text>
      {subtitle.length > 0 && (
        <Text className="text-base text-ink-secondary">{subtitle}</Text>
      )}
      <Text className="mt-1 text-sm text-ink-muted">
        When did this happen? Drag the timeline to your answer.
      </Text>
    </Card>
  );
}
