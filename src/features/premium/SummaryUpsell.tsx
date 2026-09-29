import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Card } from '@/components/ui';
import { track } from '@/services/analytics';
import { dateKey } from '@/utils/date';

import { paywallHref } from './paywallSource';
import { usePremium } from './PremiumProvider';
import { summaryUpsellStore } from './upsellStore';

/**
 * A quiet Premium card under a finished run's summary. Free players only, and
 * at most once a calendar day per device, so it reads as an offer rather than
 * a toll. Deliberately secondary: a ghost button below the run's own actions.
 */
export function SummaryUpsell() {
  const router = useRouter();
  const { isPremium, isLoading } = usePremium();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (isPremium || isLoading) return;
    let active = true;
    const today = dateKey();
    void summaryUpsellStore.read().then(({ lastShownDay }) => {
      if (!active || lastShownDay === today) return;
      setShown(true);
      track('upsell_shown', { placement: 'run_summary' });
      void summaryUpsellStore.write({ lastShownDay: today });
    });
    return () => {
      active = false;
    };
  }, [isPremium, isLoading]);

  if (!shown || isPremium) return null;
  return (
    <Card className="mt-4 gap-3 p-4" testID="summary-upsell">
      <View className="gap-1">
        <Text className="text-[11px] font-bold uppercase tracking-wide text-accent">
          👑 Premium
        </Text>
        <Text className="text-base font-bold text-ink-primary">Enjoying it?</Text>
        <Text className="text-sm text-ink-secondary">
          Premium: unlimited hearts, the full campaign and Endless
        </Text>
      </View>
      <Button
        label="See Premium"
        variant="ghost"
        onPress={() => router.push(paywallHref('run_summary'))}
        testID="summary-upsell-cta"
      />
    </Card>
  );
}
