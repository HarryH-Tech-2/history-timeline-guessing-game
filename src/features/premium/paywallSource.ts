import type { Href } from 'expo-router';

import type { PaywallSource } from '@/services/analytics';

export type { PaywallSource } from '@/services/analytics';

/** Every place the paywall can be opened from, for attribution. */
export const PAYWALL_SOURCES: readonly PaywallSource[] = [
  'onboarding',
  'run_summary',
  'home_chip',
  'hearts',
  'profile',
  'locked_category',
  'locked_mode',
  'campaign',
  'unknown',
];

/** The paywall route, tagged with where it was opened from. */
export function paywallHref(source: PaywallSource): Href {
  return { pathname: '/paywall', params: { source } };
}

/** The `source` search param, validated; anything unrecognised is 'unknown'. */
export function parsePaywallSource(raw: string | string[] | undefined): PaywallSource {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return PAYWALL_SOURCES.find((s) => s === value) ?? 'unknown';
}
