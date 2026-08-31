import { Platform } from 'react-native';
import type PurchasesType from 'react-native-purchases';
import type { CustomerInfo } from 'react-native-purchases';

/**
 * Billing adapter boundary. The app only ever talks to `billing`; the store
 * integration lives entirely in this file.
 *
 * Production: RevenueCat (`react-native-purchases`) fronting Google Play
 * Billing. It is selected whenever a RevenueCat public SDK key is present in
 * the build (`EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`, set in the EAS environment).
 * The RevenueCat dashboard must define:
 *   - entitlement  `premium`
 *   - product      `premium_monthly` (Play subscription, base plan `monthly`)
 *   - offering     `default` with a Monthly package pointing at that product
 * RevenueCat validates receipts server-side, so the app never trusts a client
 * purchase on its own — `entitlements.active.premium` is the source of truth.
 *
 * Without a key: dev builds simulate an instant purchase so the gated
 * experience can be tested end to end; production builds report purchases as
 * unavailable (the paywall says so instead of failing silently).
 */

export type PurchaseResult = 'purchased' | 'cancelled' | 'unavailable' | 'error';

export const ENTITLEMENT_ID = 'premium';

export interface BillingAdapter {
  /** False when no store is wired up in this build. */
  readonly available: boolean;
  /** Start the monthly subscription purchase flow. */
  purchaseMonthly(): Promise<PurchaseResult>;
  /** Re-check the store for an existing subscription; true if one is active. */
  restore(): Promise<boolean>;
  /**
   * Whether the subscription is active right now according to the store;
   * `null` when the store can't be reached (keep the cached answer).
   */
  checkActive(): Promise<boolean | null>;
  /**
   * Notify on entitlement changes — renewals, expiries, refunds, purchases
   * made on another device. Returns an unsubscribe function.
   */
  onChange(listener: (active: boolean) => void): () => void;
  /**
   * Tell the store who the player is (the Firebase uid) so entitlements —
   * including ones granted server-side, e.g. for Play reviewers — follow the
   * account across installs. `null` returns the store to an anonymous user.
   */
  identify(uid: string | null): Promise<void>;
  /**
   * The store's localized price string for the monthly plan (e.g. "£2.49",
   * "₹99.00"), exactly as Google Play will charge this user. `null` when the
   * store can't say (offline, no store in this build) — show the fallback.
   */
  localizedPrice(): Promise<string | null>;
}

/** No store configured: every attempt reports "unavailable". */
export const unavailableBilling: BillingAdapter = {
  available: false,
  purchaseMonthly: async () => 'unavailable',
  restore: async () => false,
  checkActive: async () => null,
  onChange: () => () => undefined,
  identify: async () => undefined,
  localizedPrice: async () => null,
};

/** Dev-only stand-in that "sells" the subscription instantly. */
export const devBilling: BillingAdapter = {
  available: true,
  purchaseMonthly: async () => 'purchased',
  restore: async () => false,
  checkActive: async () => null,
  onChange: () => () => undefined,
  identify: async () => undefined,
  localizedPrice: async () => null,
};

/* ------------------------------------------------------------------------ */
/* RevenueCat                                                                */
/* ------------------------------------------------------------------------ */

// Expo inlines EXPO_PUBLIC_* only for literal dot-notation references.
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;

export function revenueCatKey(): string | undefined {
  const key = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY;
  return key && key.length > 0 ? key : undefined;
}

type Purchases = typeof PurchasesType;

/**
 * Loaded lazily so a build that lacks the native module (an older dev client,
 * Jest) never throws at import time — Metro treats module-eval throws as fatal.
 */
function loadPurchases(): Purchases | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-purchases') as { default: Purchases };
    return mod.default ?? null;
  } catch {
    return null;
  }
}

let configured: Purchases | null = null;

function purchases(): Purchases | null {
  if (configured) return configured;
  const key = revenueCatKey();
  const P = loadPurchases();
  if (!key || !P) return null;
  try {
    P.configure({ apiKey: key });
    configured = P;
  } catch {
    return null;
  }
  return configured;
}

function isActive(info: CustomerInfo): boolean {
  return info.entitlements.active[ENTITLEMENT_ID] !== undefined;
}

export const revenueCatBilling: BillingAdapter = {
  available: true,

  async purchaseMonthly() {
    const P = purchases();
    if (!P) return 'unavailable';
    try {
      const offerings = await P.getOfferings();
      const current = offerings.current;
      const pkg = current?.monthly ?? current?.availablePackages[0];
      if (!pkg) return 'unavailable';
      const { customerInfo } = await P.purchasePackage(pkg);
      return isActive(customerInfo) ? 'purchased' : 'error';
    } catch (error) {
      if ((error as { userCancelled?: boolean }).userCancelled) return 'cancelled';
      return 'error';
    }
  },

  async restore() {
    const P = purchases();
    if (!P) return false;
    try {
      return isActive(await P.restorePurchases());
    } catch {
      return false;
    }
  },

  async checkActive() {
    const P = purchases();
    if (!P) return null;
    try {
      return isActive(await P.getCustomerInfo());
    } catch {
      return null;
    }
  },

  onChange(listener) {
    const P = purchases();
    if (!P) return () => undefined;
    const handler = (info: CustomerInfo) => listener(isActive(info));
    P.addCustomerInfoUpdateListener(handler);
    return () => {
      P.removeCustomerInfoUpdateListener(handler);
    };
  },

  async identify(uid) {
    const P = purchases();
    if (!P) return;
    try {
      if (uid) await P.logIn(uid);
      else await P.logOut();
    } catch {
      // Identity is best-effort; the anonymous store user keeps working.
    }
  },

  async localizedPrice() {
    const P = purchases();
    if (!P) return null;
    try {
      // Same package the purchase flow buys, so the label can never disagree
      // with the sheet Google shows.
      const offerings = await P.getOfferings();
      const current = offerings.current;
      const pkg = current?.monthly ?? current?.availablePackages[0];
      return pkg?.product.priceString ?? null;
    } catch {
      return null;
    }
  },
};

/** Pick the adapter for this build: real store when a key is present. */
export function selectBilling(key: string | undefined, isDev: boolean): BillingAdapter {
  if (key) return revenueCatBilling;
  return isDev ? devBilling : unavailableBilling;
}

export const billing: BillingAdapter = selectBilling(revenueCatKey(), __DEV__);
