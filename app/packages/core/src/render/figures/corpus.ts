import { parseFrontMatter } from '../../vault/parse.js';
import { logger } from '../../log.js';

/**
 * The diagram judgement, from the corpus (022 T006, `instructions/figures.md`).
 *
 * Which kind of figure teaches which operation, where a diagram stops being one, and the
 * words that describe it to somebody who cannot see it — every one of those is a
 * judgement a PT may correct without touching TypeScript (Principle I).
 *
 * **What is deliberately not here is the markup allowlist.** A security boundary a
 * teacher can edit is not a boundary (Principle IX), so it lives in `validate.ts` and
 * only there. This file is the pedagogy; that file is the wall.
 */

export interface FigureKind {
  /** `grid` · `groups` · `number-line` · `part-whole`. */
  id: string;
  /** How she and the model spell it: «rejilla», «grupos». */
  says: string;
  /** Which operations it suits, as the verifier spells them: `+ − × ÷`. */
  for: string[];
  /** The description template, with `{slots}` the code fills from the exercise. */
  describe: string;
}

export interface FigureBounds {
  maxCells: number;
  maxLineSpan: number;
  maxParts: number;
}

export interface FigureCorpus {
  kinds: FigureKind[];
  bounds: FigureBounds;
  /** The section the propose prompt sends, verbatim. */
  requestFormat: string;
  themeWhenKnown: string;
  themeWhenUnknown: string;
}

/**
 * The fallback, and it **draws nothing**.
 *
 * `audio.md`'s fallback is a real list, because an empty one there would silently turn
 * every spatial exercise into a linear read. Here the safe direction is the opposite: no
 * kinds means no diagram is ever drawn, which loses a feature and cannot produce a wrong
 * picture. A corpus file that fails to load must not fail **open** into a drawing whose
 * bounds and suitability nobody declared.
 */
export const NO_FIGURES: FigureCorpus = {
  kinds: [],
  bounds: { maxCells: 0, maxLineSpan: 0, maxParts: 0 },
  requestFormat: '',
  themeWhenKnown: '',
  themeWhenUnknown: '',
};

/** Bounds clamped against a typo, the way `compose.md`'s budget is (FR-2015). */
const clamp = (v: unknown, lo: number, hi: number, fallback: number): number => {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : NaN;
  return Number.isNaN(n) ? fallback : Math.min(hi, Math.max(lo, n));
};

export function parseFigureCorpus(raw: string, file = 'instructions/figures.md'): FigureCorpus {
  const { data } = parseFrontMatter(raw, file);

  const kinds: FigureKind[] = (Array.isArray(data['kinds']) ? data['kinds'] : [])
    .map((k): FigureKind | null => {
      if (!k || typeof k !== 'object') return null;
      const e = k as Record<string, unknown>;
      const id = str(e['id']);
      const says = str(e['says']);
      const describe = str(e['describe']);
      const ops = (Array.isArray(e['for']) ? e['for'] : [])
        .filter((o): o is string => typeof o === 'string');
      /*
       * A kind missing any of the four is dropped, not defaulted.
       *
       * A kind with no `for` would suit every operation, and a kind with no `describe`
       * would draw a picture that audio and braille cannot say — which is the silent loss
       * FR-2012 exists against. Half a declaration is not a declaration.
       */
      if (!id || !says || !describe || ops.length === 0) {
        logger.warn('figures.kind-incomplete', { file, id: id || '(sin id)' });
        return null;
      }
      return { id, says, for: ops, describe };
    })
    .filter((k): k is FigureKind => k !== null);

  if (kinds.length === 0) {
    logger.warn('figures.no-kinds', { file });
    return NO_FIGURES;
  }

  const b = (data['bounds'] ?? {}) as Record<string, unknown>;
  return {
    kinds,
    bounds: {
      maxCells: clamp(b['max_cells'], 1, 400, 60),
      maxLineSpan: clamp(b['max_line_span'], 1, 200, 30),
      maxParts: clamp(b['max_parts'], 2, 40, 8),
    },
    requestFormat: str(data['request_format']),
    themeWhenKnown: str(data['theme_when_known']),
    themeWhenUnknown: str(data['theme_when_unknown']),
  };
}

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/** The kind she named, by its corpus spelling. Unknown spelling is **no** kind. */
export const kindSaying = (corpus: FigureCorpus, says: string): FigureKind | undefined =>
  corpus.kinds.find((k) => k.says.toLowerCase() === says.trim().toLowerCase());

export const kindById = (corpus: FigureCorpus, id: string): FigureKind | undefined =>
  corpus.kinds.find((k) => k.id === id);

/**
 * Fill a description template with the quantities the code computed.
 *
 * Interpolation and nothing else: an absent slot leaves its own name visible rather than
 * an empty gap, so a corpus typo reads as a typo instead of as a sentence about nothing.
 */
export function fillDescription(
  template: string, slots: Readonly<Record<string, string | number>>,
): string {
  return template.trim().replace(/\{(\w+)\}/g, (whole, name: string) => {
    const v = slots[name];
    return v === undefined ? whole : String(v);
  });
}
