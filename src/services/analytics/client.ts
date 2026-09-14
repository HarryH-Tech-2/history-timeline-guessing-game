import PostHog from 'posthog-react-native';

import type { AnalyticsEventName, AnalyticsEvents } from './events';

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
 * able to break play.
 */
export function track<E extends AnalyticsEventName>(
  event: E,
  ...args: AnalyticsEvents[E] extends undefined ? [] : [properties: AnalyticsEvents[E]]
): void {
  try {
    const properties = args[0] as Parameters<PostHog['capture']>[1];
    getAnalyticsClient()?.capture(event, properties);
  } catch {
    // Reporting is best-effort.
  }
}

/**
 * Tie events to the player's Firebase uid (guests included, whose uid is
 * anonymous), so a signed-in player's history follows them across devices.
 */
export function identifyPlayer(uid: string | null): void {
  if (!uid) return;
  try {
    getAnalyticsClient()?.identify(uid);
  } catch {
    // Best-effort.
  }
}

/**
 * Switch capture on or off. PostHog persists the choice itself across
 * launches; the provider re-applies the saved app setting on every start so
 * the two never drift apart.
 */
export async function setAnalyticsEnabled(enabled: boolean): Promise<void> {
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
}
