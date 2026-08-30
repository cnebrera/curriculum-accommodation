import { useAsync, useCommand, type Loadable } from './async.js';

/** In cents, never tokens (006 FR-422). */
export function useMonthCost(): Loadable<{ formatted: string; jobs: number }> {
  return useAsync(() =>
    window.rampa.cost.month() as Promise<{ formatted: string; jobs: number }>, []);
}

/**
 * Told first, not billed first (006 US4-3). A command because the estimate is
 * about the material in front of her, and asking on mount would price a box she
 * has not filled in yet.
 */
export function useCostEstimate() {
  return useCommand((chars: number) =>
    window.rampa.cost.estimate(chars) as Promise<{ unusual: boolean; formatted: string }>);
}
