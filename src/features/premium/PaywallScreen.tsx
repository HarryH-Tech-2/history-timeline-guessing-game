import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Card, Screen } from '@/components/ui';
import { getCategories } from '@/data';

import type { PremiumPlan } from './billing';
import { FounderNote } from './FounderNote';
import { usePremium } from './PremiumProvider';

/** Paywall copy per plan; prices come from the store via `priceLabels`. */
const PLAN_COPY: Record<
  PremiumPlan,
  { title: string; badge?: string; cta: string; footer: string }
> = {
  monthly: {
    title: 'Monthly',
    cta: 'Subscribe',
    footer: 'Billed monthly through Google Play. Cancel anytime in your Play subscriptions.',
  },
  yearly: {
    title: 'Yearly',
    badge: 'Best value',
    cta: 'Subscribe',
    footer: 'Billed yearly through Google Play. Cancel anytime in your Play subscriptions.',
  },
  lifetime: {
    title: 'Lifetime',
    badge: 'Pay once',
    cta: 'Buy once',
    footer: 'A one-time purchase through Google Play. Yours forever — nothing renews.',
  },
};

const PLAN_ORDER: readonly PremiumPlan[] = ['monthly', 'yearly', 'lifetime'];

/** One selectable plan row: name and badge on the left, price on the right. */
function PlanOption({
  plan,
  price,
  selected,
  onSelect,
}: {
  plan: PremiumPlan;
  price: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const copy = PLAN_COPY[plan];
  return (
    <Pressable
      onPress={onSelect}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${copy.title}, ${price}`}
      testID={`paywall-plan-${plan}`}
      className={
        selected
          ? 'flex-row items-center gap-3 border-2 border-accent bg-accent/10 px-4 py-3'
          : 'flex-row items-center gap-3 border border-hair bg-bg-overlay px-4 py-3'
      }
    >
      <View
        className={`h-4 w-4 items-center justify-center rounded-full border-2 ${
          selected ? 'border-accent' : 'border-hair'
        }`}
      >
        {selected && <View className="h-2 w-2 rounded-full bg-accent" />}
      </View>
      <View className="flex-1 flex-row items-center gap-2">
        <Text className="text-base font-bold text-ink-primary">{copy.title}</Text>
        {copy.badge !== undefined && (
          <View className={selected ? 'bg-accent px-1.5 py-0.5' : 'bg-bg-raised px-1.5 py-0.5'}>
            <Text
              className={`text-[10px] font-extrabold uppercase tracking-wide ${
                selected ? '' : 'text-ink-muted'
              }`}
              style={{ includeFontPadding: false, ...(selected ? { color: '#1D1712' } : {}) }}
            >
              {copy.badge}
            </Text>
          </View>
        )}
      </View>
      <Text className="text-sm font-bold text-ink-primary">{price}</Text>
    </Pressable>
  );
}

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
  const { isPremium, billingAvailable, priceLabels, purchase, restore, revokeForTesting } =
    usePremium();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [plan, setPlan] = useState<PremiumPlan>('yearly');

  const premiumCategories = getCategories().filter((c) => c.active && c.premiumOnly);
  const names = premiumCategories.map((c) => c.name);
  const categoryNames =
    names.length > 1 ? `${names.slice(0, -1).join(', ')} & ${names.at(-1)}` : (names[0] ?? '');

  const onSubscribe = async () => {
    setBusy(true);
    setNotice(null);
    const result = await purchase(plan);
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
              : 'Hi, I’m Harry 👋 I’m an indie developer and I maintain this app on my own. I’d really appreciate it if you signed up and supported me.'
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
              detail="An unlimited run of the full catalogue on ten lives."
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
              <View className="gap-2" accessibilityRole="radiogroup">
                {PLAN_ORDER.map((p) => (
                  <PlanOption
                    key={p}
                    plan={p}
                    price={priceLabels[p]}
                    selected={p === plan}
                    onSelect={() => setPlan(p)}
                  />
                ))}
              </View>
              <Button
                label={busy ? 'Please wait…' : `${PLAN_COPY[plan].cta} · ${priceLabels[plan]}`}
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
                {PLAN_COPY[plan].footer}
              </Text>
            </View>
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}
