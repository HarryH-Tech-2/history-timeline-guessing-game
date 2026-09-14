import { memo, useCallback, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  SectionList,
  Text,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
  type LayoutChangeEvent,
  type SectionListData,
  type SectionListRenderItemInfo,
} from 'react-native';

import { ImageLightbox, Screen } from '@/components/ui';
import { getCategories, getQuestionsByCategory, imageForQuestion } from '@/data';
import { MASTERY_BADGES, masteryTier, type Category, type Question } from '@/domain';
import { useProgression } from '@/features/progression';
import { formatYear } from '@/features/timeline/math';

/** Artefact grid: fixed column count with a fixed gutter, sized from the
 * measured shelf width so every tile is an exact square (flex-1 + aspect
 * ratio inside a wrapping row does not lay out reliably on Android). */
const COLUMNS = 3;
const GUTTER = 8;
/** Height reserved under every tile for a two-line caption plus the event's
 * year, so rows align. */
const CAPTION_HEIGHT = 52;
/** Vertical gap between shelves (rows of tiles) and between wings. */
const ROW_GAP = GUTTER;
const WING_GAP = 24;

interface Zoomed {
  source: ImageSourcePropType;
  title: string;
}

/** Title and year beneath an acquired artefact. The year only ever shows on
 * acquired tiles, so undiscovered ones stay spoiler-free. */
function Caption({ question }: { question: Question }) {
  return (
    <View style={{ height: CAPTION_HEIGHT }} className="justify-center">
      <Text
        numberOfLines={2}
        className="text-center text-xs font-medium leading-4 text-ink-primary"
      >
        {question.title}
      </Text>
      <Text
        className="text-center text-[11px] font-semibold text-ink-muted"
        testID={`artefact-year-${question.id}`}
      >
        {formatYear(question.year)}
      </Text>
    </View>
  );
}

/**
 * One artefact slot. Acquired shows the question's illustration (opened
 * full-screen on tap) with its title and date; acquired-but-unillustrated
 * shows a plain exhibit tile; unacquired stays a mystery tile so the wing
 * reads as a collection to finish.
 */
