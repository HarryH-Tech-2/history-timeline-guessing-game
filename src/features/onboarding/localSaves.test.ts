import AsyncStorage from '@react-native-async-storage/async-storage';

import { hasLocalProgressionSave } from './localSaves';

describe('hasLocalProgressionSave', () => {
  beforeEach(() => AsyncStorage.clear());

  it('is false on a device that has never saved a profile', async () => {
    await AsyncStorage.setItem('chronos.onboarding', '{"completedAt":null}');
    await expect(hasLocalProgressionSave()).resolves.toBe(false);
  });

  it('is true once any uid has a progression save here', async () => {
    await AsyncStorage.setItem('chronos.progression:abc123', '{}');
    await expect(hasLocalProgressionSave()).resolves.toBe(true);
  });

  it('counts the offline local uid too', async () => {
    await AsyncStorage.setItem('chronos.progression:local', '{}');
    await expect(hasLocalProgressionSave()).resolves.toBe(true);
  });
});
