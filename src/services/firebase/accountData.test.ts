import { wipeAccountDocs, type AccountDocs } from './accountData';

/** In-memory stand-in for the Firestore paths the app writes per player. */
function fakeDocs(paths: string[]) {
  const docs = new Set(paths);
  const port: AccountDocs = {
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
  return { docs, port };
}

describe('wipeAccountDocs', () => {
  it('removes every save, the leaderboard row and the user doc for the uid only', async () => {
    const { docs, port } = fakeDocs([
      'users/a',
      'users/a/saves/chronos.progression',
      'users/a/saves/chronos.campaign',
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
});
