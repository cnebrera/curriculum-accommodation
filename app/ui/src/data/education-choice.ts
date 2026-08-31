import { useCallback, useEffect, useState } from 'react';

/**
 * Which education system her vault uses (011 T011, FR-901).
 *
 * ## Asked, never inferred
 *
 * Not from the OS language, not from a locale, not from a timezone. A teacher in
 * Barcelona whose laptop is in English is not teaching an English curriculum, and a
 * wrong guess puts the wrong course list in front of her with no explanation of why
 * «5.º de Primaria» is missing.
 *
 * ## And stored beside her other preferences, not in the vault
 *
 * Same reasoning as `013`'s display preferences: it is a fact about this teacher on
 * this machine, and a handover packet or a vault backup must not carry it. It is also
 * not per-learner — a PT works in one system, and asking per child would be asking
 * thirty times.
 *
 * `localStorage` rather than a new IPC channel, for the same reason the display
 * preferences use it: it is a renderer preference with no consumer in the main
 * process, and a channel for it would be a channel to keep valid.
 */
const KEY = 'rampa.education-system';

export function useSystemChoice(): [string | null, (id: string) => void] {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    try { setId(window.localStorage.getItem(KEY)); } catch { /* private mode */ }
  }, []);

  const choose = useCallback((next: string) => {
    setId(next);
    try { window.localStorage.setItem(KEY, next); } catch { /* private mode */ }
  }, []);

  return [id, choose];
}
