import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { detectLocale, saveLocale, stringsFor, LOCALES, type LocaleCode, type Strings } from './index.js';

interface Ctx { t: Strings; locale: LocaleCode; setLocale: (c: LocaleCode) => void; locales: typeof LOCALES }

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(detectLocale);
  const value = useMemo<Ctx>(() => ({
    t: stringsFor(locale),
    locale,
    setLocale: (c) => { saveLocale(c); setLocaleState(c); },
    locales: LOCALES,
  }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Components read strings through this rather than importing `es` directly. */
export function useStrings(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useStrings fuera de I18nProvider');
  return ctx;
}
