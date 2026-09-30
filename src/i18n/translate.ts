import { createElement, Fragment, isValidElement, type ReactNode } from 'react';

import { DEFAULT_LANGUAGE, LANGUAGES, type Language } from './languages';
import { en } from './locales/en';
import { es419 } from './locales/es-419';
import { ja } from './locales/ja';
import { ptBR } from './locales/pt-BR';
import type { Plural, TranslationKey } from './types';

const DICTIONARIES: Record<Language, unknown> = { en, 'pt-BR': ptBR, 'es-419': es419, ja };

let current: Language = DEFAULT_LANGUAGE;

/** The language every `t()` call reads. Set by LanguageProvider. */
export function getLanguage(): Language {
  return current;
}

export function setLanguage(language: Language): void {
  current = language;
}

/** BCP 47 tag of the current language, for Intl / toLocaleString. */
export function getLocaleTag(): string {
  return LANGUAGES.find((l) => l.code === current)?.bcp47 ?? 'en';
}

export type TranslateParams = Record<string, string | number>;

/**
 * Plural category for `count`. Our languages all use one/other, and "1" is
 * the only singular in the way we write counts (pt-BR "0 dias", like es and
 * en); Japanese has no plural, so its two forms are the same text.
 * Hand-rolled because Hermes has no Intl.PluralRules.
 */
function pluralCategory(count: number): keyof Plural {
  return count === 1 ? 'one' : 'other';
}

function lookup(dictionary: unknown, key: string): unknown {
  let node = dictionary;
  for (const part of key.split('.')) {
    if (node === null || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

function isPlural(value: unknown): value is Plural {
  return typeof value === 'object' && value !== null && 'other' in value;
}

/** The raw template for `key` in `language`, falling back to English. */
function template(key: string, language: Language, params?: TranslateParams): string {
  let value = lookup(DICTIONARIES[language], key);
  if (value === undefined) value = lookup(en, key);
  if (isPlural(value)) {
    const count = Number(params?.count ?? 0);
    value = value[pluralCategory(count)] ?? value.other;
  }
  return typeof value === 'string' ? value : key;
}

function formatParam(value: string | number, language: Language): string {
  if (typeof value !== 'number') return value;
  const tag = LANGUAGES.find((l) => l.code === language)?.bcp47 ?? 'en';
  return value.toLocaleString(tag);
}

/**
 * The text for `key` in the current language. `{name}` placeholders are
 * filled from `params` (numbers are formatted for the language); a plural
 * entry picks its form from `params.count`.
 */
export function t(key: TranslationKey, params?: TranslateParams): string {
  const language = current;
  return template(key, language, params).replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params?.[name];
    return value === undefined ? match : formatParam(value, language);
  });
}

/**
 * Like `t`, but placeholders can be React nodes, e.g. a bold name inside a
 * sentence: `tRich('x.y', { name: <Text className="font-bold">{n}</Text> })`.
 * Returns a fragment to drop inside a <Text>.
 */
export function tRich(key: TranslationKey, params: Record<string, ReactNode | string | number>): ReactNode {
  const language = current;
  const parts = template(key, language, params as TranslateParams).split(/(\{\w+\})/g);
  const children = parts.map((part, i) => {
    const name = /^\{(\w+)\}$/.exec(part)?.[1];
    if (name === undefined || !(name in params)) return part;
    const value = params[name];
    if (typeof value === 'number') return formatParam(value, language);
    return isValidElement(value) ? createElement(Fragment, { key: i }, value) : value;
  });
  return createElement(Fragment, null, ...children);
}

/** A number formatted for the current language ("1,234" / "1.234"). */
export function formatNumber(value: number): string {
  return value.toLocaleString(getLocaleTag());
}
