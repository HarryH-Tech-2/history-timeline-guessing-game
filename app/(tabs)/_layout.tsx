import { Text } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSocialBadge } from '@/features/social/useSocialBadge';
import { useTheme } from '@/theme';

/** Emoji tab glyph; dims when the tab is inactive. */
function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>;
}

/** Bottom navigation: Play, Campaign, Museum, Social, Profile. */
export default function TabsLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const socialBadge = useSocialBadge();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent.default,
        tabBarInactiveTintColor: colors.ink.muted,
        tabBarStyle: {
          backgroundColor: colors.bg.raised,
          borderTopColor: colors.hair,
          // Extra bottom padding keeps the buttons clear of the system nav bar.
          height: 56 + insets.bottom + 10,
          paddingBottom: insets.bottom + 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Play',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🎯" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="campaign"
        options={{
          title: 'Campaign',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🗺️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="museum"
        options={{
          title: 'Museum',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏛️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          title: 'Social',
          tabBarIcon: ({ focused }) => <TabIcon emoji="👥" focused={focused} />,
          // Empty string renders a plain dot: a challenge has results not yet opened.
          tabBarBadge: socialBadge ? '' : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.accent.default,
            minWidth: 10,
            height: 10,
            borderRadius: 5,
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
