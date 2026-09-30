import { Text, View } from 'react-native';

import { palette } from '@/theme/tokens';

import type { Avatar } from '../avatars';

const SIZES = {
  md: { box: 48, emoji: 24, badge: 20, badgeText: 10 },
  lg: { box: 56, emoji: 28, badge: 22, badgeText: 11 },
} as const;

/**
 * The player's avatar in a soft accent circle, with their level in a small
 * badge on the bottom-right corner.
 */
export function AvatarBadge({
  avatar,
  level,
  size = 'lg',
}: {
  avatar: Avatar;
  level: number;
  size?: keyof typeof SIZES;
}) {
  const s = SIZES[size];
  return (
    <View style={{ width: s.box, height: s.box }} testID="avatar-badge">
      <View
        className="items-center justify-center rounded-full"
        style={{ width: s.box, height: s.box, backgroundColor: palette.accent.soft }}
      >
        <Text style={{ fontSize: s.emoji }} testID={`avatar-${avatar.id}`}>
          {avatar.emoji}
        </Text>
      </View>
      <View
        className="absolute items-center justify-center rounded-full border-2 border-bg-raised"
        style={{
          right: -4,
          bottom: -4,
          minWidth: s.badge,
          height: s.badge,
          paddingHorizontal: 3,
          backgroundColor: palette.accent.default,
        }}
      >
        <Text className="font-extrabold text-white" style={{ fontSize: s.badgeText }} testID="avatar-level">
          {level}
        </Text>
      </View>
    </View>
  );
}
