import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtemp, readdir, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Vault, recordFor, parseIR, sheetFreshness, stampSignedOff } from '../src/index.js';

/**
 * Asking whether a sheet is stale changes nothing (031 T002, FR-2904, SC-2903).
 *
 * ## Why this is asserted over the whole folder
 *
 * Because the tempting implementation of a second freshness axis is a flag: write
 * `stale: true` onto the sheets when the vocabulary changes, and read it back later. That
 * is faster, it is what `005`'s own data-model.md *documents* (and never shipped), and it
 * is wrong for three reasons this suite pins:
 *
 * - **A→B→A.** Two changes, zero staleness. A flag would say stale; comparing against
 *   what is current says fresh, which is the truth.
 * - **It would touch signed documents.** A signature is about the bytes she signed
 *   (`005` FR-511), and writing a flag into a signed sheet changes them.
 * - **It is a second copy of a truth the filesystem already holds** — `014` SC-1203.
 *
 * So the assertion is the strongest available: every byte of the vault, before and after.
 */
let vault: Vault;
let root: string;

const SHEET = `---
from_extraction: "abc123def456"
adapted_on: "2026-05-12"
kind: "worksheet"
---

::: {#b1 .instruction data-picto="casa=6964"}
Rodea la casa.
:::
`;

const IR = `---
source: "photos"
extraction: {"method": "vision", "verified": true}
---

::: {#b1 .instruction}
Rodea la casa.
:::
`;

/** Every file in the vault with its bytes and its modification time. */
async function fingerprint(dir: string): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const walk = async (at: string, prefix: string): Promise<void> => {
    for (const entry of await readdir(at, { withFileTypes: true })) {
      const path = join(at, entry.name);
      const key = `${prefix}${entry.name}`;
      if (entry.isDirectory()) { await walk(path, `${key}/`); continue; }
      out[key] = `${(await stat(path)).mtimeMs}:${await readFile(path, 'utf8')}`;
    }
  };
  await walk(dir, '');
  return out;
}

beforeEach(async () => {
  root = join(await mkdtemp(join(tmpdir(), 'rampa-fresh-')), 'Rampa');
  vault = new Vault(root);
  await vault.writeRaw('material/job-1/ir.md', IR);
  await vault.writeRaw('material/job-1/E38/adapted.md', SHEET);
});

describe('deriving freshness writes nothing', () => {
  it('the whole vault is byte-identical, and no file was even touched', async () => {
    const before = await fingerprint(root);
    await recordFor(vault, 'E38', {
      drawingFor: () => undefined,   // every drawing changed: maximum staleness
      recordsDrawings: true,
    });
    expect(await fingerprint(root)).toEqual(before);
  });

  it('and the answer really was «stale», so the check above is not vacuous', async () => {
    const entries = await recordFor(vault, 'E38', {
      drawingFor: () => undefined, recordsDrawings: true,
    });
    expect(entries[0]!.freshness?.drawings).toEqual({ state: 'stale', words: ['casa'] });
  });

  it('a signed sheet stays byte-identical, signature included (FR-2904)', async () => {
    /*
     * The sharpest case. A signature is about the bytes she put her name to, so a flag
     * written into a signed sheet would change what she signed — and the sheet would then
     * be «signed» in a state she never saw.
     */
    const signed = stampSignedOff(SHEET, 'la PT', '2026-09-05');
    await vault.writeRaw('material/job-1/E38/adapted.md', signed);
    const before = await fingerprint(root);

    const entries = await recordFor(vault, 'E38', {
      drawingFor: () => undefined, recordsDrawings: true,
    });

    expect(await fingerprint(root)).toEqual(before);
    expect(await vault.readRaw('material/job-1/E38/adapted.md')).toBe(signed);
    // Still signed, and still stale: staleness is derived information, not a state of
    // the document, so it has nothing to say about a signature.
    expect(entries[0]!.signedOff).toBe(true);
    expect(entries[0]!.freshness?.drawings.state).toBe('stale');
  });

  it('and asking twice gives the same answer without a second write', async () => {
    const ask = () => recordFor(vault, 'E38', {
      drawingFor: (w: string) => (w === 'casa' ? '6964' : undefined), recordsDrawings: true,
    });
    const first = await ask();
    const before = await fingerprint(root);
    const second = await ask();
    expect(await fingerprint(root)).toEqual(before);
    expect(second[0]!.freshness).toEqual(first[0]!.freshness);
  });
});

describe('and it is derived, so A→B→A costs nothing', () => {
  it('a choice that went away and came back leaves the sheet fresh', () => {
    // A flag or an event log would have two events recorded and would say stale. What is
    // compared is the sheet against **now**, so the answer is the truth.
    const doc = parseIR(SHEET);
    const away = sheetFreshness(doc, {
      reading: 'abc123def456', drawingFor: () => undefined, recordsDrawings: true,
    });
    const back = sheetFreshness(doc, {
      reading: 'abc123def456', drawingFor: () => '6964', recordsDrawings: true,
    });
    expect(away.drawings.state).toBe('stale');
    expect(back.drawings).toEqual({ state: 'fresh' });
  });
});
