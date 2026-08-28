import type { es } from './es.js';

/**
 * Spanish is the source of truth: it is the only fully populated locale and the
 * one a real teacher will validate. Every other locale is a partial overlay that
 * falls back to it, so adding a language can never leave a screen blank — a
 * half-translated interface that shows Spanish where a word is missing is far
 * better than one that shows nothing.
 */
export type Strings = typeof es;

/** Every key optional: a translator contributes what they have. */
export type PartialStrings = {
  [K in keyof Strings]?: Strings[K] extends Record<string, unknown>
    ? Partial<Strings[K]>
    : Strings[K];
};

export type LocaleCode = 'es' | 'en' | 'ca' | 'gl' | 'eu';

export interface Locale {
  code: LocaleCode;
  /** In its own language, as a speaker would write it. */
  label: string;
  strings: PartialStrings;
}
