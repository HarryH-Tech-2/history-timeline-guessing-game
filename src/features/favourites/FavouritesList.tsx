import { useRouter } from 'expo-router';
import { Image, Pressable, Text, View } from 'react-native';

import { getQuestionById, imageForQuestion } from '@/data';
import type { Question } from '@/domain';
import { useProgression } from '@/features/progression/ProgressionProvider';
import { displayYear, t } from '@/i18n';

function FavouriteRow({ question, onOpen }: { question: Question; onOpen: () => void }) {
  const image = imageForQuestion(question.id);
  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`${question.title}, ${displayYear(question.year)}`}
      testID={`favourite-${question.id}`}
      className="flex-row items-center gap-3 border border-hair bg-bg-raised p-3"
    >
      {image ? (
        <Image
          source={image}
          resizeMode="cover"
          resizeMethod="resize"
          accessibilityIgnoresInvertColors
          className="h-14 w-14 bg-bg-overlay"
        />
      ) : (
        <View className="h-14 w-14 items-center justify-center bg-bg-overlay">
          <Text className="text-2xl" style={{ includeFontPadding: false }}>
            🏺
          </Text>
        </View>
      )}
      <View className="flex-1">
        <Text numberOfLines={2} className="text-base font-bold leading-5 text-ink-primary">
          {question.title}
        </Text>
        <Text className="text-sm font-semibold text-ink-muted">{displayYear(question.year)}</Text>
      </View>
      <Text className="text-xl text-ink-muted">›</Text>
    </Pressable>
  );
}

/** The Museum's Favourites tab: every hearted event, newest first. */
export function FavouritesList() {
  const router = useRouter();
  const { state } = useProgression();
  // A favourite whose question has since left the catalogue is simply skipped.
  const questions = state.favourites
    .map((id) => getQuestionById(id))
    .filter((q): q is Question => q !== undefined);

  if (questions.length === 0) {
    return (
      <View className="items-center gap-2 px-4 py-10" testID="favourites-empty">
        <Text className="text-4xl" style={{ includeFontPadding: false }}>
          ♡
        </Text>
        <Text className="text-lg font-bold text-ink-primary">
          {t('social.museum.favouritesEmptyTitle')}
        </Text>
        <Text className="text-center text-sm text-ink-secondary">
          {t('social.museum.favouritesEmpty')}
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-2" testID="favourites-list">
      {questions.map((question) => (
        <FavouriteRow
          key={question.id}
          question={question}
          onOpen={() => router.push({ pathname: '/event/[id]', params: { id: question.id } })}
        />
      ))}
    </View>
  );
}
