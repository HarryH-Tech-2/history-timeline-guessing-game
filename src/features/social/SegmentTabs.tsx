import { Pressable, Text, View } from 'react-native';

export function SegmentTabs<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <View className="flex-row border border-hair bg-bg-raised p-1" accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            testID={`segment-${o.value}`}
            className={`flex-1 items-center py-2 ${active ? 'bg-accent' : ''}`}
          >
            <Text className={`text-sm font-bold ${active ? 'text-bg-base' : 'text-ink-secondary'}`}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
