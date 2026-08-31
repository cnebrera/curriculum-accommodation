import { parseFrontMatter } from '../vault/parse.js';
import { logger } from '../log.js';

/**
 * The compose loop's numbers, from the corpus (002 T011, FR-124).
 *
 * Same shape and same reasoning as `parseIngestBudget`: the bound on a loop that
 * spends her money is corpus, because it will move with real material, and the
 * **clamp** is code, because it protects her from the file rather than
 * implementing it.
 *
 * The one worth explaining is `proposalsPerObjective`. It is a shared pool rather
 * than a retry count per exercise, because the failures cluster — a model that has
 * misunderstood «con llevadas» produces twenty bad exercises, not one bad and
 * nineteen good. A pool stops early on that; per-exercise retries pay for all
 * twenty.
 */
export interface ComposeBudgetLimits {
  exercisesPerObjective: number;
  proposalsPerObjective: number;
  objectivesPerJob: number;
  /** The anchor is her paste, and a paste can be a whole textbook chapter. */
  anchorMaxChars: number;
  anchorMaxPassages: number;
}

export const DEFAULT_COMPOSE_BUDGET: ComposeBudgetLimits = {
  exercisesPerObjective: 10,
  proposalsPerObjective: 30,
  objectivesPerJob: 6,
  anchorMaxChars: 20_000,
  anchorMaxPassages: 40,
};

/** Bounds that protect her from the file, not values the file chooses. */
const LIMITS = {
  exercisesPerObjective: [1, 40],
  proposalsPerObjective: [1, 200],
  objectivesPerJob: [1, 20],
  anchorMaxChars: [500, 200_000],
  anchorMaxPassages: [1, 200],
} as const;

export function parseComposeBudget(
  raw: string, file = 'instructions/compose.md',
): ComposeBudgetLimits {
  const { data } = parseFrontMatter(raw, file);

  const read = (key: keyof ComposeBudgetLimits, yamlKey: string): number => {
    const value = data[yamlKey];
    const fallback = DEFAULT_COMPOSE_BUDGET[key];
    if (value === undefined) return fallback;

    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n)) {
      logger.warn('compose.budget.unreadable', { file, key: yamlKey, value: String(value) });
      return fallback;
    }
    const [lo, hi] = LIMITS[key];
    if (n < lo || n > hi) {
      const clamped = Math.min(hi, Math.max(lo, n));
      logger.warn('compose.budget.clamped', { file, key: yamlKey, asked: n, used: clamped });
      return clamped;
    }
    return n;
  };

  return {
    exercisesPerObjective: Math.round(read('exercisesPerObjective', 'exercises_per_objective')),
    proposalsPerObjective: Math.round(read('proposalsPerObjective', 'proposals_per_objective')),
    objectivesPerJob: Math.round(read('objectivesPerJob', 'objectives_per_job')),
    anchorMaxChars: Math.round(read('anchorMaxChars', 'anchor_max_chars')),
    anchorMaxPassages: Math.round(read('anchorMaxPassages', 'anchor_max_passages')),
  };
}
