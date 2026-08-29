import { VAULT, formatCost, monthTotal, isUnusuallyExpensive, costCents, type CostLedger } from '@rampa/core';
import { currentVault } from './vault.js';
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

export async function recordCost(job: string, cents: number): Promise<void> {
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
export function estimateCents(promptChars: number, model = 'claude-sonnet-5'): number {
  const inputTokens = Math.ceil(promptChars / 4);
  return costCents({ model, inputTokens, outputTokens: Math.ceil(inputTokens * 0.4) });
}

export function registerCostIpc(): void {
  handle('cost:month', async () => {
    const l = await ledger();
    const cents = monthTotal(l);
    return { cents, formatted: formatCost(cents), jobs: l.jobs.length };
  });
  handle('cost:wouldBeUnusual', async (cents: number) =>
    isUnusuallyExpensive(cents, await ledger()));

  /** What this job would roughly cost, and whether that is out of the ordinary. */
  handle('cost:estimate', async (promptChars: number) => {
    const cents = estimateCents(promptChars);
    return {
      cents,
      formatted: formatCost(cents),
      unusual: isUnusuallyExpensive(cents, await ledger()),
    };
  });
}

/** The ledger, for another job's estimate. Read-only. */
export async function currentLedger(): Promise<CostLedger> { return ledger(); }
