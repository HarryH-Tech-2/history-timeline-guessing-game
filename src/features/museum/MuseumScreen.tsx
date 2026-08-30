import { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
  type LayoutChangeEvent,
} from 'react-native';

import { ImageLightbox, Screen } from '@/components/ui';
import { getCategories, getQuestionsByCategory, imageForQuestion } from '@/data';
import {
  MASTERY_BADGES,
  masteryTier,
  type Category,
  type Question,
} from '@/domain';
import { useProgression } from '@/features/progression';

/** Artefact grid: fixed column count with a fixed gutter, sized from the
 * measured shelf width so every tile is an exact square (flex-1 + aspect
 * ratio inside a wrapping row does not lay out reliably on Android). */
const COLUMNS = 3;
const GUTTER = 8;
/** Height reserved under every tile for a two-line caption, so rows align. */
const CAPTION_HEIGHT = 34;

interface Zoomed {
  source: ImageSourcePropType;
  title: string;
}

/**
 * One artefact slot. Acquired shows the question's illustration and opens it
 * full-screen on tap; unacquired stays a mystery tile so the wing reads as a
 * collection to finish.
 */
function ArtefactTile({
  question,
  acquired,
  size,
  onZoom,
}: {
  question: Question;
  acquired: boolean;
  size: number;
  onZoom: (zoomed: Zoomed) => void;
}) {
  const image = imageForQuestion(question.id);

  if (!acquired || !image) {
    return (
      <View testID={`artefact-locked-${question.id}`} style={{ width: size }}>
        <View
          style={{ width: size, height: size }}
          className="items-center justify-center border border-hair bg-bg-overlay"
        >
          <Text
            className="text-xl font-semibold text-ink-muted"
            style={{ includeFontPadding: false, textAlignVertical: 'center', lineHeight: 24 }}
          >
            ?
          </Text>
        </View>
        <View style={{ height: CAPTION_HEIGHT }} className="justify-center">
          <Text className="text-center text-xs text-ink-muted">Undiscovered</Text>
        </View>
      </View>
    );
  }

  return (
    <Pressable
      testID={`artefact-${question.id}`}
      onPress={() => onZoom({ source: image, title: question.title })}
      accessibilityRole="imagebutton"
      accessibilityLabel={question.title}
      style={{ width: size }}
    >
      <Image
        source={image}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
        style={{ width: size, height: size }}
        className="bg-bg-overlay"
      />
      <View style={{ height: CAPTION_HEIGHT }} className="justify-center">
        <Text
          numberOfLines={2}
          className="text-center text-xs font-medium leading-4 text-ink-primary"
        >
          {question.title}
        </Text>
      </View>
    </Pressable>
  );
}

/** A category wing: header with mastery badge and progress, then the shelves. */
function Wing({
  category,
  questions,
  collection,
  tileSize,
  onZoom,
}: {
  category: Category;
  questions: readonly Question[];
  collection: Readonly<Record<string, number>>;
  tileSize: number;
  onZoom: (zoomed: Zoomed) => void;
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
            <View className="h-4 w-1.5" style={{ backgroundColor: category.colour }} />
            <Text className="text-lg font-bold text-ink-primary">{category.name}</Text>
            {badge && <Text className="text-base">{badge.icon}</Text>}
          </View>
          <Text className="text-sm font-semibold text-ink-muted">
            {acquired} / {questions.length}
          </Text>
        </View>
        <View className="mt-2 h-1.5 overflow-hidden bg-bg-overlay">
          <View className="h-full" style={{ width: `${pct}%`, backgroundColor: category.colour }} />
        </View>
      </View>

      {tileSize > 0 && (
        <View className="flex-row flex-wrap" style={{ gap: GUTTER }}>
          {questions.map((q) => (
            <ArtefactTile
              key={q.id}
              question={q}
              acquired={collection[q.id] !== undefined}
              size={tileSize}
              onZoom={onZoom}
            />
          ))}
        </View>
      )}
    </View>
  );
}

/**
 * The player's museum: every question is an artefact slot, earned by guessing
 * within its difficulty's threshold. Wings map
 * to categories; filling a wing earns its mastery badge.
 */
export function MuseumScreen() {
  const { state } = useProgression();
  const { width: windowWidth } = useWindowDimensions();
  // Shelf width is measured from the content column; until the first layout
  // lands, fall back to the window width minus the horizontal padding.
  const [shelfWidth, setShelfWidth] = useState(windowWidth - 40);
  const [zoomed, setZoomed] = useState<Zoomed | null>(null);

  const tileSize = Math.floor((shelfWidth - GUTTER * (COLUMNS - 1)) / COLUMNS);

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

  const onShelfLayout = (e: LayoutChangeEvent) => {
    const w = Math.floor(e.nativeEvent.layout.width);
    if (w > 0 && w !== shelfWidth) setShelfWidth(w);
  };

  return (
    <Screen>
      <ScrollView
        contentContainerClassName="px-5 pt-6 pb-10 gap-6"
        showsVerticalScrollIndicator={false}
      >
        <View onLayout={onShelfLayout}>
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
            tileSize={tileSize}
            onZoom={setZoomed}
          />
        ))}
      </ScrollView>

      <ImageLightbox
        visible={zoomed !== null}
        source={zoomed?.source}
        title={zoomed?.title}
        onClose={() => setZoomed(null)}
      />
    </Screen>
  );
}
