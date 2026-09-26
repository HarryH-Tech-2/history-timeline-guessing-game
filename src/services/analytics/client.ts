import PostHog from 'posthog-react-native';

import type { AnalyticsEventName, AnalyticsEvents } from './events';
import {
  logFirebaseEvent,
  resetFirebaseAnalyticsForTests,
  setFirebaseCollectionEnabled,
  setFirebaseUserId,
} from './firebaseAnalytics';

/** Project key and host for PostHog, inlined at build time (Expo requires
 * static `process.env.EXPO_PUBLIC_*` access). Publishable, not secret. Read
 * on first use rather than at import so tests can vary them. */
function readApiKey(): string | null {
  const key = process.env.EXPO_PUBLIC_POSTHOG_KEY;
  return typeof key === 'string' && key.length > 0 ? key : null;
}
function readHost(): string {
  return process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';
}

/** Whether this build was given a PostHog key at all. */
export function isAnalyticsConfigured(): boolean {
  return readApiKey() !== null;
}

// `undefined` = not created yet; `null` = this build has no key.
let client: PostHog | null | undefined;

/**
 * The lazily-created PostHog client, or null when the build has no key — in
 * which case every call below is a silent no-op, so a dev or offline build
 * behaves identically minus the reporting.
 */
export function getAnalyticsClient(): PostHog | null {
  if (client !== undefined) return client;
  const apiKey = readApiKey();
  if (apiKey === null) {
    client = null;
    return client;
  }
  client = new PostHog(apiKey, {
    host: readHost(),
    // "Application Opened / Backgrounded / Installed / Updated" for free.
    captureAppLifecycleEvents: true,
    // Batched: a handful of events per run, flushed shortly after.
    flushAt: 10,
    flushInterval: 10_000,
  });
  return client;
}

/**
 * Record one usage event. Typed against `AnalyticsEvents`, so a misspelt name
 * or a missing property fails to compile. Never throws: reporting must not be
 * able to break play. Every event goes to PostHog (product analytics) and,
 * under the same name, to Firebase Analytics (Google Ads conversions and
 * uninstall attribution); each is independently a no-op where unavailable.
 */
export function track<E extends AnalyticsEventName>(
  event: E,
  ...args: AnalyticsEvents[E] extends undefined ? [] : [properties: AnalyticsEvents[E]]
): void {
  const properties = args[0] as Record<string, unknown> | undefined;
  try {
    getAnalyticsClient()?.capture(event, properties as Parameters<PostHog['capture']>[1]);
  } catch {
    // Reporting is best-effort.
  }
  logFirebaseEvent(event, properties);
}

/**
 * Tie events to a signed-in player's Firebase uid, so their history follows
 * them across devices. Guests are deliberately NOT identified: a guest uid is
 * minted afresh on every install and every sign-out, so identifying it made
 * each of those a brand-new PostHog person. Left on the device id, a guest is
 * one person per install, and the identify on sign-in merges that device
 * history into the account.
 */
export function identifyPlayer(uid: string | null): void {
  if (!uid) return;
  try {
    getAnalyticsClient()?.identify(uid);
  } catch {
    // Best-effort.
  }
  setFirebaseUserId(uid);
}

/**
 * Forget the identified account (sign-out): events from here on belong to a
 * fresh device id, not to the account that just left. Never throws.
 */
export function resetPlayerIdentity(): void {
  try {
    getAnalyticsClient()?.reset();
  } catch {
    // Best-effort.
  }
  setFirebaseUserId(null);
}

/**
 * Switch capture on or off. PostHog persists the choice itself across
 * launches; the provider re-applies the saved app setting on every start so
 * the two never drift apart.
 */
export async function setAnalyticsEnabled(enabled: boolean): Promise<void> {
  await setFirebaseCollectionEnabled(enabled);
  const c = getAnalyticsClient();
  if (!c) return;
  try {
    if (enabled) await c.optIn();
    else await c.optOut();
  } catch {
    // Best-effort.
  }
}

/** Test hook: forget the client so the next call re-reads the environment. */
export function resetAnalyticsForTests(): void {
  client = undefined;
  resetFirebaseAnalyticsForTests();
}
