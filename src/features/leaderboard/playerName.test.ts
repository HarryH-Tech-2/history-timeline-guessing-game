import { containsBlockedWord, resolveDisplayName, validatePlayerName } from './playerName';
import { handleForUid } from './types';

describe('validatePlayerName', () => {
  it('accepts an ordinary name and returns its canonical form', () => {
    expect(validatePlayerName('  Harry   H ')).toEqual({ ok: true, name: 'Harry H' });
    expect(validatePlayerName("O'Brien-99_x")).toEqual({ ok: true, name: "O'Brien-99_x" });
    expect(validatePlayerName('Zoë Ångström')).toEqual({ ok: true, name: 'Zoë Ångström' });
  });

  it('rejects names that are too short or too long', () => {
    expect(validatePlayerName('ab').ok).toBe(false);
    expect(validatePlayerName('   ').ok).toBe(false);
    expect(validatePlayerName('a'.repeat(25)).ok).toBe(false);
    expect(validatePlayerName('a'.repeat(24)).ok).toBe(true);
  });

  it('rejects unsupported characters', () => {
    expect(validatePlayerName('Harry <3').ok).toBe(false);
    expect(validatePlayerName('name@host').ok).toBe(false);
    expect(validatePlayerName('🔥Harry').ok).toBe(false);
  });

  it('rejects blocked words, including leet-speak and split spellings', () => {
    expect(validatePlayerName('BigFucker').ok).toBe(false);
    expect(validatePlayerName('sh1t lord').ok).toBe(false);
    expect(validatePlayerName('f_u_c_k').ok).toBe(false);
    expect(validatePlayerName('N1gga').ok).toBe(false);
  });

  it('passes ordinary names (substring matching has known false positives)', () => {
    expect(validatePlayerName('Assyria Scholar').ok).toBe(true);
    expect(validatePlayerName('Classic Historian').ok).toBe(true);
    expect(validatePlayerName('Grasshopper').ok).toBe(true);
    // Documented trade-off: substrings are blocked even inside innocent words.
    expect(containsBlockedWord('Scunthorpe fan')).toBe(true);
    expect(containsBlockedWord('Dickens Reader')).toBe(true);
  });
});

describe('resolveDisplayName', () => {
  it('prefers the chosen name, then the generated handle, and never a Google name', () => {
    expect(resolveDisplayName('Harry', 'uid-1')).toBe('Harry');
    expect(resolveDisplayName('  Harry  ', 'uid-1')).toBe('Harry');
    expect(resolveDisplayName(null, 'uid-1')).toBe(handleForUid('uid-1'));
    expect(resolveDisplayName('', 'uid-1')).toBe(handleForUid('uid-1'));
    expect(resolveDisplayName(undefined, null)).toBe('Local Player');
  });

  it('never exceeds the leaderboard length cap', () => {
    expect(resolveDisplayName('x'.repeat(40), 'uid-1')).toHaveLength(24);
  });
});
