import type { Store } from '@/storage';

import { hasLocalProgressionSave } from './localSaves';

/**
 * Reads an on/off feedback setting (sound, vibration) that starts OFF on a
 * new install. `null` means the player has never chosen: a device that
 * already holds a game save played under the old always-on default and
 * keeps it on; a fresh install gets off. The resolved value is saved at once,
 * so it can't flip later when a save appears.
 */
export async function readFirstRunOffSetting(
  store: Store<boolean | null>,
  hasSave: () => Promise<boolean> = hasLocalProgressionSave,
): Promise<boolean> {
  const saved = await store.read();
  if (saved !== null) return saved;
  const initial = await hasSave();
  await store.write(initial);
  return initial;
}
