import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Screen } from '@/components/ui';
import { getCategories } from '@/data';
import { activeStreakCount, type Category } from '@/domain';
import { usePremium } from '@/features/premium';
import { paywallHref } from '@/features/premium/paywallSource';
import { WinbackCard } from '@/features/premium/WinbackCard';
import { ProfileHeader, useProgression } from '@/features/progression';
import { t, type TranslationKey } from '@/i18n';
import { track } from '@/services/analytics';
import { useTheme } from '@/theme';
import { dateKey } from '@/utils/date';

import { DailyHeroCard } from './DailyHeroCard';
import { IconPlaque } from './IconPlaque';
import { StreakSheet } from './StreakSheet';
import { useContentVersion } from './useContentVersion';

interface ModeCardData {
  key: string;
  /** Translation keys, resolved at render so they follow the language. */
  title: TranslationKey;
  description: TranslationKey;
  icon: string;
  route: Href;
  /** Behind the paywall: free players see a lock and land on the paywall. */
  premiumOnly?: boolean;
  /** The route is a bottom tab: switch to it rather than pushing a screen. */
  tab?: boolean;
}

// The Daily has its own hero card at the top of the hub; these are the rest.
const MODES: readonly ModeCardData[] = [
  {
    key: 'survival',
    title: 'home.modes.survival.title',
    description: 'home.modes.survival.description',
    icon: '❤️',
    route: '/survival',
  },
  {
    key: 'campaign',
    title: 'home.modes.campaign.title',
    description: 'home.modes.campaign.description',
    icon: '🗺️',
    route: '/campaign',
    tab: true,
  },
  // Premium mode last, mirroring the premium categories at the end of their list.
  {
    key: 'endless',
    title: 'home.modes.endless.title',
    description: 'home.modes.endless.description',
    icon: '♾️',
    route: '/endless',
    premiumOnly: true,
  },
];

/** Glyph for each category's `icon` key (the seed data names them abstractly). */
const CATEGORY_ICONS: Record<string, string> = {
  flag: '📜',
  swords: '⚔️',
  person: '👤',
  cpu: '⚙️',
  palette: '🎨',
  owl: '🦉',
  globe: '🌍',
  compass: '🧭',
  handshake: '🤝',
  trophy: '🏆',
  coins: '💰',
  rocket: '🚀',
};

export function categoryIcon(icon: string): string {
  return CATEGORY_ICONS[icon] ?? '🏛️';
}

function ModeCard({
  mode,
  index,
  locked,
  onPress,
}: {
  mode: ModeCardData;
  index: number;
  /** Premium-only and the player isn't subscribed: shows a lock, opens the paywall. */
  locked: boolean;
  onPress: () => void;
}) {
  const title = t(mode.title);
  return (
    <Animated.View entering={FadeInUp.delay(index * 60).springify().damping(18)}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={locked ? t('home.modes.lockedA11y', { title }) : title}
        testID={`mode-${mode.key}`}
        className="flex-row items-center gap-4 overflow-hidden border border-hair bg-bg-raised p-4"
      >
        <IconPlaque glyph={locked ? '🔒' : mode.icon} />
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-lg font-bold text-ink-primary">{title}</Text>
            {locked && (
              <Text className="text-[11px] font-bold uppercase tracking-wide text-accent">
                Premium
              </Text>
            )}
          </View>
          <Text className="text-sm text-ink-secondary">{t(mode.description)}</Text>
        </View>
        <Text className="text-xl text-ink-muted">›</Text>
      </Pressable>
    </Animated.View>
  );
}

