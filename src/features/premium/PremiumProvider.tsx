import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { cancelWinbackReminder } from '@/features/reminders/scheduler';
import { requestReviewAfterFirstPurchase } from '@/features/review';
import { track, type PaywallSource, type PurchaseOffer } from '@/services/analytics';
import { useAuth } from '@/services/firebase/auth';

import { billing, devBilling, type PremiumPlan, type PurchaseResult, type WinbackPrice } from './billing';
import type { Money } from './paywallPricing';
import { afterPurchase, winbackStore } from './winback';
import { INITIAL_PREMIUM, premiumPlanLabels, premiumStore, type PremiumState } from './entitlement';

export interface PremiumApi {
  isPremium: boolean;
  /** True until the cached entitlement has been read on launch. */
  isLoading: boolean;
  /** Whether this build can actually take payment. */
  billingAvailable: boolean;
  /**
   * Display price per plan; the store's localized price once it loads, with
   * its cadence ("/ month") in the current language.
   */
  priceLabels: Record<PremiumPlan, string>;
  /** Free-trial length per plan, in days, for plans the store offers one on. */
  trialDays: Partial<Record<PremiumPlan, number>>;
  /**
   * The store's numeric price and currency per plan, for derived figures such
   * as the yearly plan's per-month cost. Absent until (and unless) the store says.
   */
  priceAmounts: Partial<Record<PremiumPlan, Money>>;
  /**
   * The yearly plan's win-back discount, when Play offers one to this player.
   * Whether it's on show right now is the win-back timing's call (winback.ts).
   */
  winback: WinbackPrice | null;
  /**
   * Buy `plan`; `source` is where the paywall was opened from, for
   * attribution. With `winback`, buy the plan's win-back offer.
   */
  purchase: (
    plan: PremiumPlan,
    source?: PaywallSource,
    options?: { winback?: boolean },
  ) => Promise<PurchaseResult>;
  restore: () => Promise<boolean>;
  /** Dev builds only: drop the entitlement to test the free experience. */
  revokeForTesting: () => void;
}

const OFFLINE_API: PremiumApi = {
  isPremium: false,
  isLoading: false,
  billingAvailable: false,
  // A getter: the cadence words must follow the language at read time.
  get priceLabels() {
    return premiumPlanLabels();
  },
  trialDays: {},
  priceAmounts: {},
  winback: null,
  purchase: async () => 'unavailable',
  restore: async () => false,
  revokeForTesting: () => undefined,
};

const PLANS: readonly PremiumPlan[] = ['monthly', 'yearly', 'lifetime'];

const PremiumContext = createContext<PremiumApi>(OFFLINE_API);

/**
 * Owns the Premium entitlement: reads the cached state on launch, drives the
 * purchase/restore flows through the billing adapter, persists the outcome,
 * and mirrors the flag into the data layer so question pools respect it.
 */
