import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ImageBackground,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { Screen } from '@/components/ui';
import { isFirebaseConfigured } from '@/config/env';
import { levelForXp, titleForLevel } from '@/domain';
import { PlayerNameSheet } from '@/features/progression/components/PlayerNameSheet';
import { useProgression } from '@/features/progression';
import { useAuth } from '@/services/firebase/auth';
import { useThemeColors } from '@/theme';
import { palette } from '@/theme/tokens';
import { dateKey, weekKey } from '@/utils/date';

import {
  BOARD_BLURB,
  BOARD_LABEL,
  BOARDS,
  boardValue,
  formatBoardValue,
  movementFor,
  myBoardValue,
  ranksOf,
  type Board,
  type BoardContext,
} from './boards';
import { leaderboardViewStore } from './leaderboardView';
import { resolveDisplayName } from './playerName';
import { fetchRank, fetchTop } from './service';
import type { LeaderboardEntry } from './types';

/**
 * Museum-motif backdrop (sparse artefacts top and bottom, empty middle),
 * washed with the theme surface so content stays readable in light and dark.
 */
function Backdrop({ children }: { children: ReactNode }) {
  return (
    <ImageBackground
      source={require('../../../assets/leaderboard-bg.webp')}
      resizeMode="cover"
      className="flex-1"
    >
      <View className="absolute inset-0 bg-bg-base/85" />
      {children}
    </ImageBackground>
  );
}

type Place = 1 | 2 | 3;

/**
 * Medal metals for the podium. Fixed (not theme tokens) because gold stays
 * gold in the dark — each is used at low alpha over theme surfaces so it
 * reads on parchment and ink alike.
 */
const METALS: Record<Place, { tint: string; label: string }> = {
  1: { tint: '#D9A93D', label: 'Champion' }, // gold
  2: { tint: '#98A4B5', label: 'Runner-up' }, // silver
  3: { tint: '#C07E4E', label: 'Third' }, // bronze
};

const PODIUM_HEIGHTS: Record<Place, number> = { 1: 112, 2: 84, 3: 64 };

/** Ink dark enough to read on the accent-filled "You" chip. */
const INK_ON_ACCENT = '#1D1712';

function initialOf(name: string): string {
  return (name.trim()[0] ?? '?').toUpperCase();
}

/** "Historian · L13": the era title for a level, with the number kept small. */
function rankLine(xp: number): string {
  const level = levelForXp(xp);
  return `${titleForLevel(level)} · L${level}`;
}

/** Solid accent tag marking the player's own entry, so it can't be missed. */
function YouChip() {
  return (
    <View className="bg-accent px-1.5 py-0.5" testID="leaderboard-you-chip">
      <Text
        className="text-[10px] font-extrabold uppercase tracking-wide"
        style={{ color: INK_ON_ACCENT, includeFontPadding: false }}
      >
        You
      </Text>
    </View>
  );
}

/** ▲2 / ▼1 since the last visit. Nothing for new rows or no change. */
function Movement({ places }: { places: number | null }) {
  if (places === null || places === 0) return null;
  const up = places > 0;
  return (
    <Text
      className="text-xs font-bold"
      style={{ color: up ? palette.success : palette.danger, includeFontPadding: false }}
      accessibilityLabel={up ? `Up ${places} places` : `Down ${-places} places`}
      testID={up ? 'leaderboard-moved-up' : 'leaderboard-moved-down'}
    >
      {up ? '▲' : '▼'}
      {Math.abs(places)}
    </Text>
  );
}

