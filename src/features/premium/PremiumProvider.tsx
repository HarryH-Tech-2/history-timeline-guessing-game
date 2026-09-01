import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { setPremiumUnlocked } from '@/data';
import { requestReviewAfterFirstPurchase } from '@/features/review';
import { useAuth } from '@/services/firebase/auth';

import { billing, devBilling, type PremiumPlan, type PurchaseResult } from './billing';
import { INITIAL_PREMIUM, PREMIUM_PLAN_LABELS, premiumStore, type PremiumState } from './entitlement';

export interface PremiumApi {
  isPremium: boolean;
  /** True until the cached entitlement has been read on launch. */
  isLoading: boolean;
  /** Whether this build can actually take payment. */
  billingAvailable: boolean;
  /** Display price per plan; the store's localized price once it loads. */
  priceLabels: Record<PremiumPlan, string>;
  purchase: (plan: PremiumPlan) => Promise<PurchaseResult>;
  restore: () => Promise<boolean>;
  /** Dev builds only: drop the entitlement to test the free experience. */
  revokeForTesting: () => void;
}

const OFFLINE_API: PremiumApi = {
  isPremium: false,
  isLoading: false,
  billingAvailable: false,
  priceLabels: PREMIUM_PLAN_LABELS,
  purchase: async () => 'unavailable',
  restore: async () => false,
  revokeForTesting: () => undefined,
};

/** How a plan's bare store price ("£2.49") reads as a cadence label. */
const PLAN_SUFFIX: Record<PremiumPlan, string> = {
  monthly: ' / month',
  yearly: ' / year',
  lifetime: ' once',
};

const PremiumContext = createContext<PremiumApi>(OFFLINE_API);

/**
 * Owns the Premium entitlement: reads the cached state on launch, drives the
 * purchase/restore flows through the billing adapter, persists the outcome,
 * and mirrors the flag into the data layer so question pools respect it.
 */
export function PremiumProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PremiumState>(INITIAL_PREMIUM);
  const [isLoading, setIsLoading] = useState(true);
  const [priceLabels, setPriceLabels] = useState(PREMIUM_PLAN_LABELS);
  const { uid } = useAuth();

  // Show the store's own localized prices ("£2.49 / month", "₹499.00 once")
  // so Play Console stays the single source of pricing truth. The hardcoded
  // labels are only placeholders while offerings load or without a store.
  useEffect(() => {
    if (!billing.available || billing === devBilling) return;
    let cancelled = false;
    void billing.localizedPrices().then((prices) => {
      if (cancelled) return;
      setPriceLabels((fallback) => {
        const next = { ...fallback };
        for (const plan of Object.keys(PLAN_SUFFIX) as PremiumPlan[]) {
          const price = prices[plan];
          if (price) next[plan] = `${price}${PLAN_SUFFIX[plan]}`;
        }
        return next;
      });
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

  useEffect(() => {
    setPremiumUnlocked(state.active);
  }, [state.active]);

  // Keep the store's idea of "who" in step with the Firebase account, then
  // re-read the entitlement: signing into an account that already holds
  // Premium (a renewal on another device, or one granted in the RevenueCat
  // dashboard for Play reviewers) must unlock without a purchase or restore.
  useEffect(() => {
    if (!uid || !billing.available || billing === devBilling) return;
    let cancelled = false;
    void (async () => {
      await billing.identify(uid);
      const active = await billing.checkActive();
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

  const purchase = useCallback(async (plan: PremiumPlan): Promise<PurchaseResult> => {
    const result = await billing.purchase(plan);
    if (result === 'purchased') {
      commit({ active: true, source: billing === devBilling ? 'dev' : 'store' });
      // Google's in-app review sheet, once, on the first successful purchase.
      void requestReviewAfterFirstPurchase();
    }
    return result;
  }, [commit]);

  const restore = useCallback(async (): Promise<boolean> => {
    const active = await billing.restore();
    if (active) commit({ active: true, source: 'store' });
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
      priceLabels,
      purchase,
      restore,
      revokeForTesting,
    }),
    [state.active, isLoading, priceLabels, purchase, restore, revokeForTesting],
  );

  return <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>;
}

/** Read the Premium entitlement. Safe without a provider (always free). */
export function usePremium(): PremiumApi {
  return useContext(PremiumContext);
}
