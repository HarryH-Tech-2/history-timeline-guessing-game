/** Words used across many screens. */
export const common = {
  on: 'On',
  off: 'Off',
  cancel: 'Cancel',
  save: 'Save',
  close: 'Close',
  continue: 'Continue',
  back: 'Back',
  day: { one: '{count} day', other: '{count} days' },
  coins: { one: '{count} coin', other: '{count} coins' },
  unlimitedCoins: 'Unlimited coins',
  level: 'Level {level}',
  /** Era word after a negative year: "450 BCE". */
  bce: 'BCE',
};

export const tabs = {
  play: 'Play',
  campaign: 'Campaign',
  museum: 'Museum',
  social: 'Social',
  profile: 'Profile',
};

/**
 * Store names as they read mid-sentence. Kept per platform because Apple
 * rejects apps that mention Google Play on iOS.
 */
export const store = {
  nameIos: 'the App Store',
  nameAndroid: 'Google Play',
  /** Always follows a verb like "cancel", so it carries its own "in". */
  inSubscriptionSettingsIos: 'in your App Store subscriptions (Settings → Apple Account → Subscriptions)',
  inSubscriptionSettingsAndroid: 'in your Play subscriptions',
  backupProvidersIos: 'Apple or Google',
  backupProvidersAndroid: 'Google',
  backupButtonIos: 'Back up my progress',
  backupButtonAndroid: 'Back up to Google',
};
