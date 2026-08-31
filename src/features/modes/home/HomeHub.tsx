import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Screen } from '@/components/ui';
import { getCategories, getTopicOfTheDay, isTopicAvailable, TOPIC_RUN_SIZE } from '@/data';
import type { Category } from '@/domain';
import { usePremium } from '@/features/premium';
import { ProfileHeader } from '@/features/progression';
import { useTheme } from '@/theme';
import { dateKey } from '@/utils/date';

interface ModeCardData {
  key: string;
  title: string;
  description: string;
  icon: string;
  route: Href;
  /** Behind the paywall: free players see a lock and land on the paywall. */
  premiumOnly?: boolean;
}

const MODES: readonly ModeCardData[] = [
  {
    key: 'daily',
    title: 'Daily',
    description: 'Eight fresh questions. One shot a day.',
    icon: '📅',
    route: '/daily',
  },
  {
    key: 'survival',
    title: 'Survival',
    description: 'Three lives. How far can you get?',
    icon: '❤️',
    route: '/survival',
  },
  {
    key: 'campaign',
    title: 'Campaign',
    description: 'Work through worlds and earn stars.',
    icon: '🗺️',
    route: '/campaign',
  },
  // Premium mode last, mirroring the premium categories at the end of their list.
  {
    key: 'endless',
    title: 'Endless',
    description: 'Ten lives. Chase a high score.',
    icon: '♾️',
    route: '/endless',
    premiumOnly: true,
  },
];

/** Glyph for each category's `icon` key (the seed data names them abstractly). */
const CATEGORY_ICONS: Record<string, string> = {
  flag: '📜',
  swords: '⚔️',
  person: '👤',
  cpu: '⚙️',
  palette: '🎨',
  owl: '🦉',
  globe: '🌍',
  compass: '🧭',
};

export function categoryIcon(icon: string): string {
  return CATEGORY_ICONS[icon] ?? '🏛️';
}

/** Square icon plaque used to mark modes and categories. */
function IconPlaque({ glyph, size = 'lg' }: { glyph: string; size?: 'lg' | 'md' }) {
  const box = size === 'lg' ? 'h-12 w-12' : 'h-10 w-10';
  const text = size === 'lg' ? 'text-2xl' : 'text-xl';
  return (
    <View className={`${box} items-center justify-center border border-hair bg-bg-overlay`}>
      <Text className={text} style={{ includeFontPadding: false, textAlignVertical: 'center' }}>
        {glyph}
      </Text>
    </View>
  );
}

