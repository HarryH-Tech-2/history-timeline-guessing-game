import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { BackButton, Button, Card, ImageLightbox, Screen } from '@/components/ui';
import { getCategoryById, getQuestionById, imageForQuestion } from '@/data';
import { deepDiveFor } from '@/data/deepDives';
import { paywallHref } from '@/features/premium/paywallSource';
import { usePremium } from '@/features/premium/PremiumProvider';
import { displayYear, t } from '@/i18n';
import { track } from '@/services/analytics';

import { FavouriteButton } from './FavouriteButton';

/** Largest illustration edge on the page. */
const IMAGE_MAX = 320;

function Section({ title, body }: { title: string; body: string }) {
  return (
    <View className="gap-1.5">
      <Text className="text-xs font-extrabold uppercase tracking-widest text-accent">{title}</Text>
      <Text className="text-[15px] leading-6 text-ink-secondary">{body}</Text>
    </View>
  );
}

/**
 * A favourite's page: the event's art, year and description, then the deep
 * dive (why it happened, what it changed). The deep dive is the Premium part:
 * a free player sees its opening lines and the way to unlock the rest.
 */
export function EventDetailScreen({ questionId }: { questionId: string }) {
  const router = useRouter();
  const { isPremium } = usePremium();
  const { width } = useWindowDimensions();
  const [zoomed, setZoomed] = useState(false);

  const question = getQuestionById(questionId);
  const deepDive = deepDiveFor(questionId);
  const locked = !isPremium;

  useEffect(() => {
    if (question) track('favourite_opened', { question_id: questionId, locked });
    // Once per page, not again when the entitlement lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionId]);

  const back = <BackButton onPress={() => router.back()} testID="event-back" />;

  if (!question) {
    return (
      <Screen className="px-5 pt-4">
        {back}
        <Text className="mt-6 text-base text-ink-secondary" testID="event-not-found">
          {t('social.event.notFound')}
        </Text>
      </Screen>
    );
  }

  const image = imageForQuestion(question.id);
  const category = getCategoryById(question.categoryId);
  const imageEdge = Math.min(IMAGE_MAX, width - 40);

  return (
    <Screen>
      <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-4" showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center justify-between">
          {back}
          <FavouriteButton questionId={question.id} />
        </View>

        {image && (
          <Pressable
            onPress={() => setZoomed(true)}
            accessibilityRole="imagebutton"
            accessibilityLabel={t('round.image.enlarge', { title: question.title })}
            className="self-center"
            testID="event-image"
          >
            <Image
              source={image}
              resizeMethod="resize"
              resizeMode="contain"
              accessibilityIgnoresInvertColors
              className="bg-bg-overlay"
              style={{ width: imageEdge, height: imageEdge }}
            />
          </Pressable>
        )}

        <View className="gap-1">
          {category && (
            <Text
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: category.colour }}
            >
              {category.name}
            </Text>
          )}
          <Text className="text-3xl font-extrabold leading-tight text-ink-primary">
            {question.title}
          </Text>
          <Text
            className="text-xl font-bold text-ink-secondary"
            style={{ fontVariant: ['tabular-nums'] }}
            testID="event-year"
          >
            {displayYear(question.year)}
          </Text>
        </View>

        <Text className="text-[15px] leading-6 text-ink-secondary">{question.longDescription}</Text>

        {deepDive && !locked && (
          <View className="gap-5" testID="event-deep-dive">
            <Section title={t('social.event.why')} body={deepDive.why} />
            <Section title={t('social.event.impact')} body={deepDive.impact} />
          </View>
        )}

        {deepDive && locked && (
          <Card className="gap-3" testID="event-locked">
            <Text className="text-xs font-extrabold uppercase tracking-widest text-accent">
              {t('social.event.why')}
            </Text>
            {/* The opening lines only: enough to want the rest. */}
            <Text numberOfLines={2} className="text-[15px] leading-6 text-ink-secondary opacity-60">
              {deepDive.why}
            </Text>
            <View className="h-px bg-hair" />
            <Text className="text-lg font-extrabold text-ink-primary">
              🔒 {t('social.event.lockedTitle')}
            </Text>
            <Text className="text-sm text-ink-secondary">{t('social.event.lockedBody')}</Text>
            <Button
              label={t('social.event.unlock')}
              onPress={() => router.push(paywallHref('favourites'))}
              testID="event-unlock"
            />
          </Card>
        )}
      </ScrollView>

      {image && (
        <ImageLightbox
          visible={zoomed}
          source={image}
          title={question.title}
          onClose={() => setZoomed(false)}
        />
      )}
    </Screen>
  );
}
