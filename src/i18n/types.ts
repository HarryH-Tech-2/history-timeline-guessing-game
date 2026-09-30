import type { en } from './locales/en';

/** A counted phrase: `one` for exactly 1, `other` for everything else. */
export interface Plural {
  one: string;
  other: string;
}

/**
 * The shape every translation must match: the English dictionary with each
 * string widened, so a missing or extra key in another language is a type
 * error.
 */
export type TranslationShape<T> = {
  [K in keyof T]: T[K] extends string ? string : T[K] extends Plural ? Plural : TranslationShape<T[K]>;
};

export type Translation = TranslationShape<typeof en>;

type Paths<T> = {
  [K in keyof T & string]: T[K] extends string | Plural ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];

/** Every valid dotted key, e.g. "settings.language.title". */
export type TranslationKey = Paths<typeof en>;