/** A compact two-per-row tile that starts a single-topic practice run. */
function CategoryCard({
  category,
  index,
  locked,
  onPress,
}: {
  category: Category;
  index: number;
  /** Premium-only and the player isn't subscribed: shows a lock, opens the paywall. */
  locked: boolean;
  onPress: () => void;
}) {
  return (
    <Animated.View
      entering={FadeInUp.delay((MODES.length + index) * 60).springify().damping(18)}
      className="min-w-[45%] flex-1"
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={
          locked
            ? t('home.categories.lockedA11y', { name: category.name })
            : t('home.categories.playA11y', { name: category.name })
        }
        testID={`category-${category.id}`}
        className="gap-2 overflow-hidden border border-hair bg-bg-raised p-4"
      >
        <View className="flex-row items-center gap-2.5">
          <IconPlaque glyph={locked ? '🔒' : categoryIcon(category.icon)} size="md" />
          <Text numberOfLines={2} className="flex-1 text-base font-bold leading-tight text-ink-primary">
            {category.name}
          </Text>
        </View>
        {locked && (
          <Text className="text-[11px] font-bold uppercase tracking-wide text-accent">Premium</Text>
        )}
        <Text numberOfLines={2} className="text-xs text-ink-secondary">
          {category.description}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

/** Sits under the category grid: the catalogue is still growing. */
function ComingSoonBanner() {
  return (
    <View
      testID="categories-coming-soon"
      className="mt-1 flex-row items-center gap-3 border border-dashed border-hair bg-bg-raised/60 px-4 py-3"
    >
      <Text className="text-xl" style={{ includeFontPadding: false }}>
        🔭
      </Text>
      <View className="flex-1">
        <Text className="text-sm font-bold text-ink-primary">{t('home.categories.comingSoon')}</Text>
      </View>
    </View>
  );
}

/** The landing hub: pick a mode. Each card routes into that mode's flow. */
export function HomeHub() {
  const router = useRouter();
  const { mode, toggle } = useTheme();
  const { isPremium, isLoading: premiumLoading } = usePremium();
  const { state } = useProgression();
  // Wait for the cached entitlement so a subscriber never sees the chip flash.
  const showPremiumChip = !isPremium && !premiumLoading;
  const chipReported = useRef(false);
  useEffect(() => {
    if (!showPremiumChip || chipReported.current) return;
    chipReported.current = true;
    track('upsell_shown', { placement: 'home_chip' });
  }, [showPremiumChip]);
  // The Daily streak the player is on; read per render so it is right after a run.
  const streak = activeStreakCount(state.streak, dateKey());
  const [streakOpen, setStreakOpen] = useState(false);
  // Re-render when the remote catalogue lands, so a tapped category always exists.
  useContentVersion();

  return (
    <Screen edges={['top']}>
      <ScrollView
        contentContainerClassName="px-5 pt-6 pb-4 gap-4"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-2 flex-row items-start justify-between">
          <View className="h-10 flex-1 justify-center pr-3">
            {/* Shrinks rather than wraps so the header chips fit a narrow phone. */}
            <Text
              className="text-3xl font-extrabold text-ink-primary"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.55}
            >
              Date Guesser
            </Text>
          </View>
          {showPremiumChip && (
            <Pressable
              onPress={() => router.push(paywallHref('home_chip'))}
              accessibilityRole="button"
              accessibilityLabel={t('home.seePremium')}
              hitSlop={6}
              testID="home-premium"
              className="mr-2 h-10 flex-row items-center gap-1 border border-accent/60 bg-bg-raised px-2"
            >
              <Text className="text-sm" style={{ includeFontPadding: false }}>
                👑
              </Text>
              <Text
                className="text-sm font-extrabold text-accent"
                style={{ includeFontPadding: false }}
              >
                Premium
              </Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => setStreakOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('home.streakChip', { count: streak })}
            hitSlop={6}
            testID="home-streak"
            className="mr-2 h-10 flex-row items-center gap-1 border border-hair bg-bg-raised px-3"
          >
            <Text className="text-base" style={{ includeFontPadding: false }}>
              🔥
            </Text>
            <Text
              className="text-base font-extrabold text-ink-primary"
              style={{ fontVariant: ['tabular-nums'], includeFontPadding: false }}
            >
              {streak}
            </Text>
          </Pressable>
          <Pressable
            onPress={toggle}
            accessibilityRole="button"
            accessibilityLabel={mode === 'dark' ? t('home.theme.toLight') : t('home.theme.toDark')}
            hitSlop={10}
            testID="theme-toggle"
            className="h-10 w-10 items-center justify-center border border-hair bg-bg-raised"
          >
            <Text className="text-lg">{mode === 'dark' ? '☀️' : '🌙'}</Text>
          </Pressable>
        </View>

        <ProfileHeader />

        <WinbackCard />
        <DailyHeroCard onPress={() => router.push('/daily')} />
        <StreakSheet
          visible={streakOpen}
          streak={state.streak}
          onClose={() => setStreakOpen(false)}
          onPlay={() => {
            setStreakOpen(false);
            router.push('/daily');
          }}
        />

        <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          {t('home.sections.modes')}
        </Text>
        {MODES.map((mode, index) => {
          const locked = mode.premiumOnly === true && !isPremium;
          return (
            <ModeCard
              key={mode.key}
              mode={mode}
              index={index}
              locked={locked}
              onPress={() => {
                if (locked) router.push(paywallHref('locked_mode'));
                else if (mode.tab) router.navigate(mode.route);
                else router.push(mode.route);
              }}
            />
          );
        })}

        <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          {t('home.sections.categories')}
        </Text>
        <View className="flex-row flex-wrap gap-3">
          {getCategories()
            .filter((c) => c.active)
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((category, index) => {
              const locked = category.premiumOnly && !isPremium;
              return (
                <CategoryCard
                  key={category.id}
                  category={category}
                  index={index}
                  locked={locked}
                  onPress={() =>
                    router.push(locked ? paywallHref('locked_category', { category: category.id }) : `/category/${category.id}`)
                  }
                />
              );
            })}
        </View>
        <ComingSoonBanner />
      </ScrollView>
    </Screen>
  );
}
