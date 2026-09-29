import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  afterLeave,
  canJoinGroup,
  entryVerdict,
  CHALLENGE_SIZE,
  MAX_GROUP_MEMBERS,
  MAX_GROUPS_PER_PLAYER,
  pickQuestionIds,
  validateGuessYears,
} from './rules';

test('guess years must be eight whole, bounded numbers', () => {
  assert.deepEqual(validateGuessYears([1, 2, 3, 4, 5, 6, 7, -8]), [1, 2, 3, 4, 5, 6, 7, -8]);
  assert.equal(validateGuessYears([1, 2, 3]), null);
  assert.equal(validateGuessYears([1, 2, 3, 4, 5, 6, 7, 8.5]), null);
  assert.equal(validateGuessYears([1, 2, 3, 4, 5, 6, 7, 99999]), null);
  assert.equal(validateGuessYears('1,2'), null);
});

test('picks eight distinct ids from the pool', () => {
  const pool = Array.from({ length: 50 }, (_, i) => `q${i}`);
  const picked = pickQuestionIds(pool);
  assert.equal(picked.length, CHALLENGE_SIZE);
  assert.equal(new Set(picked).size, CHALLENGE_SIZE);
  for (const id of picked) assert.ok(pool.includes(id));
});

test('join checks fullness, membership and the per-player cap', () => {
  const full = { memberUids: Array.from({ length: MAX_GROUP_MEMBERS }, (_, i) => `u${i}`) };
  assert.equal(canJoinGroup(full, 'new', 0), 'full');
  assert.equal(canJoinGroup({ memberUids: ['a'] }, 'a', 1), 'already-member');
  assert.equal(canJoinGroup({ memberUids: ['a'] }, 'b', MAX_GROUPS_PER_PLAYER), 'too-many-groups');
  assert.equal(canJoinGroup({ memberUids: ['a'] }, 'b', 0), 'ok');
});

test('leaving hands ownership to the longest-standing member, or deletes an empty group', () => {
  assert.deepEqual(afterLeave({ ownerUid: 'a', memberUids: ['a', 'b', 'c'] }, 'a'), {
    kind: 'update',
    ownerUid: 'b',
    memberUids: ['b', 'c'],
  });
  assert.deepEqual(afterLeave({ ownerUid: 'a', memberUids: ['a', 'b'] }, 'b'), {
    kind: 'update',
    ownerUid: 'a',
    memberUids: ['a'],
  });
  assert.deepEqual(afterLeave({ ownerUid: 'a', memberUids: ['a'] }, 'a'), { kind: 'delete' });
});

test('entry verdict: ok returns the validated guesses', () => {
  const guesses = [1, 2, 3, 4, 5, 6, 7, 8];
  assert.deepEqual(
    entryVerdict({ challenge: { expiresAt: 1000 }, entryExists: false, guessYears: guesses, now: 500 }),
    { kind: 'ok', guessYears: guesses },
  );
});

test('entry verdict: missing challenge is not-found', () => {
  assert.deepEqual(
    entryVerdict({ challenge: undefined, entryExists: false, guessYears: [1, 2, 3, 4, 5, 6, 7, 8], now: 0 }),
    { kind: 'not-found' },
  );
});

test('entry verdict: expiry boundary — equal to expiresAt is still open, one ms later is expired', () => {
  const guessYears = [1, 2, 3, 4, 5, 6, 7, 8];
  const challenge = { expiresAt: 1000 };
  assert.equal(entryVerdict({ challenge, entryExists: false, guessYears, now: 1000 }).kind, 'ok');
  assert.deepEqual(entryVerdict({ challenge, entryExists: false, guessYears, now: 1001 }), {
    kind: 'expired',
  });
});

test('entry verdict: an existing entry for this uid is already-entered', () => {
  assert.deepEqual(
    entryVerdict({
      challenge: { expiresAt: 1000 },
      entryExists: true,
      guessYears: [1, 2, 3, 4, 5, 6, 7, 8],
      now: 0,
    }),
    { kind: 'already-entered' },
  );
});

test('entry verdict: wrong-length or non-integer guesses are invalid, before any doc checks', () => {
  const base = { challenge: { expiresAt: 1000 }, entryExists: false, now: 0 };
  assert.deepEqual(entryVerdict({ ...base, guessYears: [1, 2, 3] }), { kind: 'invalid-guesses' });
  assert.deepEqual(entryVerdict({ ...base, guessYears: [1, 2, 3, 4, 5, 6, 7, 8.5] }), {
    kind: 'invalid-guesses',
  });
  assert.deepEqual(entryVerdict({ ...base, guessYears: 'nope' }), { kind: 'invalid-guesses' });
  assert.deepEqual(
    entryVerdict({ challenge: undefined, entryExists: true, guessYears: [1], now: 0 }),
    { kind: 'invalid-guesses' },
  );
});
