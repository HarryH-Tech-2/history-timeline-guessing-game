import { FirebaseConfigSchema, isFirebaseConfigured } from './env';

const COMPLETE = {
  apiKey: 'key',
  authDomain: 'demo.firebaseapp.com',
  projectId: 'demo',
  storageBucket: 'demo.appspot.com',
  messagingSenderId: '123',
  appId: '1:123:web:abc',
};

describe('FirebaseConfigSchema', () => {
  it('accepts a complete config and treats measurementId as optional', () => {
    expect(FirebaseConfigSchema.safeParse(COMPLETE).success).toBe(true);
    expect(FirebaseConfigSchema.safeParse({ ...COMPLETE, measurementId: 'G-1' }).success).toBe(true);
  });

  it('rejects a partial config (any missing required key)', () => {
    const { apiKey: _omitted, ...partial } = COMPLETE;
    expect(FirebaseConfigSchema.safeParse(partial).success).toBe(false);
  });

  it('rejects empty-string values', () => {
    expect(FirebaseConfigSchema.safeParse({ ...COMPLETE, projectId: '' }).success).toBe(false);
  });
});

describe('isFirebaseConfigured', () => {
  it('is false in a build with no EXPO_PUBLIC_FIREBASE_* vars (offline default)', () => {
    // The test environment ships no Firebase env vars, so the app must default
    // to the fully-offline path.
    expect(isFirebaseConfigured).toBe(false);
  });
});
