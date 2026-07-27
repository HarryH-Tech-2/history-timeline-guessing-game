/**
 * Minimal async key/value contract. AsyncStorage satisfies this today; MMKV or
 * a mock can be dropped in later without touching callers.
 */
export interface Storage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
