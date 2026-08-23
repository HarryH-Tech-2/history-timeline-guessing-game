import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Screen } from '@/components/ui';
import { getCategories } from '@/data';
import type { Category } from '@/domain';
import { ProfileHeader } from '@/features/progression';
import { useTheme } from '@/theme';
import { palette } from '@/theme/tokens';

interface ModeCardData {
  key: string;
  title: string;
  description: string;
  colour: string;
  route: Href;
}

const MODES: readonly ModeCardData[] = [
  {
    key: 'daily',
    title: 'Daily',
    description: 'Eight fresh questions. One shot a day.',
    colour: palette.accent.default,
    route: '/daily',
  },
  {
    key: 'endless',
    title: 'Endless',
    description: 'Keep guessing. Chase a high score.',
    colour: palette.success,
    route: '/endless',
  },
  {
    key: 'survival',
    title: 'Survival',
    description: 'Three lives. How far can you get?',
    colour: palette.danger,
    route: '/survival',
  },
  {
    key: 'campaign',
    title: 'Campaign',
    description: 'Work through worlds and earn stars.',
    colour: palette.warning,
    route: '/campaign',
  },
];

function ModeCard({ mode, index, onPress }: { mode: ModeCardData; index: number; onPress: () => void }) {
  return (
    <Animated.View entering={FadeInUp.delay(index * 60).springify().damping(18)}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={mode.title}
        testID={`mode-${mode.key}`}
        className="flex-row items-center gap-4 overflow-hidden rounded-2xl border border-hair bg-bg-raised p-5"
      >
        <View className="h-12 w-1.5 rounded-full" style={{ backgroundColor: mode.colour }} />
        <View className="flex-1">
          <Text className="text-lg font-bold text-ink-primary">{mode.title}</Text>
          <Text className="text-sm text-ink-secondary">{mode.description}</Text>
        </View>
        <Text className="text-xl" style={{ color: mode.colour }}>
          ›
        </Text>
      </Pressable>
    </Animated.View>
  );
}

/** A compact two-per-row tile that starts a single-topic practice run. */
function CategoryCard({
  category,
  index,
  onPress,
}: {
  category: Category;
  index: number;
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
        accessibilityLabel={`Play ${category.name} questions`}
        testID={`category-${category.id}`}
        className="gap-2 overflow-hidden rounded-2xl border border-hair bg-bg-raised p-4"
      >
        <View className="h-1.5 w-10 rounded-full" style={{ backgroundColor: category.colour }} />
        <Text className="text-base font-bold text-ink-primary">{category.name}</Text>
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

  return (
    <Screen>
      <ScrollView
        contentContainerClassName="px-5 pt-6 pb-10 gap-4"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-2 flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-3xl font-extrabold text-ink-primary">History Date Guesser</Text>
            <Text className="text-base text-ink-secondary">When did it happen?</Text>
          </View>
          <Pressable
            onPress={toggle}
            accessibilityRole="button"
            accessibilityLabel={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            hitSlop={10}
            testID="theme-toggle"
            className="h-10 w-10 items-center justify-center rounded-full border border-hair bg-bg-raised"
          >
            <Text className="text-lg">{mode === 'dark' ? '☀️' : '🌙'}</Text>
          </Pressable>
        </View>

        <ProfileHeader />

        {MODES.map((mode, index) => (
          <ModeCard
            key={mode.key}
            mode={mode}
            index={index}
            onPress={() => router.push(mode.route)}
          />
        ))}

        <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Categories
        </Text>
        <View className="flex-row flex-wrap gap-3">
          {getCategories()
            .filter((c) => c.active)
            .map((category, index) => (
              <CategoryCard
                key={category.id}
                category={category}
                index={index}
                onPress={() => router.push(`/category/${category.id}`)}
              />
            ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
