/**
 * Cost in cents, never tokens (006 FR-422).
 *
 * A teacher who fears an unknown bill stops using the tool and finds out too
 * late that she should not have worried. The number's job is to end the worry,
 * so it has to be in the units of the worry.
 *
 * Prices are $/million tokens. **They are compiled in, and the comment here used to
 * claim they were «shipped as data and updated with the corpus» — they are not.** Two
 * consequences, both recorded in backlog G29 rather than fixed here: the table covers
 * four models of the six services the catalogue offers, and every catalogue entry says
 * `cost_measured: false`, meaning nobody has ever checked what a worksheet actually
 * costs. What `costCents` does about the first is refuse to guess.
 */
export interface Price {
  input: number;
  output: number;
  /** Reading a cached prefix: the discount the cost estimate depends on. */
  cachedInput?: number;
  /** Writing the cache on the first job of a corpus version. Costs a premium. */
  cacheWrite?: number;
}

export const PRICES: Record<string, Price> = {
  'claude-opus-5':      { input: 5.00, output: 25.00, cachedInput: 0.50, cacheWrite: 6.25 },
  'claude-sonnet-5':    { input: 2.00, output: 10.00, cachedInput: 0.20, cacheWrite: 2.50 },
  'claude-haiku-4-5':   { input: 1.00, output:  5.00, cachedInput: 0.10, cacheWrite: 1.25 },
  'gemini-free':        { input: 0.00, output:  0.00 },
};

export interface Usage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
  cacheWriteTokens?: number;
}

/**
 * Shipped as data with the corpus, not compiled in, so a moving rate is an
 * update and not a release. Last checked 2026-08-28; it drifts, and the number
 * the teacher is shown should not quietly drift with it.
 */
export const USD_TO_EUR = 0.92;

/** Cents (euro), rounded up so an estimate is never optimistic. */
/**
 * What a call cost, or **null when nobody knows** (from use, 2026-09-01).
 *
 * ## The defect this closes
 *
 * It used to fall back to `{ input: 3, output: 15 }` for any model not in the table
 * above — and the table has four entries while the catalogue offers six services. The
 * `compatible` adapter reports the model the corpus names, so `llama-3.3-70b-versatile`,
 * `mistral-large-latest`, `deepseek-chat` and `gpt-4.1` **all** landed on that fallback:
 * roughly Claude's prices, applied to whatever she had connected.
 *
 * Including Groq, which is **free**. Rampa was telling a teacher she had spent money she
 * had not spent, in euros, in her own currency, on a screen she has no way to check
 * against — and this application's argument for showing cost at all is that an unknown
 * bill stops her using it.
 *
 * So: no price, no figure. Every caller has to say «no lo sé» instead, which is the
 * honest answer and the one this project takes everywhere else — the same rule as an
 * unobserved axis, an unverifiable exercise, and a criterio it will not invent.
 *
 * Carlos asked the question that found it: «¿eso está midiendo cuánto has gastado del
 * token al que te conectas?»
 */
export function costCents(u: Usage): number | null {
  const p = PRICES[u.model];
  if (!p) return null;
  const cached = u.cachedInputTokens ?? 0;
  const written = u.cacheWriteTokens ?? 0;
  const fresh = Math.max(0, u.inputTokens - cached - written);
  const usd =
    (fresh / 1e6) * p.input +
    (cached / 1e6) * (p.cachedInput ?? p.input) +
    (written / 1e6) * (p.cacheWrite ?? p.input) +
    (u.outputTokens / 1e6) * p.output;
  return Math.ceil(usd * USD_TO_EUR * 100);
}

/** "unos 3 céntimos" · "1,29 €" — never a token count. */
export function formatCost(cents: number): string {
  /*
   * «nada», not «gratis» (from use, 2026-09-01).
   *
   * Carlos, seeing the rail's badge: «¿qué coño es eso de este mes gratis? que esto es
   * open source y libre!» — and he is right about the register. This function formats
   * **what she has spent**, and «gratis» is the vocabulary of a plan somebody is selling:
   * «Este mes: gratis» reads as a promotion that expires, in an application whose whole
   * pitch is that there is nothing to sell and she pays her own provider directly.
   *
   * «Este mes: nada» says the same number and claims nothing. And it stays right in the
   * other place this function appears, an estimate before a run: «va a costar nada».
   *
   * The service catalogue keeps its own «gratis», and that one is correct — there it
   * describes a provider's free tier, which is a fact about their plan rather than about
   * her spending.
   */
  if (cents === 0) return 'nada';
  if (cents < 100) return `unos ${cents} céntimo${cents === 1 ? '' : 's'}`;
  return `${(cents / 100).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

/**
 * `cents: null` for a job whose price nobody knows — see `costCents`.
 *
 * Recorded rather than dropped: «three jobs I cannot price» is a fact about her month,
 * and silently counting them as zero would understate a bill while looking precise.
 */
export interface CostLedger {
  month: string;
  jobs: Array<{ job: string; cents: number | null; at: string }>;
}

export interface MonthCost {
  /** What is known, in cents. */
  cents: number;
  /** How many jobs could not be priced at all. */
  unknown: number;
}

export const monthTotal = (l: CostLedger): MonthCost => ({
  cents: l.jobs.reduce((n, j) => n + (j.cents ?? 0), 0),
  unknown: l.jobs.filter((j) => j.cents === null).length,
});

/** Warn before a job costs noticeably more than usual (006 US4). */
export const isUnusuallyExpensive = (estimateCents: number, l: CostLedger): boolean => {
  // Only the jobs that have a price can say what «usual» is. An unpriced job counted as
  // zero would drag the average down and stop the gate firing when it should.
  const priced = l.jobs.filter((j): j is { job: string; cents: number; at: string } =>
    j.cents !== null);
  if (priced.length < 3) return estimateCents > 50;
  const avg = priced.reduce((n, j) => n + j.cents, 0) / priced.length;
  return estimateCents > Math.max(50, avg * 4);
};

/**
 * Adding up a job's chunks, where **not knowing is contagious** (2026-09-01).
 *
 * Six places accumulate `cents += provider.price(chunk.usage)` over a stream. Once a
 * price can be unknown, `+` is the wrong operator: `null` treated as zero would turn
 * «no sé lo que ha costado» into «no ha costado nada», which is the same lie the
 * invented fallback told, only quieter.
 *
 * So one unknown chunk makes the whole job unknown. A job is what she sees, and a total
 * that is right about four fifths of itself is not a total.
 */
export const addCost = (a: number | null, b: number | null): number | null =>
  a === null || b === null ? null : a + b;
