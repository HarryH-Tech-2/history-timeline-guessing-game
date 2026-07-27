import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  type Auth,
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

import { firebaseConfig } from '@/config/env';

/**
 * Lazy singletons for the Firebase client SDK.
 *
 * Nothing here runs until a caller asks for an instance, and every accessor
 * assumes `isFirebaseConfigured` was checked first — calling into an
 * unconfigured build is a programming error, so we fail loudly rather than
 * silently returning a half-initialised client.
 */

function requireConfig() {
  if (firebaseConfig === null) {
    throw new Error(
      'Firebase is not configured. Guard calls with `isFirebaseConfigured` before using the client.',
    );
  }
  return firebaseConfig;
}

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let firestoreInstance: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (appInstance) return appInstance;
  appInstance = getApps().length > 0 ? getApp() : initializeApp(requireConfig());
  return appInstance;
}

export function getFirebaseAuth(): Auth {
  if (authInstance) return authInstance;
  const app = getFirebaseApp();
  try {
    // Persist the session across restarts via AsyncStorage. `initializeAuth`
    // throws if auth was already initialised for this app, and
    // `getReactNativePersistence` is undefined on the web build — both cases
    // fall back to the default `getAuth`.
    authInstance = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    authInstance = getAuth(app);
  }
  return authInstance;
}

export function getFirebaseDb(): Firestore {
  if (firestoreInstance) return firestoreInstance;
  firestoreInstance = getFirestore(getFirebaseApp());
  return firestoreInstance;
}