const ArtefactTile = memo(function ArtefactTile({
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

  if (!acquired) {
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

  if (!image) {
    // Acquired, but no illustration has been generated for this question yet:
    // a plain exhibit tile so the artefact still reads as collected.
    return (
      <View testID={`artefact-${question.id}`} style={{ width: size }}>
        <View
          style={{ width: size, height: size }}
          className="items-center justify-center border border-hair bg-bg-overlay"
        >
          <Text className="text-2xl" style={{ includeFontPadding: false }}>
            🏺
          </Text>
        </View>
        <Caption question={question} />
      </View>
    );
  }

  return (
    <Pressable
      testID={`artefact-${question.id}`}
      onPress={() => onZoom({ source: image, title: question.title })}
      accessibilityRole="imagebutton"
      accessibilityLabel={`${question.title}, ${formatYear(question.year)}`}
      style={{ width: size }}
    >
      <Image
        source={image}
        resizeMode="cover"
        // Decode at the tile's size rather than the asset's: ~200 full-size
        // bitmaps is what made the shelves stutter.
        resizeMethod="resize"
        accessibilityIgnoresInvertColors
        style={{ width: size, height: size }}
        className="bg-bg-overlay"
      />
      <Caption question={question} />
    </Pressable>
  );
});

/** A shelf: one row of up to COLUMNS tiles, the unit the list virtualises. */
interface Shelf {
  key: string;
  questions: readonly Question[];
}

interface WingSection {
  key: string;
  category: Category;
  total: number;
  acquired: number;
  data: Shelf[];
}

function chunk(questions: readonly Question[], size: number): Shelf[] {
  const shelves: Shelf[] = [];
  for (let i = 0; i < questions.length; i += size) {
    const slice = questions.slice(i, i + size);
    shelves.push({ key: slice[0]!.id, questions: slice });
  }
  return shelves;
}

/** A wing's header: name, mastery badge and the collection progress bar. */
function WingHeader({ section }: { section: WingSection }) {
  const { category, total, acquired } = section;
  const tier = masteryTier(acquired, total);
  const badge = tier ? MASTERY_BADGES[tier] : null;
  const pct = total === 0 ? 0 : Math.round((acquired / total) * 100);

  return (
    <View style={{ paddingBottom: ROW_GAP + 4 }} testID={`wing-${category.id}`}>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View className="h-4 w-1.5" style={{ backgroundColor: category.colour }} />
          <Text className="text-lg font-bold text-ink-primary">{category.name}</Text>
          {badge && <Text className="text-base">{badge.icon}</Text>}
        </View>
        <Text className="text-sm font-semibold text-ink-muted">
          {acquired} / {total}
        </Text>
      </View>
      <View className="mt-2 h-1.5 overflow-hidden bg-bg-overlay">
        <View className="h-full" style={{ width: `${pct}%`, backgroundColor: category.colour }} />
      </View>
    </View>
  );
}

/**
 * The player's museum: every question is an artefact slot, earned by guessing
 * by naming its exact year. Wings map to categories;
 * filling a wing earns its mastery badge.
 */
export function MuseumScreen() {
  const { state } = useProgression();
  const { width: windowWidth } = useWindowDimensions();
  // Shelf width is measured from the content column; until the first layout
  // lands, fall back to the window width minus the horizontal padding.
  const [shelfWidth, setShelfWidth] = useState(windowWidth - 40);
  const [zoomed, setZoomed] = useState<Zoomed | null>(null);

  const tileSize = Math.floor((shelfWidth - GUTTER * (COLUMNS - 1)) / COLUMNS);
  const collection = state.collection;

  // Rows of tiles are the list items, so scrolling only ever mounts the
  // shelves near the viewport instead of every artefact image at once.
  const sections = useMemo<WingSection[]>(
    () =>
      getCategories()
        .filter((c) => c.active)
        .map((category) => {
          const questions = getQuestionsByCategory(category.id);
          return {
            key: category.id,
            category,
            total: questions.length,
            acquired: questions.filter((q) => collection[q.id] !== undefined).length,
            data: chunk(questions, COLUMNS),
          };
        }),
    [collection],
  );
  const total = sections.reduce((n, s) => n + s.total, 0);
  const acquired = sections.reduce((n, s) => n + s.acquired, 0);

  const onShelfLayout = (e: LayoutChangeEvent) => {
    const w = Math.floor(e.nativeEvent.layout.width);
    if (w > 0 && w !== shelfWidth) setShelfWidth(w);
  };

  const renderShelf = useCallback(
    ({ item }: SectionListRenderItemInfo<Shelf, WingSection>) => (
      <View className="flex-row" style={{ gap: GUTTER, paddingBottom: ROW_GAP }}>
        {item.questions.map((q) => (
          <ArtefactTile
            key={q.id}
            question={q}
            acquired={collection[q.id] !== undefined}
            size={tileSize}
            onZoom={setZoomed}
          />
        ))}
      </View>
    ),
    [collection, tileSize],
  );

  const renderHeader = useCallback(
    ({ section }: { section: SectionListData<Shelf, WingSection> }) => (
      <WingHeader section={section} />
    ),
    [],
  );

  return (
    <Screen>
      <SectionList
        sections={tileSize > 0 ? sections : []}
        keyExtractor={(shelf) => shelf.key}
        renderItem={renderShelf}
        renderSectionHeader={renderHeader}
        renderSectionFooter={() => <View style={{ height: WING_GAP - ROW_GAP }} />}
        ListHeaderComponent={
          <View onLayout={onShelfLayout} style={{ paddingBottom: WING_GAP }}>
            <Text className="text-3xl font-extrabold text-ink-primary">Museum</Text>
            <Text className="text-base text-ink-secondary">
              Guess close to the real year to add an artefact to your collection.
            </Text>
            <Text className="mt-1 text-sm font-semibold text-accent">
              {acquired} of {total} artefacts collected
            </Text>
          </View>
        }
        contentContainerClassName="px-5 pt-6 pb-10"
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        // Mount a screen or so ahead and behind; anything further is clipped
        // and its image released.
        initialNumToRender={8}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews
      />

      <ImageLightbox
        visible={zoomed !== null}
        source={zoomed?.source}
        title={zoomed?.title}
        onClose={() => setZoomed(null)}
      />
    </Screen>
  );
}
