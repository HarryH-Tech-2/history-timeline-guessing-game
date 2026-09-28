import * as StoreReview from 'expo-store-review';
import { Linking, Platform } from 'react-native';

import { openStoreListing, STORE_LISTING_URL } from './storeListing';

jest.mock('expo-store-review', () => ({ requestReview: jest.fn(async () => undefined) }));

describe('openStoreListing on Android', () => {
  beforeAll(() => jest.replaceProperty(Platform, 'OS', 'android'));
  afterAll(() => jest.restoreAllMocks());
  const canOpen = jest.spyOn(Linking, 'canOpenURL');
  const open = jest.spyOn(Linking, 'openURL');

  beforeEach(() => {
    canOpen.mockReset();
    open.mockReset().mockResolvedValue(true);
  });

  it('opens the Play app directly when it can', async () => {
    canOpen.mockResolvedValue(true);
    await openStoreListing();
    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith('market://details?id=com.harryhh.historydateguesser');
  });

  it('falls back to the web listing when there is no store app', async () => {
    canOpen.mockResolvedValue(false);
    await openStoreListing();
    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith(STORE_LISTING_URL);
  });

  it('falls back to the web listing when the deep link throws', async () => {
    canOpen.mockRejectedValue(new Error('no handler'));
    await openStoreListing();
    expect(open).toHaveBeenCalledWith(STORE_LISTING_URL);
  });

  it('never rejects, even when nothing can open', async () => {
    canOpen.mockResolvedValue(false);
    open.mockRejectedValue(new Error('blocked'));
    await expect(openStoreListing()).resolves.toBeUndefined();
  });
});

describe('openStoreListing on iOS', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    jest.spyOn(Linking, 'openURL').mockClear().mockResolvedValue(true);
    jest.mocked(StoreReview.requestReview).mockClear();
  });
  afterEach(() => jest.restoreAllMocks());

  it('asks for the native review sheet until the App Store id is known, never Play', async () => {
    await openStoreListing();
    expect(StoreReview.requestReview).toHaveBeenCalledTimes(1);
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it('opens the App Store review page once the app id is known', async () => {
    let open: () => Promise<void> = async () => {};
    jest.isolateModules(() => {
      jest.doMock('@/config/store', () => ({
        ...jest.requireActual('@/config/store'),
        APP_STORE_ID: '123456789',
      }));
      open = require('./storeListing').openStoreListing;
    });
    const spy = jest.spyOn(require('react-native').Linking, 'openURL').mockResolvedValue(true);
    await open();
    expect(spy).toHaveBeenCalledWith('itms-apps://apps.apple.com/app/id123456789?action=write-review');
  });
});
