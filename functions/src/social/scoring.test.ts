import assert from 'node:assert/strict';
import { test } from 'node:test';

import { scoreEntry, scoreForError } from './scoring';

test('matches the app breakpoints', () => {
  assert.equal(scoreForError(0), 1000);
  assert.equal(scoreForError(1), 950);
  assert.equal(scoreForError(5), 800);
  assert.equal(scoreForError(10), 650);
  assert.equal(scoreForError(15), 550);
  assert.equal(scoreForError(100), 0);
  assert.equal(scoreForError(-5), 800);
});

test('scores every round and totals them', () => {
  assert.deepEqual(scoreEntry([1969, 1066], [1969, 1076]), { roundScores: [1000, 650], total: 1650 });
});
