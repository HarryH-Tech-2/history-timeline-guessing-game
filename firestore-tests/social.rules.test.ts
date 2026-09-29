import { readFileSync } from 'node:fs';
import path from 'node:path';
import { after, before, test } from 'node:test';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

let env: RulesTestEnvironment;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-social',
    firestore: { rules: readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8') },
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'challenges/ABC234'), { creatorUid: 'a', questionIds: [], createdAt: 1, expiresAt: 2 });
    await setDoc(doc(db, 'challenges/ABC234/entries/a'), { total: 1 });
    await setDoc(doc(db, 'groups/g1'), { name: 'Fam', ownerUid: 'a', inviteCode: 'XYZ789', memberUids: ['a'] });
    await setDoc(doc(db, 'groupInvites/XYZ789'), { groupId: 'g1' });
  });
});

after(async () => env.cleanup());

test('signed-in players read challenges and entries; nobody writes them', async () => {
  const db = env.authenticatedContext('b').firestore();
  await assertSucceeds(getDoc(doc(db, 'challenges/ABC234')));
  await assertSucceeds(getDoc(doc(db, 'challenges/ABC234/entries/a')));
  await assertFails(setDoc(doc(db, 'challenges/NEW234'), { creatorUid: 'b' }));
  await assertFails(setDoc(doc(db, 'challenges/ABC234/entries/b'), { total: 8000 }));
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'challenges/ABC234')));
});

test('only members read a group; invites are server-only', async () => {
  await assertSucceeds(getDoc(doc(env.authenticatedContext('a').firestore(), 'groups/g1')));
  await assertFails(getDoc(doc(env.authenticatedContext('b').firestore(), 'groups/g1')));
  await assertFails(setDoc(doc(env.authenticatedContext('a').firestore(), 'groups/g1'), { name: 'x' }));
  await assertFails(getDoc(doc(env.authenticatedContext('a').firestore(), 'groupInvites/XYZ789')));
});

test('a player writes only their own social state', async () => {
  const a = env.authenticatedContext('a').firestore();
  await assertSucceeds(setDoc(doc(a, 'users/a/social/state'), { seen: { ABC234: 1 } }, { merge: true }));
  await assertFails(setDoc(doc(a, 'users/b/social/state'), { seen: {} }));
});
