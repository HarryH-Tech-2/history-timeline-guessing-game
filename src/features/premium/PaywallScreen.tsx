import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';

import { BackButton, Button, Screen } from '@/components/ui';
import {
  IS_IOS,
  PRIVACY_POLICY_URL,
  STORE_LABEL,
  inSubscriptionSettings,
  storeName,
  TERMS_OF_USE_URL,
} from '@/config/store';
import { scheduleTrialReminder } from '@/features/reminders/scheduler';
import { t } from '@/i18n';
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
import { paramValue, parsePaywallSource } from './paywallSource';
import { PersonalPitch } from './PersonalPitch';
import { usePremium } from './PremiumProvider';
import { recordPaywallDismissal, useWinbackOffer, type LiveWinbackOffer } from './useWinbackOffer';
import { daysLeft, percentOff } from './winback';

/** Paywall copy per plan; prices come from the store via `priceLabels`. */
function planCopy(plan: PremiumPlan): { title: string; footer: string } {
  return {
    title: t(`paywall.plans.${plan}`),
    footer: t(`paywall.planFooter.${plan}`, {
      store: storeName(),
      settings: inSubscriptionSettings(),
    }),
  };
}

const PLAN_ORDER: readonly PremiumPlan[] = ['monthly', 'yearly', 'lifetime'];

/** "7-day" / "1-month" style length for trial copy. */
export function trialLength(days: number): string {
  if (days % 30 === 0) return t('paywall.trialLength.month', { count: days / 30 });
  if (days % 7 === 0) return t('paywall.trialLength.week', { count: days / 7 });
  return t('paywall.trialLength.day', { count: days });
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
    return { label: trialCtaText(trialDays), sublabel: t('paywall.cta.thenPrice', { price }) };
  }
  return { label: t(`paywall.cta.${plan}`), sublabel: price };
}

/**
 * Apple's required disclosure for auto-renewing subscriptions (App Review
 * guideline 3.1.2): who charges, that it renews, and how to stop it.
 */
function appleRenewalTerms(): string {
  return t('paywall.appleRenewalTerms');
}

/** Small print under the button for the chosen plan. */
export function footerCopy(plan: PremiumPlan, price: string, trialDays?: number): string {
  const base = trialDays
    ? t('paywall.trialFooter', { count: trialDays, price, store: storeName() })
    : planCopy(plan).footer;
  return IS_IOS && plan !== 'lifetime' ? `${base} ${appleRenewalTerms()}` : base;
}

/** The buy button while the win-back discount is selected. */
export function winbackCta(offer: LiveWinbackOffer): { label: string; sublabel: string } {
  return {
    label: t('paywall.winback.cta', { percent: offer.percentOff }),
    sublabel: t('paywall.winback.ctaSub', { price: offer.price }),
  };
}

/** Small print under the button for the win-back discount. */
export function winbackFooter(offer: LiveWinbackOffer): string {
  const base = t('paywall.winback.footer', {
    price: offer.price,
    fullPrice: offer.fullPrice,
    store: storeName(),
    settings: inSubscriptionSettings(),
  });
  return IS_IOS ? `${base} ${appleRenewalTerms()}` : base;
}

