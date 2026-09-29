import assert from 'node:assert/strict';
import { test } from 'node:test';

import { validateGroupName } from './names';

test('accepts and tidies a normal name', () => {
  assert.deepEqual(validateGroupName('  The   Smiths '), { ok: true, name: 'The Smiths' });
});

test('rejects short, long, odd characters, blocked words and non-strings', () => {
  assert.equal(validateGroupName('ab').ok, false);
  assert.equal(validateGroupName('x'.repeat(25)).ok, false);
  assert.equal(validateGroupName('team<script>').ok, false);
  assert.equal(validateGroupName('N4zi club').ok, false);
  assert.equal(validateGroupName(undefined).ok, false);
});
