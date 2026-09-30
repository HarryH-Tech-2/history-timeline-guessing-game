/**
 * The languages the app ships in. `name` is each language's own name for
 * itself, so the picker reads right whatever language is on screen.
 */
export const LANGUAGES = [
  { code: 'en', name: 'English', bcp47: 'en' },
  { code: 'pt-BR', name: 'Português (Brasil)', bcp47: 'pt-BR' },
  { code: 'es-419', name: 'Español (Latinoamérica)', bcp47: 'es-419' },
  { code: 'ja', name: '日本語', bcp47: 'ja' },
] as const;

export type Language = (typeof LANGUAGES)[number]['code'];

/** What the player picked in Settings: a language, or follow the phone. */
export type LanguagePreference = Language | 'system';

export const DEFAULT_LANGUAGE: Language = 'en';

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.some((l) => l.code === value);
}

/**
 * The supported language for a device locale tag ("pt-PT", "es_MX", "en-GB"):
 * matched on the language part only, so every Portuguese speaker gets
 * Brazilian Portuguese and every Spanish speaker Latin American Spanish until
 * those regions have their own translations. Anything else falls back to
 * English.
 */
export function languageForLocale(tag: string | null | undefined): Language {
  const code = (tag ?? '').split(/[-_]/)[0]?.toLowerCase();
  if (code === 'pt') return 'pt-BR';
  if (code === 'es') return 'es-419';
  if (code === 'ja') return 'ja';
  return DEFAULT_LANGUAGE;
}

/**
 * The phone's language, read through the JS engine's Intl (Hermes takes it
 * from the OS). Deliberately no native module, so this ships over the air.
 */
export function deviceLanguage(): Language {
  try {
    return languageForLocale(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    return DEFAULT_LANGUAGE;
  }
}
