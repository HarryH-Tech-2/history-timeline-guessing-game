import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Screen } from '@/components/ui';
import { isFirebaseConfigured } from '@/config/env';
import { useAuth } from '@/services/firebase/auth';
import { useThemeColors } from '@/theme';

import { fetchTop } from './service';
import type { LeaderboardEntry } from './types';

function medalFor(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `${rank}`;
}

function Row({
  entry,
  rank,
  isMe,
  index,
}: {
  entry: LeaderboardEntry;
  rank: number;
  isMe: boolean;
  index: number;
}) {
  return (
    <Animated.View entering={FadeInUp.delay(Math.min(index, 12) * 40).springify().damping(18)}>
      <View
        testID={`leaderboard-row-${rank}`}
        className={
          isMe
            ? 'flex-row items-center gap-3 rounded-2xl border border-accent bg-accent/10 p-4'
            : 'flex-row items-center gap-3 rounded-2xl border border-hair bg-bg-raised p-4'
        }
      >
        <Text className="w-8 text-center text-base font-bold text-ink-secondary">
          {medalFor(rank)}
        </Text>
        <View className="flex-1">
          <Text className="text-base font-bold text-ink-primary" numberOfLines={1}>
            {entry.displayName}
            {isMe ? ' (You)' : ''}
          </Text>
          <Text className="text-sm text-ink-muted">Level {entry.level}</Text>
        </View>
        <Text className="text-sm font-bold text-accent">{entry.xp.toLocaleString()} XP</Text>
      </View>
    </Animated.View>
  );
}

/** Global ranking by XP. Degrades to a friendly notice offline. */
export function LeaderboardScreen() {
  const { uid } = useAuth();
  const colors = useThemeColors();
  const [entries, setEntries] = useState<readonly LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const top = await fetchTop(50);
    setEntries(top);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      void load().finally(() => {
        if (active) setLoading(false);
      });
      return () => {
        active = false;
      };
    }, [load]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load().finally(() => setRefreshing(false));
  }, [load]);

  const header = (
    <View className="mb-4">
      <Text className="text-3xl font-extrabold text-ink-primary">Leaderboard</Text>
      <Text className="text-base text-ink-secondary">Top history buffs by XP</Text>
    </View>
  );

  if (!isFirebaseConfigured) {
    return (
      <Screen>
        <View className="flex-1 justify-center px-5">
          {header}
          <Text className="text-center text-base text-ink-secondary">
            Leaderboards need a connection and aren't available in this build. Your progress is
            saved on this device.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.uid}
        contentContainerClassName="px-5 pt-6 pb-10 gap-3"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={header}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent.default}
          />
        }
        renderItem={({ item, index }) => (
          <Row entry={item} rank={index + 1} isMe={item.uid === uid} index={index} />
        )}
        ListEmptyComponent={
          loading ? (
            <View className="items-center py-16">
              <ActivityIndicator color={colors.accent.default} />
            </View>
          ) : (
            <Text className="py-16 text-center text-base text-ink-secondary">
              No scores yet — play a round to claim the top spot!
            </Text>
          )
        }
      />
    </Screen>
  );
}
