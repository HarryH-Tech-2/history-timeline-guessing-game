import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { BackButton, Screen } from '@/components/ui';
import { getRegionalQuestions, REGIONS, type Region } from '@/data';

import { IconPlaque } from '../home/IconPlaque';

interface RegionPickerProps {
  onPick: (regionId: string) => void;
  onBack: () => void;
}

/**
 * The first step of a Regional run: choose which part of the world to play.
 * Regions with no questions (possible after a thin remote hydration) are
 * still listed but disabled, so the layout never shifts.
 */
export function RegionPicker({ onPick, onBack }: RegionPickerProps) {
  return (
    <Screen>
      <ScrollView
        contentContainerClassName="px-5 pt-6 pb-10 gap-3"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center gap-3">
          <BackButton onPress={onBack} />
          <Text className="text-3xl font-extrabold text-ink-primary">Regional</Text>
        </View>
        <Text className="mb-2 text-base text-ink-secondary">
          Pick a region and place its defining moments on the timeline.
        </Text>
        {REGIONS.map((region, index) => (
          <RegionRow
            key={region.id}
            region={region}
            index={index}
            count={getRegionalQuestions(region.id).length}
            onPress={() => onPick(region.id)}
          />
        ))}
      </ScrollView>
    </Screen>
  );
}

function RegionRow({
  region,
  index,
  count,
  onPress,
}: {
  region: Region;
  index: number;
  count: number;
  onPress: () => void;
}) {
  const disabled = count === 0;
  return (
    <Animated.View entering={FadeInUp.delay(index * 60).springify().damping(18)}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        accessibilityLabel={`Play ${region.name}, ${count} questions`}
        testID={`region-${region.id}`}
        className={`flex-row items-center gap-4 overflow-hidden border border-hair bg-bg-raised p-4 ${
          disabled ? 'opacity-50' : ''
        }`}
      >
        <IconPlaque glyph={region.icon} />
        <View className="flex-1">
          <Text className="text-lg font-bold text-ink-primary">{region.name}</Text>
          <Text numberOfLines={1} className="text-sm text-ink-secondary">
            {region.blurb}
          </Text>
          <Text className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {count} questions
          </Text>
        </View>
        <Text className="text-xl text-ink-muted">›</Text>
      </Pressable>
    </Animated.View>
  );
}
