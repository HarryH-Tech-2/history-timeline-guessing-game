import { devBilling, revenueCatBilling, selectBilling, unavailableBilling } from './billing';

describe('billing adapter selection', () => {
  it('uses RevenueCat whenever a public SDK key is present', () => {
    expect(selectBilling('goog_test', true)).toBe(revenueCatBilling);
    expect(selectBilling('goog_test', false)).toBe(revenueCatBilling);
  });

  it('simulates purchases in dev builds without a key', () => {
    expect(selectBilling(undefined, true)).toBe(devBilling);
  });

  it('reports purchases unavailable in production builds without a key', () => {
    expect(selectBilling(undefined, false)).toBe(unavailableBilling);
  });

  it('never grants access without a store when unconfigured', async () => {
    // No key in the test environment, so the RevenueCat adapter must fail closed.
    expect(await revenueCatBilling.purchaseMonthly()).toBe('unavailable');
    expect(await revenueCatBilling.restore()).toBe(false);
    expect(await revenueCatBilling.checkActive()).toBeNull();
    expect(await unavailableBilling.purchaseMonthly()).toBe('unavailable');
  });

  it('reports no localized price without a store, so the fallback label shows', async () => {
    expect(await revenueCatBilling.localizedPrice()).toBeNull();
    expect(await devBilling.localizedPrice()).toBeNull();
    expect(await unavailableBilling.localizedPrice()).toBeNull();
  });
});

describe('store identity', () => {
  it('is a no-op on adapters without a store', async () => {
    await expect(devBilling.identify('uid-1')).resolves.toBeUndefined();
    await expect(unavailableBilling.identify('uid-1')).resolves.toBeUndefined();
    await expect(revenueCatBilling.identify('uid-1')).resolves.toBeUndefined();
  });

  it('logs the Firebase user into RevenueCat so entitlements follow the account', async () => {
    const logIn = jest.fn().mockResolvedValue({});
    const logOut = jest.fn().mockResolvedValue({});
    jest.doMock('react-native-purchases', () => ({
      __esModule: true,
      default: { configure: jest.fn(), logIn, logOut },
    }));
    // Jest's RN preset reports Platform.OS as 'ios'; cover both key slots.
    process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY = 'goog_test';
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = 'appl_test';
    try {
      let adapter!: typeof revenueCatBilling;
      jest.isolateModules(() => {
        adapter = (require('./billing') as typeof import('./billing')).revenueCatBilling;
      });
      await adapter.identify('firebase-uid');
      expect(logIn).toHaveBeenCalledWith('firebase-uid');
      await adapter.identify(null);
      expect(logOut).toHaveBeenCalledTimes(1);
    } finally {
      delete process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
      delete process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
      jest.dontMock('react-native-purchases');
    }
  });
});
