import { VAULT, formatCost, monthTotal, isUnusuallyExpensive, type CostLedger } from '@rampa/core';
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

export function registerCostIpc(): void {
  handle('cost:month', async () => {
    const l = await ledger();
    const cents = monthTotal(l);
    return { cents, formatted: formatCost(cents), jobs: l.jobs.length };
  });
  handle('cost:wouldBeUnusual', async (estimateCents: number) =>
    isUnusuallyExpensive(estimateCents, await ledger()));
}
