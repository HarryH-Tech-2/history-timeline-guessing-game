import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Card, Screen } from '@/components/ui';
import { getCategories } from '@/data';

import { FounderNote } from './FounderNote';
import { usePremium } from './PremiumProvider';

function Benefit({ icon, title, detail }: { icon: string; title: string; detail: string }) {
  return (
    <View className="flex-row items-start gap-3">
      <View className="h-10 w-10 items-center justify-center border border-hair bg-bg-overlay">
        <Text className="text-xl" style={{ includeFontPadding: false }}>
          {icon}
        </Text>
      </View>
      <View className="flex-1">
        <Text className="text-base font-bold text-ink-primary">{title}</Text>
        <Text className="text-sm text-ink-secondary">{detail}</Text>
      </View>
    </View>
  );
}

/**
 * The subscription pitch: unlimited hearts plus every premium category, for a
 * monthly price. Purchase and restore run through the billing adapter; when
 * no store is wired into this build the screen says so rather than failing.
 */
export function PaywallScreen() {
  const router = useRouter();
  const { isPremium, billingAvailable, priceLabel, purchase, restore, revokeForTesting } =
    usePremium();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const premiumCategories = getCategories().filter((c) => c.active && c.premiumOnly);
  const names = premiumCategories.map((c) => c.name);
  const categoryNames =
    names.length > 1 ? `${names.slice(0, -1).join(', ')} & ${names.at(-1)}` : (names[0] ?? '');

  const onSubscribe = async () => {
    setBusy(true);
    setNotice(null);
    const result = await purchase();
    setBusy(false);
    if (result === 'purchased') {
      router.back();
    } else if (result === 'unavailable') {
      setNotice('Purchases aren’t available in this build yet.');
    } else if (result === 'error') {
      setNotice('Something went wrong. Please try again.');
    }
  };

  const onRestore = async () => {
    setBusy(true);
    setNotice(null);
    const ok = await restore();
    setBusy(false);
    if (ok) router.back();
    else setNotice(billingAvailable ? 'No active subscription found.' : 'Purchases aren’t available in this build yet.');
  };

  return (
    <Screen>
      <ScrollView
        contentContainerClassName="flex-grow justify-center gap-4 px-5 py-6"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center justify-between">
          <Text className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Premium
          </Text>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={10}
            testID="paywall-close"
            className="h-10 w-10 items-center justify-center border border-hair bg-bg-raised"
          >
            <Text className="text-lg font-bold text-ink-primary">✕</Text>
          </Pressable>
        </View>

        <FounderNote
          line={
            isPremium
              ? 'Thank you so much for supporting an indie developer — enjoy the whole archive!'
              : 'Hi, I’m Harry 👋 I’m an indie developer and I make this game on my own. I’d really appreciate it if you signed up and supported me.'
          }
        />

        <Card className="gap-5">
          <View className="gap-1">
            <Text className="text-3xl font-extrabold text-ink-primary">
              {isPremium ? 'You’re Premium' : 'Go Premium'}
            </Text>
            <Text className="text-base text-ink-secondary">
              Everything in the museum, and never wait for a heart again.
            </Text>
          </View>

          <View className="gap-4">
            <Benefit
              icon="❤️"
              title="Unlimited hearts"
              detail="Miss as often as you like — no cooldowns, no coin refills."
            />
            <Benefit
              icon="♾️"
              title="Endless mode"
              detail="An unlimited run of the full catalogue on five lives."
            />
            <Benefit
              icon="🔓"
              title={`${categoryNames} unlocked`}
              detail="Every premium category, in practice runs, Endless and Survival."
            />
            <Benefit
              icon="🏛️"
              title="Complete your museum"
              detail="Collect every artefact, including the premium wings."
            />
          </View>

          {isPremium ? (
            <View className="gap-3">
              <View className="border border-hair bg-bg-overlay px-4 py-3">
                <Text className="text-center text-sm font-semibold text-ink-primary">
                  Your subscription is active
                </Text>
              </View>
              <Button label="Done" onPress={() => router.back()} testID="paywall-done" />
              {__DEV__ && (
                <Button
                  label="Revoke (dev only)"
                  variant="ghost"
                  onPress={revokeForTesting}
                  testID="paywall-revoke"
                />
              )}
            </View>
          ) : (
            <View className="gap-3">
              <Button
                label={busy ? 'Please wait…' : `Subscribe · ${priceLabel}`}
                onPress={() => void onSubscribe()}
                disabled={busy}
                testID="paywall-subscribe"
              />
              <Button
                label="Restore purchases"
                variant="ghost"
                onPress={() => void onRestore()}
                disabled={busy}
                testID="paywall-restore"
              />
              {notice !== null && (
                <Text className="text-center text-sm text-ink-secondary" testID="paywall-notice">
                  {notice}
                </Text>
              )}
              <Text className="text-center text-xs text-ink-muted">
                Billed monthly through Google Play. Cancel anytime in your Play subscriptions.
              </Text>
            </View>
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}
