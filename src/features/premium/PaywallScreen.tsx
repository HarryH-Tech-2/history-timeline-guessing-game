import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { BackButton, Button, Screen } from '@/components/ui';
import {
  IS_IOS,
  PRIVACY_POLICY_URL,
  STORE_LABEL,
  STORE_NAME,
  SUBSCRIPTION_SETTINGS,
  TERMS_OF_USE_URL,
} from '@/config/store';
import { scheduleTrialReminder } from '@/features/reminders/scheduler';
import { track } from '@/services/analytics';

import type { PremiumPlan } from './billing';
import { FounderNote } from './FounderNote';
import {
  anyTrialDays,
  benefitOrder,
  founderLine,
  paywallHeadline,
  trialHeadline,
  type Benefit,
} from './paywallCopy';
import {
  type Money,
  savePercent,
  trialCtaText,
  trialReminderDay,
  trialTimeline,
  yearlyPerMonthLabel,
} from './paywallPricing';
import { parsePaywallSource } from './paywallSource';
import { usePremium } from './PremiumProvider';

/** Paywall copy per plan; prices come from the store via `priceLabels`. */
const PLAN_COPY: Record<PremiumPlan, { title: string; footer: string }> = {
  monthly: {
    title: 'Monthly',
    footer: `Billed monthly through ${STORE_NAME}. Cancel anytime in ${SUBSCRIPTION_SETTINGS}.`,
  },
  yearly: {
    title: 'Yearly',
    footer: `Billed yearly through ${STORE_NAME}. Cancel anytime in ${SUBSCRIPTION_SETTINGS}.`,
  },
  lifetime: {
    title: 'Lifetime',
    footer: `A one-time purchase through ${STORE_NAME}. Yours forever — nothing renews.`,
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
    return { label: trialCtaText(trialDays), sublabel: `then ${price}` };
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

/**
 * Apple's required disclosure for auto-renewing subscriptions (App Review
 * guideline 3.1.2): who charges, that it renews, and how to stop it.
 */
const APPLE_RENEWAL_TERMS =
  'Payment is charged to your Apple Account when you confirm. Subscriptions renew automatically unless cancelled at least 24 hours before the end of the current period.';

/** Small print under the button for the chosen plan. */
export function footerCopy(plan: PremiumPlan, price: string, trialDays?: number): string {
  const base = trialDays
    ? `Free for ${trialDays} days, then ${price} through ${STORE_NAME}. Cancel before the trial ends and you won’t be charged.`
    : PLAN_COPY[plan].footer;
  return IS_IOS && plan !== 'lifetime' ? `${base} ${APPLE_RENEWAL_TERMS}` : base;
}

/** Terms of Use and Privacy Policy links, required under a subscription offer. */
function LegalLinks() {
  const links = [
    { label: 'Terms of Use', url: TERMS_OF_USE_URL },
    { label: 'Privacy Policy', url: PRIVACY_POLICY_URL },
  ].filter((l) => l.url !== '');
  return (
    <View className="flex-row justify-center gap-4">
      {links.map((l) => (
        <Pressable
          key={l.label}
          onPress={() => void Linking.openURL(l.url).catch(() => {})}
          accessibilityRole="link"
          hitSlop={8}
        >
          <Text className="text-xs text-ink-muted underline">{l.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** The small chip beside a plan's name, if any. */
export function planBadge(
  plan: PremiumPlan,
  { trialDays, save }: { trialDays?: number; save: number | null },
): string | undefined {
  if (plan === 'yearly') return save ? `Save ${save}%` : 'Best value';
  if (plan === 'monthly' && trialDays) return `${trialLength(trialDays)} free trial`;
  return undefined;
}

/** The muted line under a plan's name: the yearly per-month cost, or lifetime's promise. */
export function planSubline(plan: PremiumPlan, yearly: Money | undefined): string | undefined {
  if (plan === 'yearly') return yearly ? yearlyPerMonthLabel(yearly) : undefined;
  if (plan === 'lifetime') return 'Pay once, keep forever';
  return undefined;
}

/** One selectable plan row: name, badge and sub-line on the left, price on the right. */
function PlanOption({
  plan,
  price,
  badge,
  subline,
  trialDays,
  selected,
  onSelect,
}: {
  plan: PremiumPlan;
  price: string;
  badge?: string;
  subline?: string;
  trialDays?: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const copy = PLAN_COPY[plan];
  const trialNote = trialDays ? `free ${trialLength(trialDays)} trial then ` : '';
  return (
    <Pressable
      onPress={onSelect}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${copy.title}, ${trialNote}${price}${subline ? `, ${subline}` : ''}`}
      testID={`paywall-plan-${plan}`}
      className={
        selected
          ? 'flex-row items-center gap-3 border-2 border-accent bg-accent/10 px-4 py-2.5'
          : 'flex-row items-center gap-3 border border-hair bg-bg-overlay px-4 py-2.5'
      }
    >
      <View
        className={`h-4 w-4 items-center justify-center rounded-full border-2 ${
          selected ? 'border-accent' : 'border-hair'
        }`}
      >
        {selected && <View className="h-2 w-2 rounded-full bg-accent" />}
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
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
        {subline !== undefined && (
          <Text className="text-xs text-ink-secondary" testID={`paywall-subline-${plan}`}>
            {subline}
          </Text>
        )}
      </View>
      <View className="items-end">
        {trialDays ? <Text className="text-[10px] text-ink-muted">then</Text> : null}
        <Text className="text-sm font-bold text-ink-primary">{price}</Text>
      </View>
    </Pressable>
  );
}

/** A compact above-the-fold benefit: icon and one short line. */
function LeadBenefit({ benefit }: { benefit: Benefit }) {
  return (
    <View className="flex-row items-center gap-2.5" testID={`paywall-lead-${benefit.id}`}>
      <Text className="w-6 text-center text-base" style={{ includeFontPadding: false }}>
        {benefit.icon}
      </Text>
      <Text className="flex-1 text-[15px] font-semibold text-ink-primary">{benefit.short}</Text>
    </View>
  );
}

/** A full benefit row for the scrolled "also in Premium" section. */
function BenefitRow({ benefit }: { benefit: Benefit }) {
  return (
    <View className="flex-row items-start gap-3">
      <View className="h-10 w-10 items-center justify-center border border-hair bg-bg-overlay">
        <Text className="text-xl" style={{ includeFontPadding: false }}>
          {benefit.icon}
        </Text>
      </View>
      <View className="flex-1">
        <Text className="text-base font-bold text-ink-primary">{benefit.title}</Text>
        <Text className="text-sm text-ink-secondary">{benefit.detail}</Text>
      </View>
    </View>
  );
}

/** Today → reminder → first charge, side by side under the plans. */
function TrialTimeline({ trialDays, priceLabel }: { trialDays: number; priceLabel: string }) {
  const steps = trialTimeline(trialDays, priceLabel);
  return (
    <View className="flex-row gap-2" testID="paywall-trial-timeline">
      {steps.map((step, i) => (
        <View key={step.when} className="flex-1 gap-0.5">
          <View className="flex-row items-center">
            <View className={`h-2.5 w-2.5 rounded-full ${i === 0 ? 'bg-accent' : 'bg-hair'}`} />
            {i < steps.length - 1 && <View className="ml-1 h-px flex-1 bg-hair" />}
          </View>
          <Text className="text-xs font-bold text-ink-primary">{step.when}</Text>
          <Text className="text-xs text-ink-secondary">{step.what}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * The subscription pitch. The founder's note, a source-aware headline, the
 * three most relevant benefits and the plans all sit above the fold, with the
 * buy button pinned to the bottom; the rest of the pitch and the legal copy
 * scroll beneath. Purchase and restore run through the billing adapter; when
 * no store is wired into this build the screen says so rather than failing.
 */
export function PaywallScreen() {
  const router = useRouter();
  const source = parsePaywallSource(useLocalSearchParams<{ source?: string }>().source);
  const {
    isPremium,
    billingAvailable,
    priceLabels,
    trialDays,
    priceAmounts,
    purchase,
    restore,
    revokeForTesting,
  } = usePremium();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [plan, setPlan] = useState<PremiumPlan>('yearly');

  useEffect(() => {
    track('paywall_viewed', { source });
  }, [source]);

  const selectedTrial = trialDays[plan];
  const offeredTrial = anyTrialDays(trialDays);
  const headline = offeredTrial
    ? trialHeadline(offeredTrial)
    : paywallHeadline(source, selectedTrial);
  const save = savePercent(priceAmounts.monthly, priceAmounts.yearly);
  const { lead, rest } = benefitOrder(source);

  // Opened straight from onboarding there is nothing underneath: land on home.
  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const onSubscribe = async () => {
    setBusy(true);
    setNotice(null);
    const result = await purchase(plan, source);
    setBusy(false);
    if (result === 'purchased') {
      // The timeline promised a reminder before the first charge: keep it.
      if (selectedTrial && trialReminderDay(selectedTrial) < selectedTrial) {
        void scheduleTrialReminder({
          trialDays: selectedTrial,
          atDay: trialReminderDay(selectedTrial),
          now: new Date(),
        });
      }
      close();
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
    if (ok) close();
    else setNotice(billingAvailable ? 'No active subscription found.' : 'Purchases aren’t available in this build yet.');
  };

  return (
    <Screen>
      <ScrollView
        contentContainerClassName="gap-3 px-5 pb-6 pt-3"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-start gap-2">
          <View className="flex-1">
            <FounderNote compact paragraphs={[founderLine(source, isPremium, selectedTrial)]} />
          </View>
          <BackButton onPress={close} variant="close" testID="paywall-close" />
        </View>

        <Text
          className="text-2xl font-extrabold leading-tight text-ink-primary"
          testID="paywall-headline"
        >
          {isPremium ? 'You’re Premium' : headline}
        </Text>

        <View className="gap-1.5">
          {lead.map((b) => (
            <LeadBenefit key={b.id} benefit={b} />
          ))}
        </View>

        {isPremium ? (
          <View className="gap-3">
            <View className="border border-hair bg-bg-overlay px-4 py-3">
              <Text className="text-center text-sm font-semibold text-ink-primary">
                Your subscription is active
              </Text>
            </View>
            <Button label="Done" onPress={close} testID="paywall-done" />
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
                  badge={planBadge(p, { trialDays: trialDays[p], save })}
                  subline={planSubline(p, priceAmounts.yearly)}
                  trialDays={trialDays[p]}
                  selected={p === plan}
                  onSelect={() => setPlan(p)}
                />
              ))}
            </View>
            {selectedTrial ? (
              <TrialTimeline trialDays={selectedTrial} priceLabel={priceLabels[plan]} />
            ) : null}
            <Text className="text-center text-xs text-ink-muted">
              {footerCopy(plan, priceLabels[plan], selectedTrial)}
            </Text>
          </View>
        )}

        <View className="mt-3 gap-4 border-t border-hair pt-5">
          <Text className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Also in Premium
          </Text>
          {rest.map((b) => (
            <BenefitRow key={b.id} benefit={b} />
          ))}
        </View>

        <View className="mt-2">
          <LegalLinks />
        </View>
      </ScrollView>

      {!isPremium && (
        <View
          className="gap-2 border-t border-hair bg-bg-base px-5 pb-2 pt-3"
          testID="paywall-footer"
        >
          <Button
            {...(busy
              ? { label: 'Please wait…' }
              : ctaLabel(plan, priceLabels[plan], selectedTrial))}
            onPress={() => void onSubscribe()}
            disabled={busy}
            testID="paywall-subscribe"
          />
          {notice !== null && (
            <Text className="text-center text-sm text-ink-secondary" testID="paywall-notice">
              {notice}
            </Text>
          )}
          <View className="flex-row items-center justify-center gap-2">
            <Text className="text-xs text-ink-muted" testID="paywall-trust">
              {plan === 'lifetime'
                ? 'One-time purchase, nothing renews'
                : `Cancel anytime in ${STORE_LABEL}`}
            </Text>
            <Text className="text-xs text-ink-muted">·</Text>
            <Pressable
              onPress={() => void onRestore()}
              disabled={busy}
              accessibilityRole="link"
              hitSlop={10}
              testID="paywall-restore"
            >
              <Text className="text-xs font-semibold text-ink-secondary underline">
                Restore purchases
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </Screen>
  );
}

