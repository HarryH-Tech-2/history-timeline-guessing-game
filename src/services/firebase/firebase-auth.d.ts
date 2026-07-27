/**
 * `getReactNativePersistence` ships in Firebase's React Native build
 * (`@firebase/auth/dist/rn`) and is what Metro resolves at runtime, but it is
 * intentionally absent from the default web typings (`auth-public.d.ts`). That
 * mismatch makes a plain `import { getReactNativePersistence } from 'firebase/auth'`
 * fail `tsc` even though it works on device.
 *
 * This module augmentation restores the missing declaration so the import type-checks
 * without reaching into Firebase's internal dist paths. Verified against firebase
 * 12.16.0; revisit if the public typings start exporting it.
 */
import type { Persistence } from 'firebase/auth';

declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: {
    setItem(key: string, value: string): Promise<void>;
    getItem(key: string): Promise<string | null>;
    removeItem(key: string): Promise<void>;
  }): Persistence;
}
