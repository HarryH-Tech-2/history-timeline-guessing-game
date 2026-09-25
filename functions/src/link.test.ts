import assert from 'node:assert/strict';
import { test } from 'node:test';

import { decideLink } from './link';

test('an unseen player is bound to the caller, guest or not', () => {
  assert.deepEqual(decideLink({ callerUid: 'g1', callerIsAnonymous: true, mappedUid: null }), {
    action: 'link',
    uid: 'g1',
    mintToken: false,
  });
  assert.deepEqual(decideLink({ callerUid: 'a1', callerIsAnonymous: false, mappedUid: null }), {
    action: 'link',
    uid: 'a1',
    mintToken: false,
  });
});

test('a player already bound to the caller needs nothing', () => {
  assert.deepEqual(decideLink({ callerUid: 'g1', callerIsAnonymous: true, mappedUid: 'g1' }), {
    action: 'none',
    uid: 'g1',
    mintToken: false,
  });
});

test('a guest calling from a new device is signed into the bound uid', () => {
  assert.deepEqual(decideLink({ callerUid: 'g2', callerIsAnonymous: true, mappedUid: 'g1' }), {
    action: 'sign-in',
    uid: 'g1',
    mintToken: true,
  });
});

test('a real account never gets hijacked by a Play identity bound elsewhere', () => {
  assert.deepEqual(decideLink({ callerUid: 'a1', callerIsAnonymous: false, mappedUid: 'g1' }), {
    action: 'conflict',
    uid: 'a1',
    mintToken: false,
  });
});

test('forceToken mints for the caller only when the mapping is theirs (or new)', () => {
  assert.equal(
    decideLink({ callerUid: 'g1', callerIsAnonymous: false, mappedUid: 'g1', forceToken: true })
      .mintToken,
    true,
  );
  assert.equal(
    decideLink({ callerUid: 'g1', callerIsAnonymous: false, mappedUid: null, forceToken: true })
      .mintToken,
    true,
  );
  assert.equal(
    decideLink({ callerUid: 'a1', callerIsAnonymous: false, mappedUid: 'g1', forceToken: true })
      .mintToken,
    false,
  );
});
