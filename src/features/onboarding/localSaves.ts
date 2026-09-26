import AsyncStorage from '@react-native-async-storage/async-storage';

import { PROGRESSION_SAVE_KEY } from '@/features/progression/persistence';
import { scopedKey } from '@/storage';

/**
 * Has any account (or the offline 'local' uid) ever saved progression on
 * this device? A plain key scan, so it answers before auth has resolved —
 * unlike the profile itself, which is filed under a uid we only know once
 * sign-in completes. Never rejects: an unreadable store reads as "no saves",
 * which errs towards showing onboarding, the safe side for a first launch.
 */
export async function hasLocalProgressionSave(): Promise<boolean> {
  try {
    const prefix = scopedKey(PROGRESSION_SAVE_KEY, '');
    const keys = await AsyncStorage.getAllKeys();
    return keys.some((key) => key.startsWith(prefix));
  } catch {
    return false;
  }
}
