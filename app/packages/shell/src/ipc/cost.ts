import { VAULT, formatCost, monthTotal, isUnusuallyExpensive, costCents, type CostLedger } from '@rampa/core';
import { currentVault } from './vault.js';
import { activeProvider } from './keys.js';
import { handle } from './wrap.js';

/** A teacher fearing an unknown bill stops using the tool (006 FR-422). */
const currentMonth = () => new Date().toISOString().slice(0, 7);

async function ledger(): Promise<CostLedger> {
  const raw = await currentVault().readRaw(VAULT.costs);
  if (!raw) return { month: currentMonth(), jobs: [] };
  try {
    const l = JSON.parse(raw) as CostLedger;
    return l.month === currentMonth() ? l : { month: currentMonth(), jobs: [] };
  } catch { return { month: currentMonth(), jobs: [] }; }
}

/** `cents: null` when the active service's model has no price. See `costCents`. */
export async function recordCost(job: string, cents: number | null): Promise<void> {
  const l = await ledger();
  l.jobs.push({ job, cents, at: new Date().toISOString() });
  await currentVault().writeRaw(VAULT.costs, JSON.stringify(l, null, 2) + '\n');
}

/**
 * A rough estimate from assembled prompt size, before anything is sent (T091).
 *
 * ~4 characters per token is crude and deliberately so: this number exists to
 * decide whether to *ask her*, not to bill anyone. The real cost comes from the
 * provider's own usage report once the job has run.
 */
/*
 * `model` has **no default**, and that is the fix (2026-09-01).
 *
 * It used to default to `claude-sonnet-5` whatever she had connected, so a teacher on
 * Groq — free — was shown an estimate in euros computed from Anthropic's price list. The
 * caller now has to say which model, because only the caller knows.
 */
export function estimateCents(promptChars: number, model: string): number | null {
  const inputTokens = Math.ceil(promptChars / 4);
  return costCents({ model, inputTokens, outputTokens: Math.ceil(inputTokens * 0.4) });
}

export function registerCostIpc(): void {
  /**
   * The month, with `unknown` counting the jobs nobody can price.
   *
   * `formatted` is what the badge shows; when every job of the month is unpriced there is
   * no figure at all, and the renderer says so rather than showing «nada» — which would
   * read as «no has gastado» when the truth is «no lo sé».
   */
  handle('cost:month', async () => {
    const l = await ledger();
    const { cents, unknown } = monthTotal(l);
    const priced = l.jobs.length - unknown;
    return {
      cents, unknown, jobs: l.jobs.length,
      formatted: priced > 0 ? formatCost(cents) : null,
    };
  });
  handle('cost:wouldBeUnusual', async (cents: number) =>
    isUnusuallyExpensive(cents, await ledger()));

  /**
   * What this job would roughly cost, and whether that is out of the ordinary.
   *
   * `cents: null` when her service's model has no published price here. **Not unusual
   * either**: a gate that cannot see a number must not claim the number is large.
   */
  handle('cost:estimate', async (promptChars: number) => {
    const active = await activeProvider();
    const cents = active ? estimateCents(promptChars, active.provider.defaultModel) : null;
    return {
      cents,
      formatted: cents === null ? null : formatCost(cents),
      unusual: cents === null ? false : isUnusuallyExpensive(cents, await ledger()),
    };
  });
}

/** The ledger, for another job's estimate. Read-only. */
export async function currentLedger(): Promise<CostLedger> { return ledger(); }
