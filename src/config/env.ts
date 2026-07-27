import { z } from 'zod';

/**
 * Firebase client configuration, sourced from `EXPO_PUBLIC_FIREBASE_*` env vars.
 *
 * Expo inlines `process.env.EXPO_PUBLIC_*` at build time via *static* dot-notation
 * references only (see https://docs.expo.dev/guides/environment-variables/), so
 * every field below must be written out literally — a dynamic lookup would be
 * replaced with `undefined`.
 *
 * These are publishable client keys (Firebase apiKey/appId are not secrets — access
 * is gated by Firestore security rules, not by hiding the config), so shipping them
 * in the bundle is expected. Real secrets never use the `EXPO_PUBLIC_` prefix.
 */
export const FirebaseConfigSchema = z.object({
  apiKey: z.string().min(1),
  authDomain: z.string().min(1),
  projectId: z.string().min(1),
  storageBucket: z.string().min(1),
  messagingSenderId: z.string().min(1),
  appId: z.string().min(1),
  measurementId: z.string().min(1).optional(),
});

export type FirebaseConfig = z.infer<typeof FirebaseConfigSchema>;

const rawFirebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const parsed = FirebaseConfigSchema.safeParse(rawFirebaseConfig);

/**
 * The validated Firebase config, or `null` when the app is built without
 * Firebase env vars. Callers treat `null` as "run fully offline" — the game
 * still works from the local seed dataset and on-device storage, so a missing
 * backend can never brick the app (important for Expo Go / CI builds).
 */
export const firebaseConfig: FirebaseConfig | null = parsed.success ? parsed.data : null;

/** True when a complete, valid Firebase config is present in the build. */
export const isFirebaseConfigured = firebaseConfig !== null;
