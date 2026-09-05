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

/**
 * The vehicular mark's descriptor (`033` T014).
 *
 * Its own hook and its own channel, never appended to `useAxisDefs`. The ten axes are
 * barriers that travel with a child; the mark is a state with a date on which it stops
 * being true, and a screen that renders it inside the axis grid is a screen telling her
 * they are the same kind of thing.
 *
 * `null` while it loads and if the corpus has no section for it — the editor then shows
 * no mark control at all, which is honest: an unlabelled 0–3 row is something she would
 * score against without knowing what she was scoring.
 */
let markCache: AxisDef | null = null;

export function useMarkDef(): AxisDef | null {
  const [def, setDef] = useState<AxisDef | null>(markCache);
  useEffect(() => {
    if (markCache) return;
    void window.rampa.corpus.mark()
      .then((d) => {
        const found = d as AxisDef | null;
        if (found && Array.isArray(found.levels)) { markCache = found; setDef(found); }
      })
      .catch(() => { /* no mark control rather than an unlabelled one */ });
  }, []);
  return def;
}
