import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Button, Screen } from '@/components/ui';
import { getCategories, getQuestionsByCategory } from '@/data';
import {
  activeStreakCount,
  levelForXp,
  levelProgress,
  MASTERY_BADGES,
  masteryTier,
  MAX_STREAK_FREEZES,
  STREAK_FREEZE_COST,
  streakMultiplier,
} from '@/domain';
import { handleForUid } from '@/features/leaderboard';
import { useAuth } from '@/services/firebase/auth';
import { useTheme } from '@/theme';
import { palette } from '@/theme/tokens';
import { dateKey } from '@/utils/date';

import { ACHIEVEMENTS, type Achievement } from './achievements';
import { useProgression } from './ProgressionProvider';

function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="mt-2 text-xs font-semibold uppercase tracking-widest text-ink-muted">
      {children}
    </Text>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-w-[45%] flex-1 rounded-2xl border border-hair bg-bg-raised p-4">
      <Text className="text-2xl font-extrabold text-ink-primary">{value}</Text>
      <Text className="mt-0.5 text-xs text-ink-muted">{label}</Text>
    </View>
  );
}

/**
 * The Daily streak: live count, XP boost in force, and the freeze shop. The
 * displayed count is the streak that is still alive today — a lapsed streak
 * reads 0 even before its stored counter is overwritten by the next Daily.
 */
function StreakCard({
  streak,
  coins,
  onBuyFreeze,
}: {
  streak: { count: number; lastDate: string | null; freezes: number };
  coins: number;
  onBuyFreeze: () => boolean;
}) {
  const live = activeStreakCount(streak, dateKey());
  const multiplier = streakMultiplier(live);
  const canBuy = coins >= STREAK_FREEZE_COST && streak.freezes < MAX_STREAK_FREEZES;

  return (
    <View className="gap-3 rounded-2xl border border-hair bg-bg-raised p-4" testID="streak-card">
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-extrabold text-ink-primary">
            🔥 {live} {live === 1 ? 'day' : 'days'}
          </Text>
          <Text className="mt-0.5 text-xs text-ink-muted">
            {live === 0
              ? 'Finish today’s Daily to start a streak'
              : multiplier > 1
                ? `×${multiplier} XP boost active`
                : `${3 - live} more ${3 - live === 1 ? 'day' : 'days'} to a ×1.1 XP boost`}
          </Text>
        </View>
        <Text className="text-sm font-semibold text-ink-secondary">
          ❄️ {streak.freezes} / {MAX_STREAK_FREEZES}
        </Text>
      </View>
      <Button
        label={`Buy streak freeze · ${STREAK_FREEZE_COST} 🪙`}
        variant="ghost"
        disabled={!canBuy}
        onPress={() => {
          onBuyFreeze();
        }}
        className="h-11"
        testID="buy-freeze"
      />
      <Text className="-mt-1 text-[11px] leading-4 text-ink-muted">
        A freeze automatically covers one missed day so your streak survives.
      </Text>
    </View>
  );
}

