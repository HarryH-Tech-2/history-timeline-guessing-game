import assert from 'node:assert/strict';
import { test } from 'node:test';

import { hasQuestion, rotationPool, yearOf } from './catalogue';

test('knows bundled questions and their years', () => {
  assert.equal(hasQuestion('reg-granada-falls'), true);
  assert.equal(yearOf('reg-granada-falls'), 1492);
  assert.equal(yearOf('nope'), undefined);
});

test('keeps the Regional expansion out of the random pool', () => {
  const pool = rotationPool();
  assert.ok(pool.length > 200);
  assert.ok(!pool.includes('reg-edict-of-milan'));
});

test('keeps campaign route questions out of the random pool', () => {
  assert.equal(yearOf('rte-battle-of-pydna'), -168);
  assert.ok(!rotationPool().includes('rte-battle-of-pydna'));
  assert.ok(!rotationPool().includes('rte-fall-of-nineveh'));
});
