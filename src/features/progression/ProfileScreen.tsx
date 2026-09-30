import { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';

import { Button, Screen } from '@/components/ui';
import { isDeveloperBuild } from '@/config/env';
import { backupButtonLabel, backupProviders, storeName } from '@/config/store';
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
import { resolveDisplayName } from '@/features/leaderboard/playerName';
import { usePremium } from '@/features/premium';
import { paywallHref } from '@/features/premium/paywallSource';
import { openStoreListing } from '@/features/review';
import { useHaptics } from '@/features/haptics';
import { useReminders } from '@/features/reminders';
import { categoryIcon } from '@/features/modes/home/HomeHub';
import { IconPlaque } from '@/features/modes/home/IconPlaque';
import { onboardingStore } from '@/features/onboarding/onboardingStore';
import { useSound } from '@/features/sound';
import { formatNumber, LANGUAGES, t, useLanguage } from '@/i18n';
import { useAnalyticsSettings } from '@/services/analytics';
import { useAuth } from '@/services/firebase/auth';
import { useTheme } from '@/theme';
import { palette } from '@/theme/tokens';
import { dateKey } from '@/utils/date';

import { avatarName, resolveAvatar } from './avatars';
import { AvatarBadge } from './components/AvatarBadge';
import { AvatarSheet } from './components/AvatarSheet';
import { LanguageSheet } from './components/LanguageSheet';
import { PlayerNameSheet } from './components/PlayerNameSheet';
import { useProgression } from './ProgressionProvider';

/** The developer's photo, shared with the paywall's founder note. */
const FOUNDER_PHOTO = require('../../../assets/founder.webp');

function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="mt-2 text-xs font-semibold uppercase tracking-widest text-ink-muted">
      {children}
    </Text>
  );
}

/** A settings row's left side: its symbol, then the title with an optional line under it. */
function SettingLabel({ icon, title, body }: { icon: string; title: string; body?: string }) {
  return (
    <View className="flex-1 flex-row items-start gap-3 pr-3">
      <Text
        className="w-7 text-center text-lg leading-6"
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        {icon}
      </Text>
      <View className="flex-1">
        <Text className="text-base font-semibold text-ink-primary">{title}</Text>
        {body !== undefined && <Text className="mt-0.5 text-xs text-ink-muted">{body}</Text>}
      </View>
    </View>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-w-[45%] flex-1 border border-hair bg-bg-raised p-4">
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
  unlimitedCoins = false,
  onBuyFreeze,
}: {
  streak: { count: number; lastDate: string | null; freezes: number };
  coins: number;
  /** Premium: freezes cost nothing. */
  unlimitedCoins?: boolean;
  onBuyFreeze: () => boolean;
}) {
  const live = activeStreakCount(streak, dateKey());
  const multiplier = streakMultiplier(live);
  const canBuy = (unlimitedCoins || coins >= STREAK_FREEZE_COST) && streak.freezes < MAX_STREAK_FREEZES;

  return (
    <View className="gap-3 border border-hair bg-bg-raised p-4" testID="streak-card">
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-extrabold text-ink-primary">
            🔥 {t('common.day', { count: live })}
          </Text>
          <Text className="mt-0.5 text-xs text-ink-muted">
            {live === 0
              ? t('profile.streak.start')
              : multiplier > 1
                ? t('profile.streak.boostActive', { multiplier })
                : t('profile.streak.toBoost', { count: 3 - live })}
          </Text>
        </View>
        <Text className="text-sm font-semibold text-ink-secondary">
          ❄️ {streak.freezes} / {MAX_STREAK_FREEZES}
        </Text>
      </View>
      <Button
        label={
          unlimitedCoins
            ? t('profile.streak.addFree')
            : t('profile.streak.buy', { cost: STREAK_FREEZE_COST })
        }
        variant="ghost"
        disabled={!canBuy}
        onPress={() => {
          onBuyFreeze();
        }}
        className="h-11"
        testID="buy-freeze"
      />
      <Text className="-mt-1 text-[11px] leading-4 text-ink-muted">
        {t('profile.streak.explainer')}
      </Text>
    </View>
  );
}

/**
 * Premium in Profile. For a free player it's a pitch in the paywall's warm
 * accent: crown, headline with the entry price, what's included, and the one
 * hero button on the screen. For a subscriber it collapses to a status row.
 */
