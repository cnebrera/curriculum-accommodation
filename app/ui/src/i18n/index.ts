import { es } from './es.js';
import { en } from './en.js';
import type { Locale, LocaleCode, PartialStrings, Strings } from './types.js';

export type { Strings, PartialStrings, LocaleCode, Locale };

export const LOCALES: Locale[] = [
  { code: 'es', label: 'Español', strings: es },
  { code: 'en', label: 'English', strings: en },
  // Catalan, Galician and Basque go here. A partial file is welcome: anything
  // missing falls back to Spanish rather than leaving a screen blank.
];

/** Deep merge over Spanish, so a missing key is never an empty string. */
function merge(base: Strings, overlay: PartialStrings): Strings {
  const out = { ...base } as Record<string, unknown>;
  for (const [k, v] of Object.entries(overlay)) {
    const b = (base as Record<string, unknown>)[k];
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && b && typeof b === 'object'
      ? { ...(b as object), ...(v as object) }
      : v;
  }
  return out as Strings;
}

export function stringsFor(code: LocaleCode): Strings {
  const locale = LOCALES.find((l) => l.code === code);
  return locale && locale.code !== 'es' ? merge(es, locale.strings) : es;
}

const KEY = 'rampa.locale';

/**
 * Her explicit choice, otherwise Spanish (006 FR-406: "Spanish first").
 *
 * This used to follow `navigator.language`, which produced a **mixed-language
 * interface** on any machine not set to Spanish: the screens wired to this
 * context switched to the partial English locale while the ones importing `es`
 * directly stayed Spanish. A teacher's first screen read "Let's get you set up"
 * above "¿Dónde guardo tus cosas?". Following the OS was the bug; Spanish is
 * the only fully populated locale and the one a real teacher will validate.
 */
export function detectLocale(): LocaleCode {
  try {
    const saved = localStorage.getItem(KEY) as LocaleCode | null;
    if (saved && LOCALES.some((l) => l.code === saved)) return saved;
  } catch { /* private mode */ }
  return 'es';
}

export function saveLocale(code: LocaleCode): void {
  try { localStorage.setItem(KEY, code); } catch { /* nothing to persist to */ }
}
