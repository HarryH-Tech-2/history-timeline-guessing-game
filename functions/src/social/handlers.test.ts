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

import { parseCreateChallenge, scoreGuesses, withFreshCode } from './handlers';
import { yearOf } from './catalogue';

const EIGHT = ['evt-moon-landing', 'reg-granada-falls', 'reg-kalmar-union', 'reg-st-petersburg',
  'evt-french-revolution', 'evt-us-independence', 'evt-russian-revolution', 'bat-cannae'];

test('create: no ids means a random challenge with no creator entry', () => {
  const r = parseCreateChallenge({});
  assert.equal(r.kind, 'ok');
  if (r.kind !== 'ok') return;
  assert.equal(r.questionIds.length, 8);
  assert.equal(r.guessYears, null);
});

test('create: ids plus valid guesses carry the creator entry', () => {
  const guesses = [1969, 1492, 1397, 1703, 1789, 1776, 1917, -216];
  assert.deepEqual(parseCreateChallenge({ questionIds: EIGHT, guessYears: guesses }), {
    kind: 'ok',
    questionIds: EIGHT,
    guessYears: guesses,
  });
});

test('create: guesses without ids, bad guesses or bad ids are rejected', () => {
  assert.equal(parseCreateChallenge({ guessYears: [1, 2, 3, 4, 5, 6, 7, 8] }).kind, 'invalid');
  assert.equal(parseCreateChallenge({ questionIds: EIGHT, guessYears: [1, 2, 3] }).kind, 'invalid');
  assert.equal(parseCreateChallenge({ questionIds: EIGHT, guessYears: [1, 2, 3, 4, 5, 6, 7, 8.5] }).kind, 'invalid');
  assert.equal(parseCreateChallenge({ questionIds: ['nope'] }).kind, 'invalid');
});

test('scores guesses against the catalogue years', () => {
  const exact = EIGHT.map((id) => yearOf(id)!);
  const scored = scoreGuesses(EIGHT, exact);
  assert.deepEqual(scored.roundScores, Array(8).fill(1000));
  assert.equal(scored.total, 8000);
});

test('withFreshCode retries on a code collision with a new code', async () => {
  const codes = ['AAAAAA', 'BBBBBB', 'CCCCCC'];
  const tried: string[] = [];
  const result = await withFreshCode(
    async (code) => {
      tried.push(code);
      if (tried.length < 3) throw Object.assign(new Error('exists'), { code: 6 });
      return code;
    },
    () => codes[tried.length]!,
  );
  assert.equal(result, 'CCCCCC');
  assert.deepEqual(tried, codes);
});

test('withFreshCode gives up after bounded attempts and passes other errors through', async () => {
  let calls = 0;
  await assert.rejects(
    withFreshCode(async () => {
      calls += 1;
      throw Object.assign(new Error('exists'), { code: 6 });
    }),
    (e: { code?: unknown }) => e.code === 'resource-exhausted',
  );
  assert.equal(calls, 8);
  await assert.rejects(
    withFreshCode(async () => {
      throw new Error('boom');
    }),
    /boom/,
  );
});
