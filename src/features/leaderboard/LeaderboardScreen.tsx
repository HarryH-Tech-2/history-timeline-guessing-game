import { useCallback, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ImageBackground,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { Screen } from '@/components/ui';
import { isFirebaseConfigured } from '@/config/env';
import { useAuth } from '@/services/firebase/auth';
import { useThemeColors } from '@/theme';

import { fetchTop } from './service';
import type { LeaderboardEntry } from './types';

/**
 * Medal metals for the podium. Fixed (not theme tokens) because gold stays
 * gold in the dark — each is used at low alpha over theme surfaces so it
 * reads on parchment and ink alike.
 */
/**
 * Museum-motif backdrop (sparse artefacts top and bottom, empty middle),
 * washed with the theme surface so content stays readable in light and dark.
 */
function Backdrop({ children }: { children: ReactNode }) {
  return (
    <ImageBackground
      source={require('../../../assets/leaderboard-bg.jpg')}
      resizeMode="cover"
      className="flex-1"
    >
      <View className="absolute inset-0 bg-bg-base/60" />
      {children}
    </ImageBackground>
  );
}

type Place = 1 | 2 | 3;

const METALS: Record<Place, { tint: string; label: string }> = {
  1: { tint: '#D9A93D', label: 'Champion' }, // gold
  2: { tint: '#98A4B5', label: 'Runner-up' }, // silver
  3: { tint: '#C07E4E', label: 'Third' }, // bronze
};

const PODIUM_HEIGHTS: Record<Place, number> = { 1: 112, 2: 84, 3: 64 };

function initialOf(name: string): string {
  return (name.trim()[0] ?? '?').toUpperCase();
}

function PodiumColumn({
  entry,
  place,
  isMe,
}: {
  entry: LeaderboardEntry;
  place: Place;
  isMe: boolean;
}) {
  const metal = METALS[place];
  const height = PODIUM_HEIGHTS[place];

  return (
    <Animated.View
      entering={FadeInDown.delay(place * 120).springify().damping(16)}
      className="flex-1 items-center justify-end gap-2"
      testID={`leaderboard-row-${place}`}
    >
      {place === 1 && <Text className="text-2xl">👑</Text>}

      {/* Initial medallion with a metal ring */}
      <View
        className="h-14 w-14 items-center justify-center rounded-full border-2 bg-bg-raised"
        style={{ borderColor: metal.tint }}
      >
        <Text className="text-xl font-extrabold" style={{ color: metal.tint }}>
          {initialOf(entry.displayName)}
        </Text>
      </View>

      <View className="items-center">
        <Text
          numberOfLines={1}
          className={`max-w-[110px] text-center text-sm font-bold ${
            isMe ? 'text-accent' : 'text-ink-primary'
          }`}
        >
          {entry.displayName}
          {isMe ? ' (You)' : ''}
        </Text>
        <Text className="text-xs font-semibold" style={{ color: metal.tint }}>
          {entry.xp.toLocaleString()} XP
        </Text>
      </View>

      {/* The plinth: stepped height, metal-tinted, numbered */}
      <View
        className="w-full items-center justify-start rounded-t-xl border-t-2 pt-2"
        style={{ height, borderTopColor: metal.tint, backgroundColor: `${metal.tint}26` }}
      >
        <Text className="text-2xl font-extrabold" style={{ color: metal.tint }}>
          {place}
        </Text>
        <Text className="text-[10px] font-medium uppercase tracking-widest text-ink-muted">
          {metal.label}
        </Text>
      </View>
    </Animated.View>
  );
}

/** Top-3 podium, arranged 2 · 1 · 3 so the champion towers in the middle. */
function Podium({ entries, myUid }: { entries: readonly LeaderboardEntry[]; myUid?: string }) {
  const [first, second, third] = entries;
  if (!first || !second || !third) return null;
  return (
    <View className="mb-5 flex-row items-end gap-3 px-1">
      <PodiumColumn entry={second} place={2} isMe={second.uid === myUid} />
      <PodiumColumn entry={first} place={1} isMe={first.uid === myUid} />
      <PodiumColumn entry={third} place={3} isMe={third.uid === myUid} />
    </View>
  );
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
            ? 'flex-row items-center gap-3 rounded-2xl border border-accent bg-accent/10 px-4 py-3'
            : 'flex-row items-center gap-3 rounded-2xl border border-hair bg-bg-raised px-4 py-3'
        }
      >
        <Text
          className="w-7 text-center text-sm font-bold text-ink-muted"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {rank}
        </Text>
        <View className="h-9 w-9 items-center justify-center rounded-full bg-bg-overlay">
          <Text className="text-sm font-bold text-ink-secondary">
            {initialOf(entry.displayName)}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-ink-primary" numberOfLines={1}>
            {entry.displayName}
            {isMe ? ' (You)' : ''}
          </Text>
          <Text className="text-xs text-ink-muted">Level {entry.level}</Text>
        </View>
        <Text
          className="text-sm font-bold text-accent"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {entry.xp.toLocaleString()} XP
        </Text>
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

  // With three or more players the top of the table becomes the podium and
  // the list picks up at rank 4; below that, everyone stays in plain rows.
  const hasPodium = entries.length >= 3;
  const listEntries = hasPodium ? entries.slice(3) : entries;
  const rankOffset = hasPodium ? 4 : 1;

  const header = (
    <View className="mb-5 items-center">
      <Text className="text-center text-xs font-semibold uppercase tracking-widest text-ink-muted">
        Global · Top 50
      </Text>
      <Text className="text-center text-3xl font-extrabold text-ink-primary">Leaderboard</Text>
      <Text className="mb-5 text-center text-base text-ink-secondary">
        Top history buffs by XP
      </Text>
      {hasPodium && <Podium entries={entries} myUid={uid ?? undefined} />}
    </View>
  );

  if (!isFirebaseConfigured) {
    return (
      <Screen>
        <Backdrop>
          <View className="flex-1 items-center justify-center px-5">
            <Text className="mb-2 text-center text-3xl font-extrabold text-ink-primary">
              Leaderboard
            </Text>
            <Text className="text-center text-base text-ink-secondary">
              Leaderboards need a connection and aren't available in this build. Your progress
              is saved on this device.
            </Text>
          </View>
        </Backdrop>
      </Screen>
    );
  }

  return (
    <Screen>
      <Backdrop>
        <FlatList
          data={listEntries}
          keyExtractor={(item) => item.uid}
          contentContainerClassName="px-5 pt-6 pb-10 gap-2.5"
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
            <Row
              entry={item}
              rank={index + rankOffset}
              isMe={item.uid === uid}
              index={index}
            />
          )}
          ListEmptyComponent={
            loading ? (
              <View className="items-center py-16">
                <ActivityIndicator color={colors.accent.default} />
              </View>
            ) : hasPodium ? null : (
              <Text className="py-16 text-center text-base text-ink-secondary">
                No scores yet — play a round to claim the top spot!
              </Text>
            )
          }
        />
      </Backdrop>
    </Screen>
  );
}
