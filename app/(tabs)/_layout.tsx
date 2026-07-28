import { Text } from 'react-native';
import { Tabs } from 'expo-router';

import { useTheme } from '@/theme';

/** Emoji tab glyph; dims when the tab is inactive. */
function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>;
}

/** Bottom navigation: Play, Leaderboard, Achievements. */
export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent.default,
        tabBarInactiveTintColor: colors.ink.muted,
        tabBarStyle: {
          backgroundColor: colors.bg.raised,
          borderTopColor: colors.hair,
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
        name="leaderboard"
        options={{
          title: 'Leaderboard',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏆" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="achievements"
        options={{
          title: 'Achievements',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🎖️" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
