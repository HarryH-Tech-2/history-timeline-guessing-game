import categoryExpansion1 from './en/category-expansion-1.json';
import categoryExpansion2 from './en/category-expansion-2.json';
import core1 from './en/core-1.json';
import core2 from './en/core-2.json';
import core3 from './en/core-3.json';
import core4 from './en/core-4.json';
import packs1 from './en/packs-1.json';
import packs2 from './en/packs-2.json';
import regionalExpansion from './en/regional-expansion.json';
import routes1 from './en/routes-1.json';
import routes2 from './en/routes-2.json';
import routes3 from './en/routes-3.json';

/** The longer read behind an event: what led to it and what it changed. */
export interface DeepDive {
  why: string;
  impact: string;
}

/**
 * Deep dives, keyed by question id. Bundled apart from the questions on
 * purpose: the Firestore catalogue replaces the bundled questions on hydrate,
 * and text kept here can neither be wiped by that nor need a reseed. English
 * only for now, so every language reads these.
 */
const DEEP_DIVES: Record<string, DeepDive> = {
  ...core1,
  ...core2,
  ...core3,
  ...core4,
  ...packs1,
  ...packs2,
  ...regionalExpansion,
  ...routes1,
  ...routes2,
  ...routes3,
  ...categoryExpansion1,
  ...categoryExpansion2,
};

/** The deep dive for a question, or undefined when none has been written. */
export function deepDiveFor(questionId: string): DeepDive | undefined {
  return DEEP_DIVES[questionId];
}