/** Today's featured topic: a short themed run, the same for everyone. */
function TopicOfTheDayCard({
  locked,
  onPress,
}: {
  /** Today's topic lives in premium categories and the player isn't subscribed. */
  locked: boolean;
  onPress: () => void;
}) {
  const topic = getTopicOfTheDay(dateKey());
  return (
    <Animated.View entering={FadeInUp.springify().damping(18)}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Topic of the day: ${topic.name}${locked ? ', Premium' : ''}`}
        testID="topic-of-the-day"
        className="flex-row items-center gap-4 overflow-hidden border border-accent bg-accent/10 p-4"
      >
        <IconPlaque glyph={locked ? '🔒' : topic.icon} />
        <View className="flex-1">
          <Text className="text-xs font-semibold uppercase tracking-wide text-accent">
            Topic of the day{locked ? ' · Premium' : ''}
          </Text>
          <Text className="text-lg font-bold text-ink-primary">{topic.name}</Text>
          <Text numberOfLines={1} className="text-sm text-ink-secondary">
            {locked ? 'Subscribe to play today’s topic' : `${TOPIC_RUN_SIZE} questions · ${topic.blurb}`}
          </Text>
        </View>
        <Text className="text-xl text-ink-muted">›</Text>
      </Pressable>
    </Animated.View>
  );
}

function ModeCard({
  mode,
  index,
  locked,
  onPress,
}: {
  mode: ModeCardData;
  index: number;
  /** Premium-only and the player isn't subscribed: shows a lock, opens the paywall. */
  locked: boolean;
  onPress: () => void;
}) {
  return (
    <Animated.View entering={FadeInUp.delay(index * 60).springify().damping(18)}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={locked ? `${mode.title}, Premium mode` : mode.title}
        testID={`mode-${mode.key}`}
        className="flex-row items-center gap-4 overflow-hidden border border-hair bg-bg-raised p-4"
      >
        <IconPlaque glyph={locked ? '🔒' : mode.icon} />
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-lg font-bold text-ink-primary">{mode.title}</Text>
            {locked && (
              <Text className="text-[11px] font-bold uppercase tracking-wide text-accent">
                Premium
              </Text>
            )}
          </View>
          <Text className="text-sm text-ink-secondary">{mode.description}</Text>
        </View>
        <Text className="text-xl text-ink-muted">›</Text>
      </Pressable>
    </Animated.View>
  );
}

/** A compact two-per-row tile that starts a single-topic practice run. */
function CategoryCard({
  category,
  index,
  locked,
  onPress,
}: {
  category: Category;
  index: number;
  /** Premium-only and the player isn't subscribed: shows a lock, opens the paywall. */
  locked: boolean;
  onPress: () => void;
}) {
  return (
    <Animated.View
      entering={FadeInUp.delay((MODES.length + index) * 60).springify().damping(18)}
      className="min-w-[45%] flex-1"
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={
          locked ? `${category.name}, Premium category` : `Play ${category.name} questions`
        }
        testID={`category-${category.id}`}
        className="gap-2 overflow-hidden border border-hair bg-bg-raised p-4"
      >
        <View className="flex-row items-center gap-2.5">
          <IconPlaque glyph={locked ? '🔒' : categoryIcon(category.icon)} size="md" />
          <Text numberOfLines={2} className="flex-1 text-base font-bold leading-tight text-ink-primary">
            {category.name}
          </Text>
        </View>
        {locked && (
          <Text className="text-[11px] font-bold uppercase tracking-wide text-accent">Premium</Text>
        )}
        <Text numberOfLines={2} className="text-xs text-ink-secondary">
          {category.description}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

/** The landing hub: pick a mode. Each card routes into that mode's flow. */
export function HomeHub() {
  const router = useRouter();
  const { mode, toggle } = useTheme();
  const { isPremium } = usePremium();

  return (
    <Screen>
      <ScrollView
        contentContainerClassName="px-5 pt-6 pb-10 gap-4"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-2 flex-row items-start justify-between">
          <View className="flex-1 justify-center pr-3">
            <Text className="text-3xl font-extrabold text-ink-primary">History Date Guesser</Text>
          </View>
          <Pressable
            onPress={toggle}
            accessibilityRole="button"
            accessibilityLabel={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            hitSlop={10}
            testID="theme-toggle"
            className="h-10 w-10 items-center justify-center border border-hair bg-bg-raised"
          >
            <Text className="text-lg">{mode === 'dark' ? '☀️' : '🌙'}</Text>
          </Pressable>
        </View>

        <ProfileHeader />

        <TopicOfTheDayCard
          locked={!isTopicAvailable(getTopicOfTheDay(dateKey()))}
          onPress={() =>
            router.push(isTopicAvailable(getTopicOfTheDay(dateKey())) ? '/topic' : '/paywall')
          }
        />

        <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Game modes
        </Text>
        {MODES.map((mode, index) => {
          const locked = mode.premiumOnly === true && !isPremium;
          return (
            <ModeCard
              key={mode.key}
              mode={mode}
              index={index}
              locked={locked}
              onPress={() => router.push(locked ? '/paywall' : mode.route)}
            />
          );
        })}

        <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Categories
        </Text>
        <View className="flex-row flex-wrap gap-3">
          {getCategories()
            .filter((c) => c.active)
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((category, index) => {
              const locked = category.premiumOnly && !isPremium;
              return (
                <CategoryCard
                  key={category.id}
                  category={category}
                  index={index}
                  locked={locked}
                  onPress={() =>
                    router.push(locked ? '/paywall' : `/category/${category.id}`)
                  }
                />
              );
            })}
        </View>
      </ScrollView>
    </Screen>
  );
}
