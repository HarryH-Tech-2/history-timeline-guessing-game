/**
 * Group names follow the app's player-name rules (src/features/leaderboard/
 * playerName.ts): 3–24 chars, letters/digits/space/-_’ only, blocklist after
 * leet-speak normalisation. Kept in step by hand; the lists are short.
 */
const MIN = 3;
const MAX = 24;
const ALLOWED = /^[\p{L}\p{N} _'’-]+$/u;
const BLOCKED = [
  'fuck', 'shit', 'cunt', 'bitch', 'asshole', 'dick', 'pussy', 'whore', 'slut',
  'nigger', 'nigga', 'faggot', 'fag', 'retard', 'tranny', 'kike', 'spic', 'chink',
  'wetback', 'paki', 'hitler', 'nazi', 'rape', 'rapist',
];
const LEET: Record<string, string> = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b',
  '@': 'a', '$': 's', '!': 'i',
};

function flatten(name: string): string {
  return Array.from(name.toLowerCase())
    .map((ch) => LEET[ch] ?? ch)
    .join('')
    .replace(/[^\p{L}]/gu, '');
}

export function validateGroupName(
  raw: unknown,
): { ok: true; name: string } | { ok: false; reason: string } {
  if (typeof raw !== 'string') return { ok: false, reason: 'Name required' };
  const name = raw.trim().replace(/\s+/g, ' ');
  if (name.length < MIN) return { ok: false, reason: `Use at least ${MIN} characters` };
  if (name.length > MAX) return { ok: false, reason: `Keep it to ${MAX} characters` };
  if (!ALLOWED.test(name)) return { ok: false, reason: 'Letters, numbers, spaces, - _ and ’ only' };
  const flat = flatten(name);
  if (BLOCKED.some((w) => flat.includes(w))) return { ok: false, reason: 'That name isn’t allowed' };
  return { ok: true, name };
}