function PremiumCard({
  isPremium,
  price,
  onPress,
}: {
  isPremium: boolean;
  price: string;
  onPress: () => void;
}) {
  if (isPremium) {
    return (
      <View
        className="flex-row items-center gap-3 border border-accent/40 bg-accent/10 p-4"
        testID="premium-card"
      >
        <IconPlaque glyph="👑" size="md" />
        <View className="flex-1">
          <Text className="text-base font-extrabold text-ink-primary">{t('profile.premium.active')}</Text>
          <Text className="text-xs text-ink-secondary">{t('profile.premium.activeBody')}</Text>
        </View>
        <Button
          label={t('profile.premium.manage')}
          variant="ghost"
          onPress={onPress}
          className="h-10 px-4"
          testID="premium-cta"
        />
      </View>
    );
  }

  const benefits = [
    { icon: '❤️', label: t('profile.premium.benefits.hearts') },
    { icon: '🗺️', label: t('profile.premium.benefits.campaign') },
    { icon: '🏛️', label: t('profile.premium.benefits.categories') },
    // The premium categories by name, so the pitch shows what unlocks.
    ...getCategories()
      .filter((c) => c.active && c.premiumOnly)
      .map((c) => ({ icon: categoryIcon(c.icon), label: c.name })),
  ];
  return (
    <View className="gap-4 border-2 border-accent bg-accent/10 p-4" testID="premium-card">
      <View className="flex-row items-center gap-3">
        <IconPlaque glyph="👑" />
        <View className="flex-1">
          <Text className="text-xl font-extrabold text-ink-primary">{t('profile.premium.go')}</Text>
          <Text className="text-sm font-semibold text-accent">
            {t('profile.premium.fromPrice', { price })}
          </Text>
        </View>
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={t('profile.premium.upgrade')}
          testID="premium-cta"
          className="flex-row items-center gap-1.5 rounded-full px-4 py-2.5 active:opacity-80"
          style={{
            backgroundColor: palette.accent.default,
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 3,
            shadowOffset: { width: 0, height: 2 },
            elevation: 3,
          }}
        >
          <Text className="text-sm">👑</Text>
          <Text className="text-sm font-extrabold text-white">
            {t('profile.premium.upgrade')}
          </Text>
        </Pressable>
      </View>
      <View className="flex-row flex-wrap gap-2">
        {benefits.map((b) => (
          <View
            key={b.label}
            className="flex-row items-center gap-1.5 rounded-full border border-hair bg-bg-raised px-3 py-1.5"
          >
            <Text className="text-xs">{b.icon}</Text>
            <Text className="text-xs font-semibold text-ink-primary">{b.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** A friendly ask for a store rating: one tap straight to the listing. */
function RateUsCard() {
  return (
    <Pressable
      onPress={() => {
        void openStoreListing();
      }}
      accessibilityRole="button"
      accessibilityLabel={t('profile.rateUs.label', { store: storeName() })}
      testID="rate-us"
      className="mt-2 flex-row items-center gap-4 border border-accent bg-accent/10 p-4"
    >
      {/* The ask comes from a person, so the person's face fronts it. */}
      <Image
        source={FOUNDER_PHOTO}
        resizeMethod="resize"
        accessibilityIgnoresInvertColors
        accessible
        accessibilityLabel={t('profile.rateUs.photo')}
        style={{ width: 48, height: 48, borderRadius: 24 }}
        className="border border-hair"
        testID="rate-us-photo"
      />
      <View className="flex-1">
        <Text className="text-base font-bold text-ink-primary">
          {t('profile.rateUs.title')}
        </Text>
        <Text className="mt-0.5 text-xs text-ink-secondary">
          {t('profile.rateUs.body', { store: storeName() })}
        </Text>
      </View>
      <Text className="text-xl text-ink-muted">›</Text>
    </Pressable>
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
            className="min-w-[45%] flex-1 border border-hair bg-bg-raised p-4"
          >
            <View className="flex-row items-center justify-between">
              <Text className="flex-1 text-sm font-bold text-ink-primary" numberOfLines={1}>
                {category.name}
              </Text>
              <Text className="text-base">{badge ? badge.icon : '—'}</Text>
            </View>
            <Text className="mt-0.5 text-xs text-ink-muted">
              {t('profile.mastery.collected', { acquired, total: questions.length })}
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

/**
 * The player's profile: identity, level progress, lifetime stats, the
 * achievements gallery, and app settings (theme, version, account status).
 */
export function ProfileScreen() {
  const router = useRouter();
  const { state, buyFreeze, setDisplayName } = useProgression();
  const { isPremium, priceLabels } = usePremium();
  const { uid, isSignedIn, user, hasAccount, signOutToGuest } = useAuth();
  const { mode, toggle } = useTheme();
  const { enabled: soundOn, toggle: toggleSound } = useSound();
  const { enabled: hapticsOn, toggle: toggleHaptics } = useHaptics();
  const { enabled: analyticsOn, toggle: toggleAnalytics } = useAnalyticsSettings();
  const { language, preference } = useLanguage();
  const [choosingLanguage, setChoosingLanguage] = useState(false);
  const reminders = useReminders();
  const toggleReminders = () => {
    if (reminders.enabled) reminders.disable();
    else void reminders.enable();
  };
  const [signingOut, setSigningOut] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [choosingAvatar, setChoosingAvatar] = useState(false);

  const level = levelForXp(state.xp);
  const avatar = resolveAvatar(state.avatar, isPremium);
  const progress = levelProgress(state.xp);
  const pct = Math.round(progress.fraction * 100);

  // The public name: the player's chosen one or their generated handle. The
  // Google/email name on the account is deliberately never shown here.
  const generatedName = resolveDisplayName(null, uid);
  const displayName = resolveDisplayName(state.displayName, uid);
  const statusLine = !isSignedIn
    ? t('profile.status.offline')
    : hasAccount
      ? t('profile.status.synced')
      : t('profile.status.device');
  const languageName = LANGUAGES.find((l) => l.code === language)?.name ?? language;
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen edges={['top']}>
      <ScrollView
        contentContainerClassName="px-5 pt-6 pb-4 gap-3"
        showsVerticalScrollIndicator={false}
      >
        <Text className="mb-1 text-3xl font-extrabold text-ink-primary">{t('profile.title')}</Text>

        {/* Identity card: avatar, name, sign-in state, coins */}
        <View
          testID="profile-identity"
          className="flex-row items-center gap-4 border border-hair bg-bg-raised p-4"
        >
          <Pressable
            onPress={() => setChoosingAvatar(true)}
            accessibilityRole="button"
            accessibilityLabel={`${t('profile.avatar.label', { name: avatarName(avatar), level })}. ${t('profile.avatar.change')}`}
            testID="edit-avatar"
          >
            <AvatarBadge avatar={avatar} level={level} />
          </Pressable>
          <Pressable
            className="flex-1"
            onPress={() => setEditingName(true)}
            accessibilityRole="button"
            accessibilityLabel={t('profile.editName')}
            testID="edit-name"
          >
            <View className="flex-row items-center gap-2">
              <Text className="shrink text-lg font-bold text-ink-primary" numberOfLines={1}>
                {displayName}
              </Text>
              <Text className="text-sm text-ink-muted">✏️</Text>
            </View>
            <Text className="text-xs text-ink-muted">
              {state.displayName === null ? t('profile.tapToChooseName') : ''}
              {statusLine}
            </Text>
          </Pressable>
          <Text
            className="text-sm font-bold"
            style={{ color: palette.warning }}
            accessibilityLabel={
              isPremium ? t('common.unlimitedCoins') : t('common.coins', { count: state.coins })
            }
          >
            {isPremium ? '∞' : formatNumber(state.coins)} 🪙
          </Text>
        </View>
        <AvatarSheet visible={choosingAvatar} onClose={() => setChoosingAvatar(false)} />
        <PlayerNameSheet
          visible={editingName}
          currentName={state.displayName}
          fallbackName={generatedName}
          onSave={setDisplayName}
          onClose={() => setEditingName(false)}
        />

        {/* Level progress */}
        <View className="border border-hair bg-bg-raised p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-bold text-ink-primary">{t('common.level', { level })}</Text>
            <Text className="text-xs text-ink-muted">
              {t('profile.xpToNext', { into: progress.xpIntoLevel, needed: progress.xpForNextLevel })}
            </Text>
          </View>
          <View className="mt-2 h-2 overflow-hidden rounded-full bg-bg-overlay">
            <View
              className="h-full rounded-full"
              style={{ width: `${pct}%`, backgroundColor: palette.accent.default }}
            />
          </View>
        </View>

        <RateUsCard />

        <SectionTitle>{t('profile.sections.premium')}</SectionTitle>
        <PremiumCard
          isPremium={isPremium}
          price={priceLabels.monthly}
          onPress={() => router.push(paywallHref('profile'))}
        />

        <SectionTitle>{t('profile.sections.account')}</SectionTitle>
        {hasAccount ? (
          <View className="gap-3 border border-hair bg-bg-raised p-4">
            <View>
              <Text className="text-base font-bold text-ink-primary" numberOfLines={1}>
                {user?.email ?? (user?.providerIds.length === 0 ? 'Google Play Games' : displayName)}
              </Text>
              <Text className="text-xs text-ink-muted">
                {user?.providerIds.length === 0
                  ? t('profile.account.playGames')
                  : user?.displayName
                    ? t('profile.account.signedInAs', { name: user.displayName })
                    : t('profile.account.signedIn')}
              </Text>
            </View>
            <Button
              label={signingOut ? t('profile.account.signingOut') : t('profile.account.signOut')}
              variant="ghost"
              disabled={signingOut}
              testID="sign-out"
              onPress={() => {
                setSigningOut(true);
                void signOutToGuest().finally(() => setSigningOut(false));
              }}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/delete-account')}
              disabled={signingOut}
              testID="open-delete-account"
              className="self-center py-1"
            >
              <Text className="text-sm font-semibold" style={{ color: palette.danger }}>
                {t('profile.account.delete')}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View className="gap-3 border border-hair bg-bg-raised p-4">
            <Text className="text-sm text-ink-secondary">
              {isSignedIn
                ? t('profile.account.backupPitch', { providers: backupProviders() })
                : t('profile.account.offlineBuild')}
            </Text>
            {isSignedIn && (
              <Button
                label={backupButtonLabel()}
                testID="open-sign-in"
                onPress={() => router.push('/sign-in')}
              />
            )}
          </View>
        )}

        <SectionTitle>{t('profile.sections.streak')}</SectionTitle>
        <StreakCard
          streak={state.streak}
          coins={state.coins}
          unlimitedCoins={isPremium}
          onBuyFreeze={buyFreeze}
        />

        <SectionTitle>{t('profile.sections.mastery')}</SectionTitle>
        <MasteryGrid collection={state.collection} />

        <SectionTitle>{t('profile.sections.stats')}</SectionTitle>
        <View className="flex-row flex-wrap gap-3">
          <StatTile label={t('profile.stats.rounds')} value={formatNumber(state.stats.rounds)} />
          <StatTile label={t('profile.stats.perfect')} value={formatNumber(state.stats.perfectRounds)} />
          <StatTile label={t('profile.stats.games')} value={formatNumber(state.stats.gamesPlayed)} />
          <StatTile label={t('profile.stats.combo')} value={formatNumber(state.stats.bestStreak)} />
          <StatTile
            label={t('profile.stats.dailyStreak')}
            value={formatNumber(state.stats.bestDailyStreak)}
          />
          <StatTile
            label={t('profile.stats.artefacts')}
            value={formatNumber(Object.keys(state.collection).length)}
          />
        </View>

        <SectionTitle>{t('profile.sections.settings')}</SectionTitle>
        <Pressable
          onPress={() => setChoosingLanguage(true)}
          accessibilityRole="button"
          accessibilityLabel={t('profile.settings.languageLabel')}
          testID="profile-language"
          className="flex-row items-center justify-between border border-hair bg-bg-raised p-4"
        >
          <SettingLabel icon="🌐" title={t('profile.settings.language')} />
          <Text className="shrink text-right text-base text-ink-secondary">
            {preference === 'system'
              ? t('profile.settings.languageDevice', { language: languageName })
              : languageName}
          </Text>
        </Pressable>
        <LanguageSheet visible={choosingLanguage} onClose={() => setChoosingLanguage(false)} />
        <Pressable
          onPress={toggle}
          accessibilityRole="button"
          accessibilityLabel={mode === 'dark' ? t('profile.settings.toLight') : t('profile.settings.toDark')}
          testID="profile-theme-toggle"
          className="flex-row items-center justify-between border border-hair bg-bg-raised p-4"
        >
          <SettingLabel icon={mode === 'dark' ? '🌙' : '☀️'} title={t('profile.settings.appearance')} />
          <Text className="text-base text-ink-secondary">
            {mode === 'dark' ? t('profile.settings.dark') : t('profile.settings.light')}
          </Text>
        </Pressable>
        <Pressable
          onPress={toggleSound}
          accessibilityRole="switch"
          accessibilityState={{ checked: soundOn }}
          accessibilityLabel={soundOn ? t('profile.settings.soundOff') : t('profile.settings.soundOn')}
          testID="profile-sound-toggle"
          className="flex-row items-center justify-between border border-hair bg-bg-raised p-4"
        >
          <SettingLabel
            icon={soundOn ? '🔊' : '🔇'}
            title={t('profile.settings.sound')}
            body={t('profile.settings.soundBody')}
          />
          <Text className="text-base text-ink-secondary">{soundOn ? t('common.on') : t('common.off')}</Text>
        </Pressable>
        <Pressable
          onPress={toggleHaptics}
          accessibilityRole="switch"
          accessibilityState={{ checked: hapticsOn }}
          accessibilityLabel={hapticsOn ? t('profile.settings.vibrationOff') : t('profile.settings.vibrationOn')}
          testID="profile-haptics-toggle"
          className="flex-row items-center justify-between border border-hair bg-bg-raised p-4"
        >
          <SettingLabel
            icon="📳"
            title={t('profile.settings.vibration')}
            body={t('profile.settings.vibrationBody')}
          />
          <Text className="text-base text-ink-secondary">{hapticsOn ? t('common.on') : t('common.off')}</Text>
        </Pressable>
        <Pressable
          onPress={toggleReminders}
          accessibilityRole="switch"
          accessibilityState={{ checked: reminders.enabled }}
          accessibilityLabel={
            reminders.enabled ? t('profile.settings.reminderOff') : t('profile.settings.reminderOn')
          }
          testID="profile-reminders-toggle"
          className="flex-row items-center justify-between border border-hair bg-bg-raised p-4"
        >
          <SettingLabel
            icon="🔔"
            title={t('profile.settings.reminder')}
            body={t('profile.settings.reminderBody')}
          />
          <Text className="text-base text-ink-secondary">
            {reminders.enabled ? t('common.on') : t('common.off')}
          </Text>
        </Pressable>
        <Pressable
          onPress={toggleAnalytics}
          accessibilityRole="switch"
          accessibilityState={{ checked: analyticsOn }}
          accessibilityLabel={analyticsOn ? t('profile.settings.analyticsOff') : t('profile.settings.analyticsOn')}
          testID="profile-analytics-toggle"
          className="flex-row items-center justify-between border border-hair bg-bg-raised p-4"
        >
          <SettingLabel
            icon="📊"
            title={t('profile.settings.analytics')}
            body={t('profile.settings.analyticsBody')}
          />
          <Text className="text-base text-ink-secondary">{analyticsOn ? t('common.on') : t('common.off')}</Text>
        </Pressable>
        {isDeveloperBuild && (
          <Pressable
            onPress={() => {
              void onboardingStore.clear().then(() => router.push('/onboarding'));
            }}
            accessibilityRole="button"
            accessibilityLabel={t('profile.settings.replayOnboardingLabel')}
            testID="settings-replay-onboarding"
            className="flex-row items-center justify-between border border-dashed border-hair bg-bg-raised p-4"
          >
            <SettingLabel
              icon="🎬"
              title={t('profile.settings.replayOnboarding')}
              body={t('profile.settings.replayOnboardingBody')}
            />
            <Text className="text-xl text-ink-muted">›</Text>
          </Pressable>
        )}
        {hasAccount ? (
          <View
            className="flex-row items-center justify-between border border-hair bg-bg-raised p-4"
            testID="settings-backup"
          >
            <SettingLabel
              icon="☁️"
              title={t('profile.settings.backup')}
              body={t('profile.settings.backupOnBody')}
            />
            <Text className="text-sm font-bold" style={{ color: palette.success }}>
              {t('profile.settings.backupOn')}
            </Text>
          </View>
        ) : (
          <Pressable
            onPress={() => router.push('/sign-in')}
            accessibilityRole="button"
            accessibilityLabel={t('profile.settings.backupLabel', { providers: backupProviders() })}
            disabled={!isSignedIn}
            testID="settings-backup"
            className="flex-row items-center justify-between border border-hair bg-bg-raised p-4"
          >
            <SettingLabel
              icon="☁️"
              title={t('profile.settings.backupTitle')}
              body={isSignedIn ? t('profile.settings.backupBody') : t('profile.settings.backupUnavailable')}
            />
            <Text className="text-xl text-ink-muted">›</Text>
          </Pressable>
        )}
        <View className="flex-row items-center justify-between border border-hair bg-bg-raised p-4">
          <SettingLabel icon="ℹ️" title={t('profile.settings.version')} />
          <Text className="text-base text-ink-secondary">{version}</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
