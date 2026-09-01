import { describe, it, expect, beforeEach } from 'vitest';
import { readFile, readdir, mkdtemp, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { Vault, parseIR, readingFingerprint, stampReading } from '@rampa/core';
import { staleSheets, notFromCurrentReading } from '../src/jobs/stale.js';

/**
 * She corrects the reading after the sheets are made (005 T030, FR-520).
 *
 * The scenario, end to end and on a real directory: she photographs a worksheet,
 * adapts it for two learners, then notices Rampa read «47 × 8» as «4/ × 8» and fixes
 * it. Both sheets on her desk were made from the wrong reading.
 *
 * ## The clause a helpful fix breaks
 *
 * FR-520 has three parts, and the third — «MUST NOT re-run anything on its own» —
 * is the one that dies quietly. The obvious next commit after «tell her which sheets
 * are stale» is «and offer to fix them», and the obvious commit after *that* is «and
 * just do it, she clearly wants it». That last one spends her money on a decision she
 * did not make, on the day she was already annoyed enough to correct a reading.
 *
 * So the assertions here are as much about absence as presence: asking the question
 * writes nothing, and the module that answers it imports nothing that could adapt.
 */

const IR = (exercise: string, verified = true): string =>
  '---\nsource: "photos"\n'
  + `extraction: {"method": "vision", "verified": ${verified}}\n---\n\n`
  + '::: {#b1 .instruction}\nResuelve.\n:::\n\n'
  + `::: {#b2 .exercise data-number="1"}\n${exercise}\n:::\n`;

const SHEET = '---\nadapted_on: "2026-05-12"\nkind: "worksheet"\n---\n\n'
  + '::: {#b2 .exercise data-from="b2"}\nUna multiplicación\n:::\n';

let root: string;
let vault: Vault;

beforeEach(async () => {
  root = join(await mkdtemp(join(tmpdir(), 'rampa-stale-')), 'Rampa');
  vault = new Vault(root);
});

/** The vault as `005` leaves it: one extraction, two sheets stamped from it. */
async function seed(exercise = '47 × 8 =', stamp: string | null = null): Promise<void> {
  const ir = IR(exercise);
  await vault.writeRaw('material/job-1/ir.md', ir);
  const fingerprint = stamp ?? readingFingerprint(parseIR(ir));
  for (const code of ['E38', 'E41']) {
    await vault.writeRaw(`material/job-1/${code}/adapted.md`,
      stamp === null ? stampReading(SHEET, fingerprint) : SHEET);
  }
}

describe('a sheet made from a reading she has since corrected', () => {
  it('is fresh while nothing has changed', async () => {
    await seed();
    expect(await staleSheets(vault, 'job-1')).toEqual([
      { learner: 'E38', freshness: 'fresh' },
      { learner: 'E41', freshness: 'fresh' },
    ]);
    expect(notFromCurrentReading(await staleSheets(vault, 'job-1'))).toEqual([]);
  });

  it('is stale, by learner, once she fixes the reading', async () => {
    await seed('4/ × 8 =');
    // What `ingest:correctAndConfirm` does: her words become the block's content.
    await vault.writeRaw('material/job-1/ir.md', IR('47 × 8 ='));

    const rows = notFromCurrentReading(await staleSheets(vault, 'job-1'));
    expect(rows.map((r) => r.learner)).toEqual(['E38', 'E41']);
    expect(rows.every((r) => r.freshness === 'stale')).toBe(true);
  });

  it('stays fresh when she confirms a page she did not change', async () => {
    /*
     * The case that decided the mechanism, and the reason G23's own preferred
     * option was dropped. `setPageVerified` rewrites `ir.md` on every confirmation
     * — here, flipping `verified` — so a date or a modification time would report
     * both of these sheets stale for a click that changed nothing she can see.
     */
    await seed();
    const before = await stat(join(root, 'material', 'job-1', 'ir.md'));
    await vault.writeRaw('material/job-1/ir.md', IR('47 × 8 =', false));
    const after = await stat(join(root, 'material', 'job-1', 'ir.md'));
    expect(after.mtimeMs).not.toBe(before.mtimeMs);   // the file did change

    expect(notFromCurrentReading(await staleSheets(vault, 'job-1'))).toEqual([]);
  });

  it('says «no lo sé» about a sheet made before any of this existed', async () => {
    await seed('47 × 8 =', 'no-stamp');
    const rows = await staleSheets(vault, 'job-1');
    expect(rows.every((r) => r.freshness === 'unknown')).toBe(true);
  });

  it('has nothing to say about a job with no sheets yet', async () => {
    await vault.writeRaw('material/job-2/ir.md', IR('47 × 8 ='));
    expect(await staleSheets(vault, 'job-2')).toEqual([]);
  });
});

describe('asking the question changes nothing', () => {
  it('writes no file and starts no adaptation', async () => {
    await seed('4/ × 8 =');
    await vault.writeRaw('material/job-1/ir.md', IR('47 × 8 ='));

    const listing = async (): Promise<string[]> => {
      const out: string[] = [];
      for (const code of ['E38', 'E41']) {
        for (const f of await readdir(join(root, 'material', 'job-1', code))) out.push(`${code}/${f}`);
      }
      return out.sort();
    };
    const before = await listing();
    const sheetBefore = await vault.readRaw('material/job-1/E38/adapted.md');

    await staleSheets(vault, 'job-1');

    // No revision, no rewritten sheet, no `stale: true` stamped into anything.
    expect(await listing()).toEqual(before);
    expect(await vault.readRaw('material/job-1/E38/adapted.md')).toBe(sheetBefore);
    expect(sheetBefore).not.toContain('stale');
  });

  it('imports nothing that could adapt, ingest or reach a provider', async () => {
    /*
     * The structural half, in the shape `batch.test.ts` established. A future edit
     * that wanted this to «just re-run the two stale ones» would have to add an
     * import here, and adding it fails this test — so the decision surfaces in a
     * review instead of arriving as a convenience.
     */
    const src = await readFile(
      join(dirname(new URL(import.meta.url).pathname), '..', 'src', 'jobs', 'stale.ts'), 'utf8');
    const imports = [...src.matchAll(/^\s*import\s[^;]*from\s+['"]([^'"]+)['"]/gm)].map((m) => m[1]);
    expect(imports.filter((i) => /adapt|batch|provider|keys|ingest/i.test(i ?? ''))).toEqual([]);
    expect(imports).toEqual(['@rampa/core']);
  });
});
