import { Text, View } from 'react-native';

/** Square icon plaque used to mark modes and categories. */
export function IconPlaque({ glyph, size = 'lg' }: { glyph: string; size?: 'lg' | 'md' }) {
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
