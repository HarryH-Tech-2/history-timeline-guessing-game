import { Platform } from 'react-native';

/**
 * Which store this build is sold through, and the copy and links that go with
 * it. Apple rejects apps that mention other platforms, so nothing player-facing
 * may say "Google Play" on iOS: every such string reads from here.
 */
export const IS_IOS = Platform.OS === 'ios';

/** The store, as it reads mid-sentence: "through Google Play", "through the App Store". */
export const STORE_NAME = IS_IOS ? 'the App Store' : 'Google Play';

/** Short store label for tight spots such as the share card footer. */
export const STORE_LABEL = IS_IOS ? 'App Store' : 'Google Play';

/** Where the player cancels a subscription. */
export const SUBSCRIPTION_SETTINGS = IS_IOS
  ? 'your App Store subscriptions (Settings → Apple Account → Subscriptions)'
  : 'your Play subscriptions';

export const PLAY_LISTING_URL =
  'https://play.google.com/store/apps/details?id=com.harryhh.historydateguesser';

/**
 * Numeric App Store id, shown in App Store Connect → App Information → Apple
 * ID once the app record exists. Until it is filled in, iOS builds leave the
 * store link off shares and use the native review sheet for "Rate us".
 */
export const APP_STORE_ID = '';

export const APP_STORE_URL = APP_STORE_ID ? `https://apps.apple.com/app/id${APP_STORE_ID}` : null;

/** This platform's listing, or null on iOS until the App Store id is known. */
export const STORE_LISTING_URL: string | null = IS_IOS ? APP_STORE_URL : PLAY_LISTING_URL;

/**
 * Legal pages linked from the paywall; an empty URL hides its link. Apple
 * requires both for auto-renewing subscriptions: on iOS the terms are Apple's
 * standard licence (EULA). The privacy policy must be the app's own — paste
 * the same URL as the Play listing's.
 */
export const PRIVACY_POLICY_URL = '';
export const TERMS_OF_USE_URL = IS_IOS
  ? 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/'
  : '';

/** Account providers offered for backing up progress, as they read in copy. */
export const BACKUP_PROVIDERS = IS_IOS ? 'Apple or Google' : 'Google';

/** The back-up button's label. */
export const BACKUP_BUTTON_LABEL = IS_IOS ? 'Back up my progress' : 'Back up to Google';
