import { useAsync, useCommand, type Loadable } from './async.js';

/**
 * In cents, never tokens (006 FR-422).
 *
 * `formatted: null` and `unknown > 0` are the honest cases: a service whose model has no
 * published price in `PRICES` reports no cost at all, rather than the invented figure this
 * screen showed until 2026-09-01.
 */
export interface MonthCost {
  formatted: string | null;
  jobs: number;
  unknown: number;
}

export function useMonthCost(): Loadable<MonthCost> {
  return useAsync(() => window.rampa.cost.month() as Promise<MonthCost>, []);
}

/**
 * Told first, not billed first (006 US4-3). A command because the estimate is
 * about the material in front of her, and asking on mount would price a box she
 * has not filled in yet.
 *
 * `formatted: null` when her service's model has no price here; the caller must not
 * print a euro figure it was not given.
 *
 * **The material and the number of sheets, not a total** (`020` T024): the batch rule
 * of `005` FR-515 — three ordinary sheets can be an unusual bill — belongs on the side
 * that judges it, not in a screen multiplying by `learners.length` before it asks.
 */
export function useCostEstimate() {
  return useCommand((materialChars: number, sheets: number) =>
    window.rampa.cost.estimate(materialChars, sheets) as
      Promise<{ unusual: boolean; formatted: string | null }>);
}
