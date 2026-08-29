import { parseFrontMatter } from '../vault/parse.js';
import { logger } from '../log.js';

/**
 * The loop's numbers, from the corpus (008 T006, FR-617, research R3).
 *
 * The spec's own assumption: *"the bounded loop's budget is configuration shipped
 * with the corpus, not hardcoded — the numbers will move with real material, and
 * changing them must not be a release."* They live in the front matter of
 * `instructions/ingest.md`, beside the extraction rules they govern, so a
 * contributor loosening the retry bound reads the rules in the same edit.
 *
 * **Clamped, not obeyed.** A corpus is editable content, and `attempts_per_page:
 * 500` on a bad photograph would spend a teacher's money five hundred times. The
 * floor and ceiling are the one part of this that belongs in code, because they
 * protect her from the file rather than implementing it.
 */
export interface IngestBudget {
  attemptsPerPage: number;
  pagesPerJob: number;
  imageLongEdge: number;
  imageQuality: number;
}

export const DEFAULT_BUDGET: IngestBudget = {
  // A third attempt rarely differs from the second and triples the cost of a
  // bad photograph.
  attemptsPerPage: 2,
  // A unit, not a book (007 FR-513).
  pagesPerJob: 20,
  // ~190 DPI for A4: resolves 11pt body text and an exercise rubric. Research R4
  // is explicit that this is a reasoned starting point and not a measurement.
  imageLongEdge: 1600,
  imageQuality: 0.82,
};

/** Bounds that protect her from the file, not values the file chooses. */
const LIMITS = {
  attemptsPerPage: [1, 4],
  pagesPerJob: [1, 100],
  imageLongEdge: [800, 3000],
  imageQuality: [0.5, 0.95],
} as const;

export function parseIngestBudget(raw: string, file = 'instructions/ingest.md'): IngestBudget {
  const { data } = parseFrontMatter(raw, file);

  const read = (key: keyof IngestBudget, yamlKey: string): number => {
    const value = data[yamlKey];
    const fallback = DEFAULT_BUDGET[key];
    if (value === undefined) return fallback;

    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n)) {
      logger.warn('ingest.budget.unreadable', { file, key: yamlKey, value: String(value) });
      return fallback;
    }
    const [lo, hi] = LIMITS[key];
    if (n < lo || n > hi) {
      // Clamped and logged rather than rejected: the rest of the file is still
      // usable, and an ingest that refuses to run because one number is wrong is
      // worse for her than an ingest that runs at the boundary.
      const clamped = Math.min(hi, Math.max(lo, n));
      logger.warn('ingest.budget.clamped', { file, key: yamlKey, asked: n, used: clamped });
      return clamped;
    }
    return n;
  };

  return {
    attemptsPerPage: Math.round(read('attemptsPerPage', 'attempts_per_page')),
    pagesPerJob: Math.round(read('pagesPerJob', 'pages_per_job')),
    imageLongEdge: Math.round(read('imageLongEdge', 'image_long_edge')),
    imageQuality: read('imageQuality', 'image_quality'),
  };
}
