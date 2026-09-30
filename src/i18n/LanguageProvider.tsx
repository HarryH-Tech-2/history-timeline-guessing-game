import { createContext, Fragment, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { z } from 'zod';

import { createStore } from '@/storage';

import { deviceLanguage, isLanguage, type Language, type LanguagePreference } from './languages';
import { setLanguage } from './translate';

export const languageStore = createStore<LanguagePreference>({
  key: 'chronos.language',
  schema: z.string().refine((v): v is LanguagePreference => v === 'system' || isLanguage(v)) as z.ZodType<LanguagePreference>,
  fallback: 'system',
});

function resolve(preference: LanguagePreference): Language {
  return preference === 'system' ? deviceLanguage() : preference;
}

export interface LanguageContextValue {
  /** The language on screen. */
  language: Language;
  /** What the player chose in Settings ('system' = follow the phone). */
  preference: LanguagePreference;
  setPreference: (preference: LanguagePreference) => void;
}

const DEFAULT_CONTEXT: LanguageContextValue = {
  language: 'en',
  preference: 'system',
  setPreference: () => {},
};

const LanguageContext = createContext<LanguageContextValue>(DEFAULT_CONTEXT);

/**
 * Owns the app language: the phone's by default, or the one picked in
 * Profile → Settings. `t()` reads a module-level language, so on a change the
 * subtree is remounted (keyed on the language) rather than trusting every
 * memoised string to recompute.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<LanguagePreference>('system');
  const [language, setLanguageState] = useState<Language>(() => {
    const initial = resolve('system');
    setLanguage(initial);
    return initial;
  });

  useEffect(() => {
    let active = true;
    void languageStore.read().then((saved) => {
      if (!active) return;
      const next = resolve(saved);
      setLanguage(next);
      setPreferenceState(saved);
      setLanguageState(next);
    });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      preference,
      setPreference: (next) => {
        const resolved = resolve(next);
        setLanguage(resolved);
        setPreferenceState(next);
        setLanguageState(resolved);
        void languageStore.write(next);
      },
    }),
    [language, preference],
  );

  return (
    <LanguageContext.Provider value={value}>
      <Fragment key={language}>{children}</Fragment>
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
