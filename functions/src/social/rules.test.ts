import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  afterLeave,
  canJoinGroup,
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