/** Terms of Use and Privacy Policy links, required under a subscription offer. */
function LegalLinks() {
  const links = [
    { label: t('paywall.legal.terms'), url: TERMS_OF_USE_URL },
    { label: t('paywall.legal.privacy'), url: PRIVACY_POLICY_URL },
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
  if (plan === 'yearly') {
    return save ? t('paywall.badge.save', { percent: save }) : t('paywall.badge.bestValue');
  }
  if (plan === 'monthly' && trialDays) {
    return t('paywall.badge.trial', { length: trialLength(trialDays) });
  }
  return undefined;
}

/** The muted line at the foot of a plan card: the yearly plan's per-month cost. */
export function planSubline(plan: PremiumPlan, yearly: Money | undefined): string | undefined {
  if (plan === 'yearly') return yearly ? yearlyPerMonthLabel(yearly) : undefined;
  return undefined;
}

/**
 * A store price label split for a plan card: the amount large, the period
 * small beneath it ("£2.49 / month" → "£2.49" + "/ month"). Labels without a
 * known period stay whole.
 */
export function splitPrice(label: string): { amount: string; period: string } {
  // The cadence words are the current language's (see planPriceLabel).
  const periods = [
    t('paywall.period.monthly'),
    t('paywall.period.yearly'),
    t('paywall.period.lifetime'),
  ];
  for (const period of periods) {
    if (label.endsWith(period) && label.length > period.length) {
      return { amount: label.slice(0, -period.length).trimEnd(), period };
    }
  }
  return { amount: label, period: '' };
}

/**
 * One selectable plan, as a column card: a ribbon (saving or free trial)
 * across the top edge, the plan name, the price large with its period small
 * beneath, and a muted line at the foot. A plan with a free trial leads with
 * "Free" and moves its price into "then …".
 */
function PlanOption({
  plan,
  price,
  badge,
  subline,
  trialDays,
  offerPrice,
  selected,
  onSelect,
}: {
  plan: PremiumPlan;
  price: string;
  badge?: string;
  subline?: string;
  trialDays?: number;
  /** A win-back discount on this plan's first period: shown large, the usual price struck through. */
  offerPrice?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const copy = planCopy(plan);
  const trialNote = trialDays
    ? t('paywall.card.a11yTrial', { length: trialLength(trialDays) })
    : offerPrice
      ? t('paywall.card.a11yOffer', { price: offerPrice })
      : '';
  const { amount, period } = splitPrice(price);
  return (
    <Pressable
      onPress={onSelect}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${copy.title}, ${trialNote}${price}${subline ? `, ${subline}` : ''}`}
      testID={`paywall-plan-${plan}`}
      className={
        selected
          ? 'flex-1 items-center border-2 border-accent bg-accent/10 px-1.5 pb-2.5 pt-4'
          : 'flex-1 items-center border border-hair bg-bg-overlay px-1.5 pb-2.5 pt-4'
      }
    >
      {badge !== undefined && (
        <View
          className={`absolute -top-2.5 px-1.5 py-0.5 ${selected ? 'bg-accent' : 'bg-bg-raised'}`}
          style={{ maxWidth: '94%' }}
          testID={`paywall-badge-${plan}`}
        >
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            className={`text-[10px] font-extrabold uppercase tracking-wide ${
              selected ? '' : 'text-ink-muted'
            }`}
            style={{ includeFontPadding: false, ...(selected ? { color: '#1D1712' } : {}) }}
          >
            {badge}
          </Text>
        </View>
      )}
      <View
        className={`absolute left-1.5 top-1.5 h-3.5 w-3.5 items-center justify-center rounded-full border-2 ${
          selected ? 'border-accent' : 'border-hair'
        }`}
      >
        {selected && <View className="h-1.5 w-1.5 rounded-full bg-accent" />}
      </View>

      <Text className="text-sm font-bold text-ink-primary">{copy.title}</Text>
      {offerPrice ? (
        <>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            className="mt-1 text-xl font-extrabold text-accent"
            testID={`paywall-offer-${plan}`}
          >
            {offerPrice}
          </Text>
          <Text className="text-[11px] font-semibold text-ink-primary">{t('paywall.card.firstYear')}</Text>
          <Text className="mt-1 text-center text-[11px] text-ink-muted line-through">{price}</Text>
        </>
      ) : trialDays ? (
        <>
          <Text className="mt-1 text-xl font-extrabold text-accent" testID={`paywall-free-${plan}`}>
            {t('paywall.card.free')}
          </Text>
          <Text className="text-center text-[11px] font-semibold text-ink-primary">
            {t('paywall.card.forDays', { count: trialDays })}
          </Text>
          <Text className="mt-1 text-center text-[11px] text-ink-muted">{t('paywall.cta.thenPrice', { price })}</Text>
        </>
      ) : (
        <>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            className="mt-1 text-xl font-extrabold text-ink-primary"
          >
            {amount}
          </Text>
          {period !== '' && <Text className="text-[11px] text-ink-muted">{period}</Text>}
        </>
      )}
      {subline !== undefined && (
        <Text
          className="mt-1.5 text-center text-[11px] leading-tight text-ink-secondary"
          testID={`paywall-subline-${plan}`}
        >
          {subline}
        </Text>
      )}
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
  const params = useLocalSearchParams<{ source?: string; category?: string; era?: string }>();
  const source = parsePaywallSource(params.source);
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
  const { winback } = usePremium();
  const { offer: liveOffer, now, markShown } = useWinbackOffer();
  // The win-back discount applies only when the paywall was opened for it.
  const offer: LiveWinbackOffer | null = source === 'winback' ? liveOffer : null;
  const offerPlan = offer && plan === 'yearly';

  useEffect(() => {
    track('paywall_viewed', { source });
  }, [source]);
  useEffect(() => {
    if (offer) markShown();
  }, [offer, markShown]);

  const selectPlan = (p: PremiumPlan) => {
    if (p !== plan) track('paywall_plan_selected', { plan: p, source });
    setPlan(p);
  };

  // Leaving without buying — the close button, Android back or a swipe — is a
  // dismissal: reported for the funnel, and the first one starts the win-back
  // clock. `beforeRemove` sees every way out; a purchase or restore marks
  // itself first so it doesn't count.
  const navigation = useNavigation();
  const left = useRef(false);
  const discount = winback && priceAmounts.yearly ? percentOff(priceAmounts.yearly.amount, winback.amount) : 0;
  useEffect(
    () =>
      navigation.addListener('beforeRemove', () => {
        if (left.current || isPremium) return;
        left.current = true;
        track('paywall_dismissed', {
          source,
          seconds: Math.round((Date.now() - now) / 1000),
          plan,
        });
        void recordPaywallDismissal(discount);
      }),
    [navigation, source, isPremium, now, plan, discount],
  );

  const selectedTrial = trialDays[plan];
  const offeredTrial = anyTrialDays(trialDays);
  const headline = offer
    ? t('paywall.winback.headline', { percent: offer.percentOff })
    : offeredTrial
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
    const result = offerPlan
      ? await purchase(plan, source, { winback: true })
      : await purchase(plan, source);
    setBusy(false);
    if (result === 'purchased') {
      left.current = true;
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
      setNotice(t('paywall.notice.unavailable'));
    } else if (result === 'error') {
      setNotice(t('paywall.notice.error'));
    }
  };

  const onRestore = async () => {
    setBusy(true);
    setNotice(null);
    const ok = await restore();
    setBusy(false);
    if (ok) {
      left.current = true;
      close();
    }
    else {
      setNotice(
        billingAvailable ? t('paywall.notice.noSubscription') : t('paywall.notice.unavailable'),
      );
    }
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
          {isPremium ? t('paywall.youArePremium') : headline}
        </Text>
        {offer && !isPremium && (
          <Text className="-mt-2 text-sm font-bold text-accent" testID="paywall-offer-ends">
            {t('paywall.winback.endsIn', { count: daysLeft(offer.endsAt, now) })}
          </Text>
        )}

        {!isPremium && !offer && (
          <PersonalPitch
            source={source}
            categoryId={paramValue(params.category)}
            eraId={paramValue(params.era)}
          />
        )}

        <View className="gap-1.5">
          {lead.map((b) => (
            <LeadBenefit key={b.id} benefit={b} />
          ))}
        </View>

        {isPremium ? (
          <View className="gap-3">
            <View className="border border-hair bg-bg-overlay px-4 py-3">
              <Text className="text-center text-sm font-semibold text-ink-primary">
                {t('paywall.subscriptionActive')}
              </Text>
            </View>
            <Button label={t('paywall.done')} onPress={close} testID="paywall-done" />
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
            {/* Three plans side by side; the top padding leaves room for the ribbons. */}
            <View className="flex-row gap-2 pt-2.5" accessibilityRole="radiogroup">
              {PLAN_ORDER.map((p) => (
                <PlanOption
                  key={p}
                  plan={p}
                  price={priceLabels[p]}
                  badge={
                    offer && p === 'yearly'
                      ? t('paywall.badge.percentOff', { percent: offer.percentOff })
                      : planBadge(p, { trialDays: trialDays[p], save })
                  }
                  offerPrice={offer && p === 'yearly' ? offer.price : undefined}
                  subline={planSubline(p, priceAmounts.yearly)}
                  trialDays={trialDays[p]}
                  selected={p === plan}
                  onSelect={() => selectPlan(p)}
                />
              ))}
            </View>
            {selectedTrial ? (
              <TrialTimeline trialDays={selectedTrial} priceLabel={priceLabels[plan]} />
            ) : null}
            <Text className="text-center text-xs text-ink-muted">
              {offer && offerPlan
                ? winbackFooter(offer)
                : footerCopy(plan, priceLabels[plan], selectedTrial)}
            </Text>
          </View>
        )}

        <View className="mt-3 gap-4 border-t border-hair pt-5">
          <Text className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {t('paywall.alsoInPremium')}
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
              ? { label: t('paywall.cta.pleaseWait') }
              : offer && offerPlan
                ? winbackCta(offer)
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
                ? t('paywall.trust.lifetime')
                : t('paywall.trust.cancelAnytime', { store: STORE_LABEL })}
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
                {t('paywall.restore')}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </Screen>
  );
}

