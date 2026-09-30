import { useEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { t } from '@/i18n';
import { track } from '@/services/analytics';

import { paywallHref } from './paywallSource';
import { useWinbackOffer } from './useWinbackOffer';
import { daysLeft } from './winback';

/**
 * The win-back offer on the home screen: a thank-you discount on the first
 * year of Premium for a player who looked at the paywall days ago and kept
 * playing. Only renders while the offer is live (see useWinbackOffer); the
 * countdown is the offer's real end.
 */
export function WinbackCard() {
  const router = useRouter();
  const { offer, now, markShown } = useWinbackOffer();
  const reported = useRef(false);

  useEffect(() => {
    if (!offer || reported.current) return;
    reported.current = true;
    markShown();
    track('upsell_shown', { placement: 'winback_card' });
  }, [offer, markShown]);

  if (!offer) return null;
  const days = daysLeft(offer.endsAt, now);
  return (
    <Pressable
      onPress={() => router.push(paywallHref('winback'))}
      accessibilityRole="button"
      accessibilityLabel={t('home.winback.a11y', { percent: offer.percentOff, count: days })}
      testID="winback-card"
      className="flex-row items-center gap-3 border-2 border-accent bg-accent/10 px-4 py-3 active:opacity-80"
    >
      <Text className="text-3xl" style={{ includeFontPadding: false }}>
        🎁
      </Text>
      <View className="flex-1">
        <Text className="text-base font-extrabold text-ink-primary">
          {t('home.winback.title', { percent: offer.percentOff })}
        </Text>
        <Text className="text-sm text-ink-secondary">
          {t('home.winback.subtitle', { count: days })}
        </Text>
      </View>
      <Text className="text-lg font-extrabold text-accent">›</Text>
    </Pressable>
  );
}
