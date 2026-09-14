import { Linking } from 'react-native';

/** The app's Play listing, where an explicit "rate us" tap should land. */
export const STORE_LISTING_URL =
  'https://play.google.com/store/apps/details?id=com.harryhh.historydateguesser';

/** Deep link straight into the Play app; falls back to the web listing. */
const STORE_DEEP_LINK = 'market://details?id=com.harryhh.historydateguesser';

/**
 * Open the store listing so the player can leave a rating. Used for the
 * deliberate "Rate us" tap in Settings: unlike the in-app review sheet, which
 * Play may silently decline to show and which only runs once per install,
 * the listing always opens and can be visited as often as they like.
 * Never rejects.
 */
export async function openStoreListing(): Promise<void> {
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
