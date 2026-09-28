import { Platform, Pressable, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { levelForXp, type ProgressionState } from '@/domain';
import { showPlayGamesAchievements } from '@/services/playGames';
import { palette } from '@/theme/tokens';

import {
  ACHIEVEMENTS,
  achievementProgress,
  type Achievement,
  type AchievementGroup,
} from '../achievements';
import { useProgression } from '../ProgressionProvider';

/** Badges per row in a cabinet. */
const COLUMNS = 2;

/** The cabinets, in display order. */
const GROUPS: readonly { id: AchievementGroup; title: string; icon: string }[] = [
  { id: 'precision', title: 'Precision', icon: '🎯' },
  { id: 'dedication', title: 'Dedication', icon: '🎖️' },
  { id: 'daily', title: 'Daily habit', icon: '🔥' },
  { id: 'museum', title: 'Museum', icon: '🏛️' },
  { id: 'rank', title: 'Rank & riches', icon: '👑' },
];

interface Entry {
  achievement: Achievement;
  earned: boolean;
  /** Live progress toward the target (clamped to it). */
  current: number;
}

function toEntry(a: Achievement, state: ProgressionState, unlocked: ReadonlySet<string>): Entry {
  return {
    achievement: a,
    earned: unlocked.has(a.id),
    current: achievementProgress(a, state).current,
  };
}

function fractionOf({ achievement, current }: Entry): number {
  return Math.min(1, current / achievement.target);
}

/** A thin progress track; the fill carries the optional test id. */
function Bar({ fraction, testID }: { fraction: number; testID?: string }) {
  return (
    <View className="h-1.5 overflow-hidden rounded-full bg-bg-overlay">
      <View
        className="h-full rounded-full bg-accent"
        style={{ width: `${Math.round(fraction * 100)}%` }}
        testID={testID}
      />
    </View>
  );
}

/** The round badge: lit in copper once earned, a faded outline until then. */
function Medallion({ icon, earned, size = 56 }: { icon: string; earned: boolean; size?: number }) {
  return (
    <View
      className={`items-center justify-center rounded-full border-2 ${
        earned ? 'border-accent' : 'border-hair bg-bg-overlay'
      }`}
      style={[
        { width: size, height: size },
        earned ? { backgroundColor: palette.accent.soft } : null,
      ]}
    >
      <Text
        style={{ fontSize: size * 0.46, opacity: earned ? 1 : 0.3, includeFontPadding: false }}
      >
        {icon}
      </Text>
    </View>
  );
}

/** Headline card: how much of the collection is earned, and what is closest. */
function Summary({
  earnedCount,
  level,
  next,
}: {
  earnedCount: number;
  level: number;
  next: Entry | undefined;
}) {
  return (
    <View className="border border-hair bg-bg-raised p-4">
      <View className="flex-row items-center gap-4">
        <Medallion icon="🏆" earned size={64} />
        <View className="flex-1">
          <Text className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Level {level}
          </Text>
          <Text className="text-2xl font-extrabold text-ink-primary">
            {earnedCount} of {ACHIEVEMENTS.length} earned
          </Text>
          <View className="mt-2">
            <Bar fraction={earnedCount / ACHIEVEMENTS.length} />
          </View>
        </View>
      </View>

      {next !== undefined && (
        <View
          className="mt-4 flex-row items-center gap-3 border-t border-hair pt-3"
          testID="achievements-next"
        >
          <Text className="text-2xl" style={{ includeFontPadding: false }}>
            {next.achievement.icon}
          </Text>
          <View className="flex-1">
            <Text className="text-[11px] font-bold uppercase tracking-wide text-accent">
              Next up
            </Text>
            <Text className="text-sm font-bold text-ink-primary">{next.achievement.title}</Text>
            <Text className="text-xs text-ink-secondary">{next.achievement.description}</Text>
          </View>
          <Text
            className="text-xs font-semibold text-ink-muted"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {next.current.toLocaleString()} / {next.achievement.target.toLocaleString()}
          </Text>
        </View>
      )}
    </View>
  );
}

function Badge({ entry }: { entry: Entry }) {
  const { achievement, earned, current } = entry;

  return (
    <View
      testID={`achievement-${achievement.id}`}
      accessibilityLabel={`${achievement.title}, ${
        earned ? 'earned' : `${current} of ${achievement.target}`
      }. ${achievement.description}`}
      className={`flex-1 items-center border p-3 ${
        earned ? 'border-accent/50 bg-accent/10' : 'border-hair bg-bg-raised'
      }`}
    >
      <Medallion icon={achievement.icon} earned={earned} />
      <Text
        numberOfLines={2}
        className={`mt-2 text-center text-sm font-bold leading-tight ${
          earned ? 'text-ink-primary' : 'text-ink-secondary'
        }`}
      >
        {achievement.title}
      </Text>
      <Text numberOfLines={2} className="mt-0.5 text-center text-xs text-ink-muted">
        {achievement.description}
      </Text>

      {/* Pinned to the bottom so the footers line up across a row. */}
      <View className="mt-auto w-full pt-3">
        {earned ? (
          <Text className="text-center text-xs font-bold" style={{ color: palette.success }}>
            ✓ Earned
          </Text>
        ) : (
          <>
            <Bar fraction={fractionOf(entry)} testID={`achievement-progress-${achievement.id}`} />
            <Text
              className="mt-1 text-center text-[11px] font-semibold text-ink-muted"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {current.toLocaleString()} / {achievement.target.toLocaleString()}
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

/** One themed group of badges, easiest first, with its own earned count. */
function Cabinet({
  title,
  icon,
  entries,
  index,
}: {
  title: string;
  icon: string;
  entries: readonly Entry[];
  index: number;
}) {
  const rows: Entry[][] = [];
  for (let i = 0; i < entries.length; i += COLUMNS) rows.push(entries.slice(i, i + COLUMNS));

  return (
    <Animated.View
      entering={FadeInUp.delay(index * 60).springify().damping(18)}
      className="gap-3"
    >
      <View className="mt-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Text className="text-base" style={{ includeFontPadding: false }}>
            {icon}
          </Text>
          <Text className="text-lg font-bold text-ink-primary">{title}</Text>
        </View>
        <Text className="text-sm font-semibold text-ink-muted">
          {entries.filter((e) => e.earned).length} / {entries.length}
        </Text>
      </View>

      {rows.map((row) => (
        <View key={row[0]!.achievement.id} className="flex-row gap-3">
          {row.map((entry) => (
            <Badge key={entry.achievement.id} entry={entry} />
          ))}
          {/* Keep a lone last badge at column width. */}
          {row.length < COLUMNS && <View className="flex-1" />}
        </View>
      ))}
    </Animated.View>
  );
}

/**
 * The achievements as a trophy room: a summary of the collection, then a
 * cabinet of badges per theme, earned ones lit and the rest showing how close
 * they are. Lives inside the Museum's Achievements tab; the caller provides
 * the scroll.
 */
export function AchievementsList() {
  const { state } = useProgression();
  const unlocked = new Set(state.unlocked);
  const entries = ACHIEVEMENTS.map((a) => toEntry(a, state, unlocked));
  const earnedCount = entries.filter((e) => e.earned).length;
  // The unearned badge the player is closest to, as something to aim at.
  const next = entries
    .filter((e) => !e.earned)
    .sort((a, b) => fractionOf(b) - fractionOf(a))[0];

  return (
    <View className="gap-3" testID="achievements-list">
      <Summary earnedCount={earnedCount} level={levelForXp(state.xp)} next={next} />

      {Platform.OS === 'android' && (
        <Pressable
          onPress={() => {
            void showPlayGamesAchievements();
          }}
          accessibilityRole="button"
          accessibilityLabel="Open your achievements in Google Play Games"
          testID="achievements-play-games"
          className="flex-row items-center justify-between border border-hair bg-bg-raised px-4 py-3"
        >
          <View className="flex-1 pr-3">
            <Text className="text-sm font-semibold text-ink-primary">Google Play Games</Text>
            <Text className="mt-0.5 text-xs text-ink-muted">
              Everything you earn here unlocks on your Play Games profile too.
            </Text>
          </View>
          <Text className="text-xl text-ink-muted">›</Text>
        </Pressable>
      )}

      {GROUPS.map((group, index) => (
        <Cabinet
          key={group.id}
          title={group.title}
          icon={group.icon}
          index={index}
          entries={entries
            .filter((e) => e.achievement.group === group.id)
            .sort((a, b) => a.achievement.target - b.achievement.target)}
        />
      ))}
    </View>
  );
}