export function PremiumProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PremiumState>(INITIAL_PREMIUM);
  const [isLoading, setIsLoading] = useState(true);
  /** The store's bare prices ("£2.49"); the cadence is added on read. */
  const [storePrices, setStorePrices] = useState<Partial<Record<PremiumPlan, string>>>({});
  const [trialDays, setTrialDays] = useState<Partial<Record<PremiumPlan, number>>>({});
  const [priceAmounts, setPriceAmounts] = useState<Partial<Record<PremiumPlan, Money>>>({});
  const [winback, setWinback] = useState<WinbackPrice | null>(null);
  const { uid } = useAuth();

  // Show the store's own localized prices ("£2.49 / month", "₹499.00 once")
  // so Play Console stays the single source of pricing truth. The hardcoded
  // labels are only placeholders while offerings load or without a store.
  useEffect(() => {
    if (!billing.available || billing === devBilling) return;
    let cancelled = false;
    void billing.localizedPrices().then((prices) => {
      if (cancelled) return;
      const bare: Partial<Record<PremiumPlan, string>> = {};
      for (const plan of PLANS) {
        const price = prices[plan]?.price;
        if (price) bare[plan] = price;
      }
      setStorePrices(bare);
      const trials: Partial<Record<PremiumPlan, number>> = {};
      for (const plan of PLANS) {
        const days = prices[plan]?.trialDays;
        if (days) trials[plan] = days;
      }
      setTrialDays(trials);
      const amounts: Partial<Record<PremiumPlan, Money>> = {};
      for (const plan of PLANS) {
        const { amount, currencyCode } = prices[plan] ?? {};
        if (typeof amount === 'number' && amount > 0 && currencyCode) {
          amounts[plan] = { amount, currencyCode };
        }
      }
      setPriceAmounts(amounts);
      setWinback(prices.yearly?.winback ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: () => void = () => undefined;

    const fromStore = (active: boolean): PremiumState =>
      active ? { active: true, source: 'store' } : INITIAL_PREMIUM;

    void premiumStore.read().then(async (loaded) => {
      if (cancelled) return;
      // A dev unlock must never survive into a production build.
      const cached = loaded.source === 'dev' && !__DEV__ ? INITIAL_PREMIUM : loaded;
      setState(cached);
      setIsLoading(false);

      // The store is the source of truth: confirm (or revoke) the cached
      // entitlement on launch, then track renewals/expiries while running.
      // Offline the check returns null and the cache stands.
      if (!billing.available || billing === devBilling) return;
      const active = await billing.checkActive();
      if (cancelled) return;
      if (active !== null && active !== cached.active) {
        const next = fromStore(active);
        setState(next);
        void premiumStore.write(next);
      }
      unsubscribe = billing.onChange((nowActive) => {
        const next = fromStore(nowActive);
        setState(next);
        void premiumStore.write(next);
      });
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  // Keep the store's idea of "who" in step with the Firebase account, then
  // re-read the entitlement: signing into an account that already holds
  // Premium (a renewal on another device, or one granted in the RevenueCat
  // dashboard for Play reviewers) must unlock without a purchase or restore.
  //
  // When the account holds nothing, ask Play once what THIS device's Google
  // account owns: a reinstall or new phone starts as a brand-new guest that
  // the store has never seen, and the player's purchase would otherwise sit
  // behind the Restore button until they found it.
  const restoredFor = useRef<string | null>(null);
  useEffect(() => {
    if (!uid || !billing.available || billing === devBilling) return;
    let cancelled = false;
    void (async () => {
      await billing.identify(uid);
      let active = await billing.checkActive();
      if (active === false && restoredFor.current !== uid) {
        restoredFor.current = uid;
        if (await billing.restore()) active = true;
      }
      if (cancelled || active === null) return;
      setState((prev) => {
        if (active === prev.active) return prev;
        const next: PremiumState = active ? { active: true, source: 'store' } : INITIAL_PREMIUM;
        void premiumStore.write(next);
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const commit = useCallback((next: PremiumState) => {
    setState(next);
    void premiumStore.write(next);
  }, []);

  const purchase = useCallback(async (
    plan: PremiumPlan,
    source: PaywallSource = 'unknown',
    options?: { winback?: boolean },
  ): Promise<PurchaseResult> => {
    const offer: PurchaseOffer = options?.winback
      ? 'winback'
      : trialDays[plan]
        ? 'trial'
        : 'standard';
    track('purchase_started', { plan, source, offer });
    const result = await billing.purchase(plan, options?.winback ? { winback: true } : undefined);
    if (result === 'purchased') {
      commit({ active: true, source: billing === devBilling ? 'dev' : 'store' });
      track('purchase_completed', { plan, source, offer });
      // Bought: the win-back offer (and its reminder) is finished either way.
      void winbackStore.read().then((w) => winbackStore.write(afterPurchase(w)));
      void cancelWinbackReminder();
      // Google's in-app review sheet, once, on the first successful purchase.
      void requestReviewAfterFirstPurchase();
    } else {
      track('purchase_failed', { plan, source, offer, reason: result });
    }
    return result;
  }, [commit, trialDays]);

  const restore = useCallback(async (): Promise<boolean> => {
    const active = await billing.restore();
    if (active) {
      commit({ active: true, source: 'store' });
      track('purchase_restored');
    }
    return active;
  }, [commit]);

  const revokeForTesting = useCallback(() => {
    if (__DEV__) commit(INITIAL_PREMIUM);
  }, [commit]);

  const value = useMemo<PremiumApi>(
    () => ({
      isPremium: state.active,
      isLoading,
      billingAvailable: billing.available,
      // A getter, so screens remounted by a language change get the new
      // cadence words ("/ mês") without this provider re-rendering.
      get priceLabels() {
        return premiumPlanLabels(storePrices);
      },
      trialDays,
      priceAmounts,
      winback,
      purchase,
      restore,
      revokeForTesting,
    }),
    [
      state.active,
      isLoading,
      storePrices,
      trialDays,
      priceAmounts,
      winback,
      purchase,
      restore,
      revokeForTesting,
    ],
  );

  return <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>;
}

/** Read the Premium entitlement. Safe without a provider (always free). */
export function usePremium(): PremiumApi {
  return useContext(PremiumContext);
}
