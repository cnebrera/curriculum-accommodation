import { useEffect, useState } from 'react';

/**
 * The axis descriptors, loaded from the corpus (spec 010 T014).
 *
 * They are no longer a literal in this directory: they are calibration guidance
 * about children, and Principle I puts that where a teacher can correct it.
 *
 * The fallback matters. If the corpus file is missing or malformed the interface
 * shows the axis key and no level text — degraded, honest, and never a crash on
 * a screen she is standing on. It must not silently invent descriptors, because
 * an invented one is worse than a visible gap: she would score against it.
 */
export interface AxisDef {
  key: string;
  name: string;
  levels: [string, string, string, string];
}

const KEYS = ['PER-V','PER-A','DEC','LIN','COG','ATE','EJE','MOT','REG','CUR'] as const;

const fallback = (): AxisDef[] =>
  KEYS.map((key) => ({ key, name: key, levels: ['', '', '', ''] }));

let cache: AxisDef[] | null = null;

export function useAxisDefs(): AxisDef[] {
  const [defs, setDefs] = useState<AxisDef[]>(cache ?? fallback());
  useEffect(() => {
    if (cache) return;
    void window.rampa.corpus.axes()
      .then((d: AxisDef[]) => {
        if (Array.isArray(d) && d.length > 0) { cache = d; setDefs(d); }
      })
      .catch(() => { /* keep the fallback; the interface degrades, not breaks */ });
  }, []);
  return defs;
}
