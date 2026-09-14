import { Linking } from 'react-native';

import { openStoreListing, STORE_LISTING_URL } from './storeListing';

describe('openStoreListing', () => {
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