/** Bronze/silver/gold per category, driven by museum acquisitions. */
function MasteryGrid({ collection }: { collection: Readonly<Record<string, number>> }) {
  const categories = getCategories().filter((c) => c.active);
  return (
    <View className="flex-row flex-wrap gap-3">
      {categories.map((category) => {
        const questions = getQuestionsByCategory(category.id);
        const acquired = questions.filter((q) => collection[q.id] !== undefined).length;
        const tier = masteryTier(acquired, questions.length);
        const badge = tier ? MASTERY_BADGES[tier] : null;
        const pct =
          questions.length === 0 ? 0 : Math.round((acquired / questions.length) * 100);
        return (
          <View
            key={category.id}
            testID={`mastery-${category.id}`}
            className="min-w-[45%] flex-1 rounded-2xl border border-hair bg-bg-raised p-4"
          >
            <View className="flex-row items-center justify-between">
              <Text className="flex-1 text-sm font-bold text-ink-primary" numberOfLines={1}>
                {category.name}
              </Text>
              <Text className="text-base">{badge ? badge.icon : '—'}</Text>
            </View>
            <Text className="mt-0.5 text-xs text-ink-muted">
              {acquired} / {questions.length} collected
            </Text>
            <View className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-overlay">
              <View
                className="h-full rounded-full"
                style={{ width: `${pct}%`, backgroundColor: category.colour }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function AchievementRow({
  achievement,
  earned,
  index,
}: {
  achievement: Achievement;
  earned: boolean;
  index: number;
}) {
  return (
    <Animated.View entering={FadeInUp.delay(index * 30).springify().damping(18)}>
      <View
        testID={`achievement-${achievement.id}`}
        className="flex-row items-center gap-4 rounded-2xl border border-hair bg-bg-raised p-4"
        style={{ opacity: earned ? 1 : 0.45 }}
      >
        <Text className="text-3xl">{earned ? achievement.icon : '🔒'}</Text>
        <View className="flex-1">
          <Text className="text-base font-bold text-ink-primary">{achievement.title}</Text>
          <Text className="text-sm text-ink-secondary">{achievement.description}</Text>
        </View>
        {earned && (
          <Text className="text-sm font-bold" style={{ color: palette.success }}>
            ✓
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

/**
 * The player's profile: identity, level progress, lifetime stats, the
 * achievements gallery, and app settings (theme, version, account status).
 */
export function ProfileScreen() {
  const router = useRouter();
  const { state, buyFreeze } = useProgression();
  const { uid, isSignedIn, user, hasAccount, signOutToGuest } = useAuth();
  const { mode, toggle } = useTheme();
  const [signingOut, setSigningOut] = useState(false);

  const level = levelForXp(state.xp);
  const progress = levelProgress(state.xp);
  const pct = Math.round(progress.fraction * 100);

  const displayName =
    user?.displayName?.trim() || user?.email || (uid ? handleForUid(uid) : 'Local Player');
  const statusLine = !isSignedIn
    ? 'Offline · progress saved on device'
    : hasAccount
      ? 'Signed in · progress synced'
      : 'Playing as guest';
  const unlocked = new Set(state.unlocked);
  const earnedCount = ACHIEVEMENTS.filter((a) => unlocked.has(a.id)).length;
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen>
      <ScrollView
        contentContainerClassName="px-5 pt-6 pb-10 gap-3"
        showsVerticalScrollIndicator={false}
      >
        <Text className="mb-1 text-3xl font-extrabold text-ink-primary">Profile</Text>

        {/* Identity card: avatar, name, sign-in state, coins */}
        <View
          testID="profile-identity"
          className="flex-row items-center gap-4 rounded-2xl border border-hair bg-bg-raised p-4"
        >
          <View
            className="h-14 w-14 items-center justify-center rounded-full"
            style={{ backgroundColor: palette.accent.soft }}
          >
            <Text className="text-xl font-extrabold" style={{ color: palette.accent.default }}>
              {level}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-lg font-bold text-ink-primary" numberOfLines={1}>
              {displayName}
            </Text>
            <Text className="text-xs text-ink-muted">{statusLine}</Text>
          </View>
          <Text className="text-sm font-bold" style={{ color: palette.warning }}>
            {state.coins.toLocaleString()} 🪙
          </Text>
        </View>

        {/* Level progress */}
        <View className="rounded-2xl border border-hair bg-bg-raised p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-bold text-ink-primary">Level {level}</Text>
            <Text className="text-xs text-ink-muted">
              {progress.xpIntoLevel} / {progress.xpForNextLevel} XP to next
            </Text>
          </View>
          <View className="mt-2 h-2 overflow-hidden rounded-full bg-bg-overlay">
            <View
              className="h-full rounded-full"
              style={{ width: `${pct}%`, backgroundColor: palette.accent.default }}
            />
          </View>
        </View>

        <SectionTitle>Daily streak</SectionTitle>
        <StreakCard
          streak={state.streak}
          coins={state.coins}
          onBuyFreeze={buyFreeze}
        />

        <SectionTitle>Mastery</SectionTitle>
        <MasteryGrid collection={state.collection} />

        <SectionTitle>Stats</SectionTitle>
        <View className="flex-row flex-wrap gap-3">
          <StatTile label="Questions answered" value={state.stats.rounds.toLocaleString()} />
          <StatTile label="Perfect guesses" value={state.stats.perfectRounds.toLocaleString()} />
          <StatTile label="Games played" value={state.stats.gamesPlayed.toLocaleString()} />
          <StatTile label="Best combo" value={state.stats.bestStreak.toLocaleString()} />
          <StatTile
            label="Best daily streak"
            value={state.stats.bestDailyStreak.toLocaleString()}
          />
          <StatTile
            label="Artefacts collected"
            value={Object.keys(state.collection).length.toLocaleString()}
          />
        </View>

        <SectionTitle>Achievements</SectionTitle>
        <Text className="-mt-2 text-sm text-ink-secondary">
          {earnedCount} of {ACHIEVEMENTS.length} earned
        </Text>
        {ACHIEVEMENTS.map((achievement, index) => (
          <AchievementRow
            key={achievement.id}
            achievement={achievement}
            earned={unlocked.has(achievement.id)}
            index={index}
          />
        ))}

        <SectionTitle>Account</SectionTitle>
        {hasAccount ? (
          <View className="gap-3 rounded-2xl border border-hair bg-bg-raised p-4">
            <View>
              <Text className="text-base font-bold text-ink-primary" numberOfLines={1}>
                {user?.email ?? displayName}
              </Text>
              <Text className="text-xs text-ink-muted">
                Signed in{user?.displayName ? ` as ${user.displayName}` : ''}
              </Text>
            </View>
            <Button
              label={signingOut ? 'Signing out…' : 'Sign out'}
              variant="ghost"
              disabled={signingOut}
              testID="sign-out"
              onPress={() => {
                setSigningOut(true);
                void signOutToGuest().finally(() => setSigningOut(false));
              }}
            />
          </View>
        ) : (
          <View className="gap-3 rounded-2xl border border-hair bg-bg-raised p-4">
            <Text className="text-sm text-ink-secondary">
              {isSignedIn
                ? 'You are playing as a guest. Sign in to keep your progress safe across devices.'
                : 'Accounts are not available in this offline build.'}
            </Text>
            {isSignedIn && (
              <Button
                label="Sign in"
                testID="open-sign-in"
                onPress={() => router.push('/sign-in')}
              />
            )}
          </View>
        )}

        <SectionTitle>Settings</SectionTitle>
        <Pressable
          onPress={toggle}
          accessibilityRole="button"
          accessibilityLabel={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          testID="profile-theme-toggle"
          className="flex-row items-center justify-between rounded-2xl border border-hair bg-bg-raised p-4"
        >
          <Text className="text-base font-semibold text-ink-primary">Appearance</Text>
          <Text className="text-base text-ink-secondary">
            {mode === 'dark' ? 'Dark 🌙' : 'Light ☀️'}
          </Text>
        </Pressable>
        <View className="flex-row items-center justify-between rounded-2xl border border-hair bg-bg-raised p-4">
          <Text className="text-base font-semibold text-ink-primary">Version</Text>
          <Text className="text-base text-ink-secondary">{version}</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
