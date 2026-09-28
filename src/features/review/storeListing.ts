import * as StoreReview from 'expo-store-review';
import { Linking, Platform } from 'react-native';

import { APP_STORE_ID, PLAY_LISTING_URL } from '@/config/store';

/** This platform's listing, where an explicit "rate us" tap should land. */
export const STORE_LISTING_URL = PLAY_LISTING_URL;

/** Deep link straight into the Play app; falls back to the web listing. */
const STORE_DEEP_LINK = 'market://details?id=com.harryhh.historydateguesser';

/**
 * Open the store listing so the player can leave a rating. Used for the
 * deliberate "Rate us" tap in Settings: unlike the in-app review sheet, which
 * the store may silently decline to show and which only runs once per install,
 * the listing always opens and can be visited as often as they like.
 * On iOS it opens the App Store's write-a-review page; until the App Store id
 * is known it asks for the native review sheet instead. Never rejects.
 */
export async function openStoreListing(): Promise<void> {
  if (Platform.OS === 'ios') {
    if (APP_STORE_ID) {
      await Linking.openURL(`itms-apps://apps.apple.com/app/id${APP_STORE_ID}?action=write-review`).catch(
        () => {},
      );
      return;
    }
    await StoreReview.requestReview().catch(() => {});
    return;
  }
  try {
    if (await Linking.canOpenURL(STORE_DEEP_LINK)) {
      await Linking.openURL(STORE_DEEP_LINK);
      return;
    }
  } catch {
    // Fall through to the web listing.
  }
  await Linking.openURL(STORE_LISTING_URL).catch(() => {});
}
