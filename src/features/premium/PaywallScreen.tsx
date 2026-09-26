import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { BackButton, Button, Card, Screen } from '@/components/ui';
import { getCategories } from '@/data';
import { track } from '@/services/analytics';

import type { PremiumPlan } from './billing';
import { FounderNote } from './FounderNote';
import { usePremium } from './PremiumProvider';

/** Paywall copy per plan; prices come from the store via `priceLabels`. */
const PLAN_COPY: Record<PremiumPlan, { title: string; badge?: string; footer: string }> = {
  monthly: {
    title: 'Monthly',
    footer: 'Billed monthly through Google Play. Cancel anytime in your Play subscriptions.',
  },
  yearly: {
    title: 'Yearly',
    badge: 'Best value',
    footer: 'Billed yearly through Google Play. Cancel anytime in your Play subscriptions.',
  },
  lifetime: {
    title: 'Lifetime',
    badge: 'Pay once',
    footer: 'A one-time purchase through Google Play. Yours forever — nothing renews.',
  },
};

const PLAN_ORDER: readonly PremiumPlan[] = ['monthly', 'yearly', 'lifetime'];

/** "7-day" / "1-month" style length for trial copy. */
export function trialLength(days: number): string {
  if (days % 30 === 0) return days === 30 ? '1-month' : `${days / 30}-month`;
  if (days % 7 === 0) return days === 7 ? '1-week' : `${days / 7}-week`;
  return `${days}-day`;
}

/**
 * The main button's two lines for the chosen plan: the action on top, the
 * price underneath. Says what the player is getting rather than the generic
 * "Subscribe", and leads with the free trial when the store offers one.
 */
export function ctaLabel(
  plan: PremiumPlan,
  price: string,
  trialDays?: number,
): { label: string; sublabel: string } {
  if (trialDays) {
    return { label: `Start my free ${trialLength(trialDays)} trial`, sublabel: `then ${price}` };
  }
  switch (plan) {
    case 'monthly':
      return { label: 'Get my monthly subscription', sublabel: price };
    case 'yearly':
      return { label: 'Get my yearly subscription', sublabel: price };
    case 'lifetime':
      return { label: 'Get lifetime access', sublabel: price };
  }
}

/** Small print under the button for the chosen plan. */
export function footerCopy(plan: PremiumPlan, price: string, trialDays?: number): string {
  if (trialDays) {
    return `Free for ${trialDays} days, then ${price} through Google Play. Cancel before the trial ends and you won’t be charged.`;
  }
  return PLAN_COPY[plan].footer;
}

/** One selectable plan row: name and badge on the left, price on the right. */
function PlanOption({
  plan,
  price,
  trialDays,
  selected,
  onSelect,
}: {
  plan: PremiumPlan;
  price: string;
  trialDays?: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const copy = PLAN_COPY[plan];
  const badge = trialDays ? `${trialLength(trialDays)} free trial` : copy.badge;
  return (
    <Pressable
      onPress={onSelect}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${copy.title}, ${trialDays ? `free ${trialLength(trialDays)} trial then ` : ''}${price}`}
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
        {badge !== undefined && (
          <View
            className={selected ? 'bg-accent px-1.5 py-0.5' : 'bg-bg-raised px-1.5 py-0.5'}
            testID={`paywall-badge-${plan}`}
          >
            <Text
              className={`text-[10px] font-extrabold uppercase tracking-wide ${
                selected ? '' : 'text-ink-muted'
              }`}
              style={{ includeFontPadding: false, ...(selected ? { color: '#1D1712' } : {}) }}
            >
              {badge}
            </Text>
          </View>
        )}
      </View>
      <View className="items-end">
        {trialDays ? <Text className="text-[10px] text-ink-muted">then</Text> : null}
        <Text className="text-sm font-bold text-ink-primary">{price}</Text>
      </View>
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
  const {
    isPremium,
    billingAvailable,
    priceLabels,
    trialDays,
    purchase,
    restore,
    revokeForTesting,
  } = usePremium();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [plan, setPlan] = useState<PremiumPlan>('yearly');

  useEffect(() => {
    track('paywall_viewed');
  }, []);

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
          <BackButton onPress={() => router.back()} variant="close" testID="paywall-close" />
        </View>

        <FounderNote
          paragraphs={
            isPremium
              ? ['Thank you so much for supporting an indie developer — enjoy the whole archive!']
              : [
                  'Hi, I’m Harry 👋',
                  'Subscribing doesn’t pay a big company. It backs one developer who builds this app alone.',
                  'Join the players who keep it going, and let’s keep making it better.',
                ]
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
              detail="An unlimited run of the full catalogue, with unlimited lives."
            />
            <Benefit
              icon="🔓"
              title={`${categoryNames} unlocked`}
              detail="Practice any premium category on its own, for as long as you like."
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
                    trialDays={trialDays[p]}
                    selected={p === plan}
                    onSelect={() => setPlan(p)}
                  />
                ))}
              </View>
              <Button
                {...(busy
                  ? { label: 'Please wait…' }
                  : ctaLabel(plan, priceLabels[plan], trialDays[plan]))}
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
                {footerCopy(plan, priceLabels[plan], trialDays[plan])}
              </Text>
            </View>
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}
