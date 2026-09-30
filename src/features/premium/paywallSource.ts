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
  'era_complete',
  'winback',
  'unknown',
];

/** What the player was reaching for, so the paywall can speak to it. */
export interface PaywallContext {
  /** The locked category they tapped. */
  category?: string;
  /** The locked campaign era they tapped (or the one that comes next). */
  era?: string;
}

/** The paywall route, tagged with where it was opened from (and what for). */
export function paywallHref(source: PaywallSource, context: PaywallContext = {}): Href {
  const params: Record<string, string> = { source };
  if (context.category) params.category = context.category;
  if (context.era) params.era = context.era;
  return { pathname: '/paywall', params };
}

/** A single search-param value, or undefined. */
export function paramValue(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

/** The `source` search param, validated; anything unrecognised is 'unknown'. */
export function parsePaywallSource(raw: string | string[] | undefined): PaywallSource {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return PAYWALL_SOURCES.find((s) => s === value) ?? 'unknown';
}
