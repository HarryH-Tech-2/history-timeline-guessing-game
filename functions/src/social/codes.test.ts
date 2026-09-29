import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CODE_ALPHABET, CODE_LENGTH, isValidCode, mintCode } from './codes';

test('mints six characters from the unambiguous alphabet', () => {
  for (let i = 0; i < 200; i += 1) {
    const code = mintCode();
    assert.equal(code.length, CODE_LENGTH);
    for (const ch of code) assert.ok(CODE_ALPHABET.includes(ch), `bad char ${ch}`);
  }
  assert.ok(!/[01OI]/.test(CODE_ALPHABET));
});

test('is deterministic for a given random source', () => {
  const zero = () => 0;
  assert.equal(mintCode(zero), 'AAAAAA');
});

test('validates shape, case-sensitively', () => {
  assert.equal(isValidCode('ABC234'), true);
  assert.equal(isValidCode('abc234'), false);
  assert.equal(isValidCode('ABC23'), false);
  assert.equal(isValidCode('ABC230'), false);
  assert.equal(isValidCode(42), false);
});
