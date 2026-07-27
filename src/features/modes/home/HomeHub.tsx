import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Screen } from '@/components/ui';
import { ProfileHeader } from '@/features/progression';
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

/** The landing hub: pick a mode. Each card routes into that mode's flow. */
export function HomeHub() {
  const router = useRouter();

  return (
    <Screen>
      <ScrollView
        contentContainerClassName="px-5 pt-6 pb-10 gap-4"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-2">
          <Text className="text-3xl font-extrabold text-ink-primary">Chronos</Text>
          <Text className="text-base text-ink-secondary">When did it happen?</Text>
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
      </ScrollView>
    </Screen>
  );
}
