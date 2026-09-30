import { useEffect } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { z } from 'zod';

import { Button } from '@/components/ui';
import { usePremium } from '@/features/premium';
import { anyTrialDays } from '@/features/premium/paywallCopy';
import { trialCtaText } from '@/features/premium/paywallPricing';
import { t } from '@/i18n';
import { track } from '@/services/analytics';
import { createStore } from '@/storage';

import {
  allStagesIncludingRoutes,
  CAMPAIGN,
  eraName,
  isStagePremium,
  isWorldPremium,
  type CampaignWorld,
} from '../campaignMap';

/** Whether the prompt has been shown: once per install, ever. */
export const eraConqueredStore = createStore<{ shown: boolean }>({
  key: 'chronos.upsell.eraConquered',
  schema: z.object({ shown: z.boolean() }),
  fallback: { shown: false },
});

/** The premium eras and how many stages they hold, for the prompt's copy. */
export function premiumAhead(worlds: readonly CampaignWorld[] = CAMPAIGN): {
  next: CampaignWorld | undefined;
  eras: number;
  stages: number;
} {
  const premium = worlds.filter((w) => isWorldPremium(w.id, worlds));
  return {
    next: premium[0],
    eras: premium.length,
    stages: allStagesIncludingRoutes().filter((s) => isStagePremium(s, worlds)).length,
  };
}

/**
 * The upsell at the campaign's best moment: a free player has just conquered
 * the last free era and its trophy has lit up. Shown once, after the fanfare,
 * pointing at what lies beyond — the premium eras — with the buy flow one tap
 * away and an easy way to carry on without it.
 */
export function EraConqueredSheet({
  visible,
  world,
  onUnlock,
  onClose,
}: {
  visible: boolean;
  /** The era just conquered. */
  world: CampaignWorld | undefined;
  onUnlock: () => void;
  onClose: () => void;
}) {
  const { trialDays } = usePremium();
  const trial = anyTrialDays(trialDays);
  const { next, eras, stages } = premiumAhead();

  useEffect(() => {
    if (visible) track('upsell_shown', { placement: 'era_complete' });
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View
        testID="era-conquered"
        className="flex-1 justify-end px-4 pb-8"
        style={{ backgroundColor: 'rgba(12,9,6,0.72)' }}
      >
        <Animated.View entering={ZoomIn.springify().damping(12)} className="gap-3 border-2 border-accent bg-bg-base px-5 pb-5 pt-6">
          <Text className="text-center text-5xl" style={{ includeFontPadding: false }}>
            🏆
          </Text>
          <Text className="text-center text-2xl font-extrabold text-ink-primary">
            {world
              ? t('paywall.eraConquered.title', { name: eraName(world) })
              : t('paywall.eraConquered.titleFallback')}
          </Text>
          <Text className="text-center text-base text-ink-secondary" testID="era-conquered-body">
            {next
              ? t('paywall.eraConquered.body', { next: eraName(next), count: eras, stages })
              : t('paywall.eraConquered.bodyFallback')}
          </Text>
          <Button
            variant="hero"
            label={trial ? trialCtaText(trial) : t('paywall.eraConquered.unlock')}
            onPress={onUnlock}
            testID="era-conquered-unlock"
          />
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            hitSlop={8}
            testID="era-conquered-later"
            className="items-center py-1"
          >
            <Text className="text-sm font-semibold text-ink-muted">{t('paywall.eraConquered.notNow')}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}
