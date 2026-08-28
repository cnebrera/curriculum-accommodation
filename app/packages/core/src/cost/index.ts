/**
 * Cost in cents, never tokens (006 FR-422).
 *
 * A teacher who fears an unknown bill stops using the tool and finds out too
 * late that she should not have worried. The number's job is to end the worry,
 * so it has to be in the units of the worry.
 *
 * Prices are $/million tokens, shipped as data and updated with the corpus.
 */
export interface Price { input: number; output: number; cachedInput?: number; }

export const PRICES: Record<string, Price> = {
  'claude-opus-5':      { input: 5.00, output: 25.00, cachedInput: 0.50 },
  'claude-sonnet-5':    { input: 2.00, output: 10.00, cachedInput: 0.20 },
  'claude-haiku-4-5':   { input: 1.00, output:  5.00, cachedInput: 0.10 },
  'gemini-free':        { input: 0.00, output:  0.00 },
};

export interface Usage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
}

const USD_TO_EUR = 0.92;

/** Cents (euro), rounded up so an estimate is never optimistic. */
export function costCents(u: Usage): number {
  const p = PRICES[u.model] ?? { input: 3, output: 15 };
  const cached = u.cachedInputTokens ?? 0;
  const fresh = Math.max(0, u.inputTokens - cached);
  const usd =
    (fresh / 1e6) * p.input +
    (cached / 1e6) * (p.cachedInput ?? p.input) +
    (u.outputTokens / 1e6) * p.output;
  return Math.ceil(usd * USD_TO_EUR * 100);
}

/** "unos 3 céntimos" · "1,29 €" — never a token count. */
export function formatCost(cents: number): string {
  if (cents === 0) return 'gratis';
  if (cents < 100) return `unos ${cents} céntimo${cents === 1 ? '' : 's'}`;
  return `${(cents / 100).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

export interface CostLedger { month: string; jobs: Array<{ job: string; cents: number; at: string }>; }

export const monthTotal = (l: CostLedger): number => l.jobs.reduce((n, j) => n + j.cents, 0);

/** Warn before a job costs noticeably more than usual (006 US4). */
export const isUnusuallyExpensive = (estimateCents: number, l: CostLedger): boolean => {
  if (l.jobs.length < 3) return estimateCents > 50;
  const avg = monthTotal(l) / l.jobs.length;
  return estimateCents > Math.max(50, avg * 4);
};
