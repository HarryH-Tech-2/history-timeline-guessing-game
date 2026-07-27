import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Storage } from './types';

/** The app's default persistence backend. Works in Expo Go on both platforms. */
export const asyncStorage: Storage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};
