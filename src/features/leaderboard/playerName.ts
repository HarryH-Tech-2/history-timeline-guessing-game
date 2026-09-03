import { handleForUid, MAX_DISPLAY_NAME } from './types';

export const MIN_DISPLAY_NAME = 3;
export { MAX_DISPLAY_NAME };

/** Letters (any script), digits, spaces, hyphen, underscore and apostrophe. */
const ALLOWED = /^[\p{L}\p{N} _'’-]+$/u;

/**
 * Words that are never allowed to appear in a public name, matched after
 * normalisation (case, leet-speak and separators collapsed) so trivial
 * respellings don't slip through. Kept short on purpose: false positives on
 * ordinary names are worse than the odd miss, and reports can extend it.
 */
const BLOCKED = [
  'fuck', 'shit', 'cunt', 'bitch', 'asshole', 'dick', 'pussy', 'whore', 'slut',
  'nigger', 'nigga', 'faggot', 'fag', 'retard', 'tranny', 'kike', 'spic', 'chink',
  'wetback', 'paki', 'hitler', 'nazi', 'rape', 'rapist',
];

const LEET: Record<string, string> = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b',
  '@': 'a', '$': 's', '!': 'i',
};

/** Lower-case, un-leet, and strip everything but letters so "F_u.c.K" → "fuck". */
function normaliseForFilter(name: string): string {
  return Array.from(name.toLowerCase())
    .map((ch) => LEET[ch] ?? ch)
    .join('')
    .replace(/[^\p{L}]/gu, '');
}

export function containsBlockedWord(name: string): boolean {
  const flat = normaliseForFilter(name);
  return BLOCKED.some((word) => flat.includes(word));
}

export type NameValidation =
  | { ok: true; name: string }
  | { ok: false; reason: string };

/**
 * Clean up and check a name the player typed. Trims, collapses runs of
 * spaces, then enforces length, character set and the blocklist. The returned
 * `name` is the canonical form to store and publish.
 */
export function validatePlayerName(raw: string): NameValidation {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (name.length < MIN_DISPLAY_NAME) {
    return { ok: false, reason: `Use at least ${MIN_DISPLAY_NAME} characters` };
  }
  if (name.length > MAX_DISPLAY_NAME) {
    return { ok: false, reason: `Keep it to ${MAX_DISPLAY_NAME} characters` };
  }
  if (!ALLOWED.test(name)) {
    return { ok: false, reason: 'Letters, numbers, spaces, - _ and ’ only' };
  }
  if (containsBlockedWord(name)) {
    return { ok: false, reason: 'That name isn’t allowed' };
  }
  return { ok: true, name };
}

/**
 * The one name the rest of the app shows for a player: their chosen name, or
 * the stable generated handle for their uid. Google and email names are never
 * used, so signing in with an account reveals nothing about it.
 */
export function resolveDisplayName(customName: string | null | undefined, uid: string | null): string {
  const custom = customName?.trim();
  if (custom) return custom.slice(0, MAX_DISPLAY_NAME);
  return uid ? handleForUid(uid) : 'Local Player';
}
