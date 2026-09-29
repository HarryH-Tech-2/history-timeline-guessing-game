import { wipeAccountDocs, type AccountDocs } from './accountData';

/** In-memory stand-in for the Firestore paths the app writes per player. */
function fakeDocs(paths: string[], groupIds: string[] = []) {
  const docs = new Set(paths);
  const left: string[] = [];
  const port: AccountDocs = {
    listSocialGroupIds: () => Promise.resolve(groupIds),
    leaveGroup: (groupId) => {
      left.push(groupId);
      return Promise.resolve();
    },
    deleteSocialState: (uid) => {
      docs.delete(`users/${uid}/social/state`);
      return Promise.resolve();
    },
    listSaveKeys: (uid) =>
      Promise.resolve(
        [...docs]
          .filter((p) => p.startsWith(`users/${uid}/saves/`))
          .map((p) => p.slice(`users/${uid}/saves/`.length)),
      ),
    deleteSave: (uid, key) => {
      docs.delete(`users/${uid}/saves/${key}`);
      return Promise.resolve();
    },
    deleteLeaderboardEntry: (uid) => {
      docs.delete(`leaderboard/${uid}`);
      return Promise.resolve();
    },
    deleteUserDoc: (uid) => {
      docs.delete(`users/${uid}`);
      return Promise.resolve();
    },
  };
  return { docs, port, left };
}

describe('wipeAccountDocs', () => {
  it('removes every save, the leaderboard row and the user doc for the uid only', async () => {
    const { docs, port } = fakeDocs([
      'users/a',
      'users/a/saves/chronos.progression',
      'users/a/saves/chronos.campaign',
      'users/a/social/state',
      'leaderboard/a',
      'users/b/saves/chronos.progression',
      'leaderboard/b',
    ]);

    await wipeAccountDocs('a', port);

    expect([...docs].sort()).toEqual(['leaderboard/b', 'users/b/saves/chronos.progression']);
  });

  it('rejects when a delete fails, so the auth account is not removed with data left behind', async () => {
    const { port } = fakeDocs(['users/a/saves/chronos.progression']);
    port.deleteSave = () => Promise.reject(new Error('permission-denied'));

    await expect(wipeAccountDocs('a', port)).rejects.toThrow('permission-denied');
  });

  it('leaves every group in the social state and deletes the social state doc', async () => {
    const { docs, port, left } = fakeDocs(['users/a', 'users/a/social/state'], ['g1', 'g2']);

    await wipeAccountDocs('a', port);

    expect(left).toEqual(['g1', 'g2']);
    expect([...docs]).toEqual([]);
  });

  it('never blocks deletion on a failed group leave or unreadable social state', async () => {
    const { docs, port, left } = fakeDocs(['users/a', 'users/a/social/state', 'leaderboard/a'], ['g1', 'g2']);
    port.leaveGroup = (groupId) => {
      if (groupId === 'g1') return Promise.reject(new Error('unavailable'));
      left.push(groupId);
      return Promise.resolve();
    };

    await wipeAccountDocs('a', port);
    expect(left).toEqual(['g2']);
    expect([...docs]).toEqual([]);

    const second = fakeDocs(['users/a', 'users/a/social/state']);
    second.port.listSocialGroupIds = () => Promise.reject(new Error('offline'));
    await wipeAccountDocs('a', second.port);
    expect([...second.docs]).toEqual([]);
  });
});
