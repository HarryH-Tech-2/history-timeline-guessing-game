import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseQuestionIds } from './handlers';

test('accepts eight distinct known question ids', () => {
  const ids = ['evt-moon-landing', 'reg-granada-falls', 'reg-kalmar-union', 'reg-st-petersburg',
    'evt-french-revolution', 'evt-us-independence', 'evt-russian-revolution', 'bat-cannae'];
  assert.deepEqual(parseQuestionIds(ids), ids);
});

test('rejects unknown, duplicate or wrong-length lists', () => {
  assert.equal(parseQuestionIds(['nope', 'a', 'b', 'c', 'd', 'e', 'f', 'g']), null);
  assert.equal(parseQuestionIds(['bat-cannae', 'bat-cannae']), null);
  assert.equal(parseQuestionIds('bat-cannae'), null);
});
