import { cloudSaves } from './cloudSaves';

describe('cloudSaves (Firebase not configured)', () => {
  // The test env has no EXPO_PUBLIC_FIREBASE_* vars, so the adapter must be a
  // no-op that never touches the Firestore SDK.
  it('load resolves null', async () => {
    await expect(cloudSaves.load('uid', 'chronos.progression')).resolves.toBeNull();
  });

  it('save resolves without doing anything', async () => {
    await expect(cloudSaves.save('uid', 'chronos.progression', { xp: 1 })).resolves.toBeUndefined();
  });
});