function PodiumColumn({
  entry,
  place,
  isMe,
  value,
  movement,
}: {
  entry: LeaderboardEntry;
  place: Place;
  isMe: boolean;
  value: string;
  movement: number | null;
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

      <View className="items-center gap-0.5">
        {isMe && <YouChip />}
        <View className="flex-row items-center gap-1">
          <Text
            numberOfLines={1}
            className={`max-w-[110px] text-center text-base font-bold ${
              isMe ? 'text-accent' : 'text-ink-primary'
            }`}
          >
            {entry.displayName}
          </Text>
          <Movement places={movement} />
        </View>
        <Text className="text-sm font-semibold" style={{ color: metal.tint }}>
          {value}
        </Text>
      </View>

      {/* The plinth: stepped height, metal-tinted, numbered */}
      <View
        className="w-full items-center justify-start border-t-2 pt-2"
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
function Podium({
  entries,
  myUid,
  board,
  ctx,
  previousRanks,
}: {
  entries: readonly LeaderboardEntry[];
  myUid?: string;
  board: Board;
  ctx: BoardContext;
  previousRanks: Record<string, number>;
}) {
  const [first, second, third] = entries;
  if (!first || !second || !third) return null;
  const column = (entry: LeaderboardEntry, place: Place) => (
    <PodiumColumn
      entry={entry}
      place={place}
      isMe={entry.uid === myUid}
      value={formatBoardValue(boardValue(entry, board, ctx) ?? 0, board)}
      movement={movementFor(previousRanks, entry.uid, place)}
    />
  );
  return (
    <View className="mb-5 flex-row items-end gap-3 px-1">
      {column(second, 2)}
      {column(first, 1)}
      {column(third, 3)}
    </View>
  );
}

function Row({
  entry,
  rank,
  isMe,
  index,
  value,
  movement,
}: {
  entry: LeaderboardEntry;
  rank: number;
  isMe: boolean;
  index: number;
  value: string;
  movement: number | null;
}) {
  return (
    <Animated.View entering={FadeInUp.delay(Math.min(index, 12) * 40).springify().damping(18)}>
      <View
        testID={`leaderboard-row-${rank}`}
        className={
          isMe
            ? 'flex-row items-center gap-3 border-2 border-accent bg-accent/20 px-4 py-3'
            : 'flex-row items-center gap-3 border border-hair bg-bg-raised px-4 py-3'
        }
      >
        <View className="w-9 items-center">
          <Text
            className={`text-center text-sm font-bold ${isMe ? 'text-accent' : 'text-ink-muted'}`}
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {rank}
          </Text>
          <Movement places={movement} />
        </View>
        <View
          className={`h-9 w-9 items-center justify-center rounded-full ${
            isMe ? 'border-2 border-accent bg-accent/20' : 'bg-bg-overlay'
          }`}
        >
          <Text className={`text-sm font-bold ${isMe ? 'text-accent' : 'text-ink-secondary'}`}>
            {initialOf(entry.displayName)}
          </Text>
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text
              className={`shrink text-base font-bold ${isMe ? 'text-accent' : 'text-ink-primary'}`}
              numberOfLines={1}
            >
              {entry.displayName}
            </Text>
            {isMe && <YouChip />}
          </View>
          <Text className="text-sm text-ink-muted">{rankLine(entry.xp)}</Text>
        </View>
        <Text
          className="text-base font-bold text-accent"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {value}
        </Text>
      </View>
    </Animated.View>
  );
}

/** Today · This week · All time, underlined on the active one. */
function BoardTabs({ board, onChange }: { board: Board; onChange: (b: Board) => void }) {
  return (
    <View className="mb-4 flex-row border-b border-hair" accessibilityRole="tablist">
      {BOARDS.map((b) => {
        const active = b === board;
        return (
          <Pressable
            key={b}
            onPress={() => onChange(b)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            testID={`leaderboard-tab-${b}`}
            className={`flex-1 items-center border-b-2 pb-2 pt-1 ${
              active ? 'border-accent' : 'border-transparent'
            }`}
          >
            <Text
              className={`text-sm font-bold ${active ? 'text-accent' : 'text-ink-muted'}`}
            >
              {BOARD_LABEL[b]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * The player's own standing, pinned under the list when they're not in the
 * top 50 — the board should never make you feel you don't exist on it.
 */
function PinnedRank({
  rank,
  name,
  value,
  movement,
}: {
  rank: number;
  name: string;
  value: string;
  movement: number | null;
}) {
  return (
    <View
      className="flex-row items-center gap-3 border-t-2 border-accent bg-bg-raised px-5 py-3"
      testID="leaderboard-pinned-rank"
    >
      <View className="w-9 items-center">
        <Text className="text-sm font-bold text-accent" style={{ fontVariant: ['tabular-nums'] }}>
          #{rank.toLocaleString()}
        </Text>
        <Movement places={movement} />
      </View>
      <View className="flex-1 flex-row items-center gap-2">
        <Text className="shrink text-base font-bold text-accent" numberOfLines={1}>
          {name}
        </Text>
        <YouChip />
      </View>
      <Text className="text-base font-bold text-accent" style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
    </View>
  );
}

const EMPTY_COPY: Record<Board, string> = {
  today: 'No Daily scores yet today — play today’s Daily to set the pace!',
  week: 'Nobody has banked XP this week yet. Play a round to open the board.',
  all: 'No scores yet — play a round to claim the top spot!',
};

/** Global rankings — today's Daily, this week's XP, or all time. Degrades to a friendly notice offline. */
export function LeaderboardScreen() {
  const { uid } = useAuth();
  const { state, setDisplayName } = useProgression();
  const colors = useThemeColors();
  const [editingName, setEditingName] = useState(false);
  const [board, setBoard] = useState<Board | null>(null);
  const [entries, setEntries] = useState<readonly LeaderboardEntry[]>([]);
  const [previousRanks, setPreviousRanks] = useState<Record<string, number>>({});
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const ctx = useMemo<BoardContext>(() => ({ today: dateKey(), week: weekKey() }), []);
  const myValue = board === null ? null : myBoardValue(state, board, ctx);

  // Open on the tab the player last used.
  useEffect(() => {
    let active = true;
    void leaderboardViewStore.read().then((view) => {
      if (active) setBoard(view.tab);
    });
    return () => {
      active = false;
    };
  }, []);

  const load = useCallback(
    async (b: Board) => {
      const view = await leaderboardViewStore.read();
      const top = await fetchTop(50, b, ctx);
      const ranks = ranksOf(top);
      setPreviousRanks(view.ranks[b] ?? {});
      setEntries(top);

      // My rank: straight from the list when I'm on it, else count the rows above me.
      let rank: number | null = uid !== null ? (ranks[uid] ?? null) : null;
      if (rank === null && uid !== null && myValue !== null) {
        rank = await fetchRank(b, ctx, myValue);
      }
      setMyRank(rank);

      // Remember my off-list rank too, so the pinned row can show movement next time.
      const myRanks =
        uid !== null && rank !== null && ranks[uid] === undefined ? { [uid]: rank } : {};
      await leaderboardViewStore.write({
        tab: b,
        ranks: { ...view.ranks, [b]: { ...ranks, ...myRanks } },
      });
    },
    [ctx, uid, myValue],
  );

  useFocusEffect(
    useCallback(() => {
      if (board === null) return;
      let active = true;
      setLoading(true);
      void load(board).finally(() => {
        if (active) setLoading(false);
      });
      return () => {
        active = false;
      };
    }, [load, board]),
  );

  const onRefresh = useCallback(() => {
    if (board === null) return;
    setRefreshing(true);
    void load(board).finally(() => setRefreshing(false));
  }, [load, board]);

  const activeBoard: Board = board ?? 'all';

  // With three or more players the top of the table becomes the podium and
  // the list picks up at rank 4; below that, everyone stays in plain rows.
  const hasPodium = entries.length >= 3;
  const listEntries = hasPodium ? entries.slice(3) : entries;
  const rankOffset = hasPodium ? 4 : 1;

  const onList = uid !== null && entries.some((e) => e.uid === uid);
  const showPinned = uid !== null && !onList && myRank !== null && myValue !== null && !loading;

  const header = (
    <View className="mb-5 items-center">
      <Text className="text-center text-xs font-semibold uppercase tracking-widest text-ink-muted">
        Global · Top 50
      </Text>
      <Text className="text-center text-3xl font-extrabold text-ink-primary">Leaderboard</Text>
      <Text className="mb-4 text-center text-base text-ink-secondary">
        {BOARD_BLURB[activeBoard]}
      </Text>
      <View className="w-full">
        <BoardTabs board={activeBoard} onChange={setBoard} />
      </View>
      {uid !== null && state.displayName === null && (
        <Pressable
          onPress={() => setEditingName(true)}
          accessibilityRole="button"
          accessibilityLabel="Choose your leaderboard name"
          testID="leaderboard-name-nudge"
          className="mb-5 w-full flex-row items-center justify-between gap-3 border border-hair bg-bg-raised p-4"
        >
          <View className="flex-1">
            <Text className="text-sm font-bold text-ink-primary">Choose your name</Text>
            <Text className="mt-0.5 text-xs text-ink-muted">
              You appear as {resolveDisplayName(null, uid)}. Tap to pick a name.
            </Text>
          </View>
          <Text className="text-xl text-ink-muted">›</Text>
        </Pressable>
      )}
      {hasPodium && !loading && (
        <Podium
          entries={entries}
          myUid={uid ?? undefined}
          board={activeBoard}
          ctx={ctx}
          previousRanks={previousRanks}
        />
      )}
    </View>
  );

  if (!isFirebaseConfigured) {
    return (
      <Screen edges={['top']}>
        <Backdrop>
          <View className="flex-1 items-center justify-center px-5">
            <Text className="mb-2 text-center text-3xl font-extrabold text-ink-primary">
              Leaderboard
            </Text>
            <Text className="text-center text-base text-ink-secondary">
              Leaderboards need a connection and aren’t available in this build. Your progress
              is saved on this device.
            </Text>
          </View>
        </Backdrop>
      </Screen>
    );
  }

  return (
    // Top edge only: the tab bar already owns the bottom inset, and a second
    // bottom inset here chopped the backdrop artwork off short of the bar.
    <Screen edges={['top']}>
      <Backdrop>
        <FlatList
          data={loading ? [] : listEntries}
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
          renderItem={({ item, index }) => {
            const rank = index + rankOffset;
            return (
              <Row
                entry={item}
                rank={rank}
                isMe={item.uid === uid}
                index={index}
                value={formatBoardValue(boardValue(item, activeBoard, ctx) ?? 0, activeBoard)}
                movement={movementFor(previousRanks, item.uid, rank)}
              />
            );
          }}
          ListEmptyComponent={
            loading ? (
              <View className="items-center py-16">
                <ActivityIndicator color={colors.accent.default} />
              </View>
            ) : hasPodium ? null : (
              <Text className="py-16 text-center text-base text-ink-secondary">
                {EMPTY_COPY[activeBoard]}
              </Text>
            )
          }
        />
        {showPinned && (
          <PinnedRank
            rank={myRank}
            name={resolveDisplayName(state.displayName, uid)}
            value={formatBoardValue(myValue, activeBoard)}
            movement={movementFor(previousRanks, uid, myRank)}
          />
        )}
        <PlayerNameSheet
          visible={editingName}
          currentName={state.displayName}
          fallbackName={resolveDisplayName(null, uid)}
          onSave={setDisplayName}
          onClose={() => setEditingName(false)}
        />
      </Backdrop>
    </Screen>
  );
}
