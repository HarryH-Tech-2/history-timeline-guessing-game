import {
  getAnalytics,
  logEvent,
  setAnalyticsCollectionEnabled,
  setUserId,
  type Analytics,
} from '@react-native-firebase/analytics';
import { Platform } from 'react-native';

/**
 * Firebase Analytics (Google Analytics for Firebase), mirrored from the same
 * `track()` calls that feed PostHog. It exists for one reason PostHog cannot
 * serve: Google Ads. Firebase logs `app_remove` on Android by itself, and
 * once the Firebase project is linked to Google Ads, uninstalls and any
 * event marked as a conversion (run_completed) show up per campaign and can
 * be bid against.
 *
 * Only Android builds carrying the native module ever report; everywhere
 * else (Expo Go, web, tests, older dev clients) every call is a silent
 * no-op. Importing the package is safe — React Native Firebase only throws
 * when a method is called without its native side — so the guard is around
 * the first use, and the outcome is remembered.
 */

// `undefined` = not tried yet; `null` = unavailable in this build.
let instance: Analytics | null | undefined;

function getInstance(): Analytics | null {
  if (instance !== undefined) return instance;
  if (Platform.OS === 'web') {
    instance = null;
    return instance;
  }
  try {
    instance = getAnalytics();
  } catch {
    instance = null;
  }
  return instance;
}

/** Firebase caps string parameter values at 100 characters. */
const MAX_PARAM_LENGTH = 100;

/**
 * Firebase accepts only string and number parameter values, so booleans go
 * over as 'true'/'false' (readable when the event is imported as a Google
 * Ads conversion) and anything else is dropped.
 */
export function toFirebaseParams(
  properties: Record<string, unknown> | undefined,
): Record<string, string | number> | undefined {
  if (properties === undefined) return undefined;
  const params: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (typeof value === 'number') params[key] = value;
    else if (typeof value === 'string') params[key] = value.slice(0, MAX_PARAM_LENGTH);
    else if (typeof value === 'boolean') params[key] = value ? 'true' : 'false';
  }
  return params;
}

/** Log one event, with the same name PostHog gets. Never throws. */
export function logFirebaseEvent(event: string, properties?: Record<string, unknown>): void {
  const analytics = getInstance();
  if (analytics === null) return;
  try {
    // Fire-and-forget inside the SDK too: it returns nothing to await.
    logEvent(analytics, event, toFirebaseParams(properties));
  } catch {
    // Best-effort.
  }
}

/** Tie Firebase's reporting to the same uid PostHog identifies by. Never throws. */
export function setFirebaseUserId(uid: string | null): void {
  const analytics = getInstance();
  if (analytics === null) return;
  try {
    void setUserId(analytics, uid).catch(() => {});
  } catch {
    // Best-effort.
  }
}

/**
 * Honour the app's analytics switch. Collection starts off (see
 * `firebase.json`) so nothing is sent before the saved choice is re-applied
 * on launch; Firebase persists this value itself across launches.
 */
export async function setFirebaseCollectionEnabled(enabled: boolean): Promise<void> {
  const analytics = getInstance();
  if (analytics === null) return;
  try {
    await setAnalyticsCollectionEnabled(analytics, enabled);
  } catch {
    // Best-effort.
  }
}

/** Test hook: forget the instance so the next call re-checks availability. */
export function resetFirebaseAnalyticsForTests(): void {
  instance = undefined;
}
