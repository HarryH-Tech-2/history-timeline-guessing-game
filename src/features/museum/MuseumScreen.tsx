import { Image, ScrollView, Text, View } from 'react-native';

import { Screen } from '@/components/ui';
import { getCategories, getQuestionsByCategory, imageForQuestion } from '@/data';
import {
  acquireThreshold,
  MASTERY_BADGES,
  masteryTier,
  type Category,
  type Question,
} from '@/domain';
import { useProgression } from '@/features/progression';

/**
 * One artefact slot. Acquired shows the question's illustration and title;
 * unacquired stays a mystery tile so the wing reads as a collection to finish.
 */
function ArtefactTile({ question, acquired }: { question: Question; acquired: boolean }) {
  const image = imageForQuestion(question.id);

  if (!acquired || !image) {
    return (
      <View
        testID={`artefact-locked-${question.id}`}
        className="aspect-square min-w-[21%] flex-1 items-center justify-center rounded-xl border border-hair bg-bg-overlay"
      >
        <Text className="text-xl text-ink-muted">?</Text>
      </View>
    );
  }

  return (
    <View className="min-w-[21%] flex-1" testID={`artefact-${question.id}`}>
      <Image
        source={image}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
        accessible
        accessibilityLabel={question.title}
        className="aspect-square w-full rounded-xl bg-bg-overlay"
      />
    </View>
  );
}

/** A category wing: header with mastery badge and progress, then the shelves. */
function Wing({
  category,
  questions,
  collection,
}: {
  category: Category;
  questions: readonly Question[];
  collection: Readonly<Record<string, number>>;
}) {
  const acquired = questions.filter((q) => collection[q.id] !== undefined).length;
  const tier = masteryTier(acquired, questions.length);
  const badge = tier ? MASTERY_BADGES[tier] : null;
  const pct = questions.length === 0 ? 0 : Math.round((acquired / questions.length) * 100);

  return (
    <View className="gap-3" testID={`wing-${category.id}`}>
      <View>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View className="h-4 w-1.5 rounded-full" style={{ backgroundColor: category.colour }} />
            <Text className="text-lg font-bold text-ink-primary">{category.name}</Text>
            {badge && <Text className="text-base">{badge.icon}</Text>}
          </View>
          <Text className="text-sm font-semibold text-ink-muted">
            {acquired} / {questions.length}
          </Text>
        </View>
        <View className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-overlay">
          <View
            className="h-full rounded-full"
            style={{ width: `${pct}%`, backgroundColor: category.colour }}
          />
        </View>
      </View>

      <View className="flex-row flex-wrap gap-2">
        {questions.map((q) => (
          <ArtefactTile key={q.id} question={q} acquired={collection[q.id] !== undefined} />
        ))}
      </View>
    </View>
  );
}

/**
 * The player's museum: every question is an artefact slot, earned by guessing
 * within its difficulty's threshold (see {@link acquireThreshold}). Wings map
 * to categories; filling a wing earns its mastery badge.
 */
export function MuseumScreen() {
  const { state } = useProgression();
  const categories = getCategories().filter((c) => c.active);

  const wings = categories.map((category) => ({
    category,
    questions: getQuestionsByCategory(category.id),
  }));
  const total = wings.reduce((n, w) => n + w.questions.length, 0);
  const acquired = wings.reduce(
    (n, w) => n + w.questions.filter((q) => state.collection[q.id] !== undefined).length,
    0,
  );

  return (
    <Screen>
      <ScrollView
        contentContainerClassName="px-5 pt-6 pb-10 gap-6"
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Text className="text-3xl font-extrabold text-ink-primary">Museum</Text>
          <Text className="text-base text-ink-secondary">
            Guess close to the real year to add an artefact to your collection.
          </Text>
          <Text className="mt-1 text-sm font-semibold text-accent">
            {acquired} of {total} artefacts collected
          </Text>
        </View>

        {wings.map(({ category, questions }) => (
          <Wing
            key={category.id}
            category={category}
            questions={questions}
            collection={state.collection}
          />
        ))}
      </ScrollView>
    </Screen>
  );
}
