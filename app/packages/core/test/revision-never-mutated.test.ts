import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  Vault, listRevisions, archivePrevious, restoreRevision, stampSignedOff,
  revisionDiff, recordFor, type RevisionSite,
} from '../src/index.js';

/**
 * A revision is never edited in place, and a signature never moves
 * (026 T001/T025, FR-2402/FR-2403, `005` FR-511, SC-2403).
 *
 * ## Why over the vault and not over the UI
 *
 * Because the UI is not what a photocopier reads. Both halves of SC-2403 are claims about
 * **files**: that every revision a turn produces carries the draft mark until its own
 * sign-off, and that a signed revision's file is byte-identical after any number of later
 * turns and restores.
 *
 * The second is the sharper one. A signature is a teacher putting her name to a document
 * a child will sit an exam with; if a later turn could move it — or a restore could carry
 * it onto content nobody signed — she would be signing for material she never saw.
 */
let vault: Vault;
const SITE: RevisionSite = { dir: 'material/job-1/E38', stem: 'adapted' };

const sheet = (n: number): string => `---
extraction:
  verified: true
adapted_on: "2026-09-05"
---

::: {#b1 .instruction}
Resuelve estas multiplicaciones.
:::

::: {#e1 .exercise}
1. ${n} × 3 =
:::
`;

beforeEach(async () => {
  vault = new Vault(join(await mkdtemp(join(tmpdir(), 'rampa-rev-')), 'Rampa'));
  await vault.ensureDir(SITE.dir);
});

/** One turn: archive what is there, write the new working file. The order `runTurn` uses. */
const turn = async (content: string): Promise<void> => {
  await archivePrevious(vault, SITE);
  await vault.writeRaw(`${SITE.dir}/${SITE.stem}.md`, content);
};

describe('every revision is a file, and the numbers only grow', () => {
  it('a first version is revision 1, working, with nothing archived', async () => {
    await turn(sheet(4));
    const revisions = await listRevisions(vault, SITE);
    expect(revisions).toHaveLength(1);
    expect(revisions[0]).toMatchObject({ n: 1, current: true, signed: false });
  });

  it('three turns leave three revisions, the last one working', async () => {
    await turn(sheet(4));
    await turn(sheet(5));
    await turn(sheet(6));
    const revisions = await listRevisions(vault, SITE);
    expect(revisions.map((r) => r.n)).toEqual([1, 2, 3]);
    expect(revisions.filter((r) => r.current)).toHaveLength(1);
    expect(revisions.at(-1)!.current).toBe(true);
  });

  it('and every earlier revision is still on disk, unedited', async () => {
    await turn(sheet(4));
    const first = (await vault.readRaw(`${SITE.dir}/${SITE.stem}.md`))!;
    await turn(sheet(5));
    await turn(sheet(6));
    // Byte-identical: a turn archives, it does not rewrite.
    expect(await vault.readRaw(`${SITE.dir}/adapted.r1.md`)).toBe(first);
  });
});

describe('the draft mark survives every turn until its own sign-off', () => {
  it('a fresh revision is unsigned', async () => {
    await turn(sheet(4));
    expect((await listRevisions(vault, SITE)).at(-1)!.signed).toBe(false);
  });

  it('signing marks that revision and no other', async () => {
    await turn(sheet(4));
    await turn(sheet(5));
    const working = `${SITE.dir}/${SITE.stem}.md`;
    await vault.writeRaw(working,
      stampSignedOff((await vault.readRaw(working))!, 'la PT', '2026-09-05'));

    const revisions = await listRevisions(vault, SITE);
    expect(revisions.map((r) => r.signed)).toEqual([false, true]);
  });

  /**
   * The half that matters most: **a new turn starts a new, unsigned revision**.
   *
   * If a turn could carry the `review` block forward, the sheet she signed and the sheet
   * she gets would be different documents with the same signature on them. `runTurn`
   * strips it structurally (T008); this asserts the consequence over the files.
   */
  it('a turn after a sign-off leaves the signed file signed and the new one unsigned', async () => {
    await turn(sheet(4));
    const working = `${SITE.dir}/${SITE.stem}.md`;
    await vault.writeRaw(working,
      stampSignedOff((await vault.readRaw(working))!, 'la PT', '2026-09-05'));
    const signedBytes = (await vault.readRaw(working))!;

    // The turn's output carries no `review` block — which is what `runTurn` guarantees.
    await turn(sheet(5));

    const revisions = await listRevisions(vault, SITE);
    expect(revisions.map((r) => ({ n: r.n, signed: r.signed })))
      .toEqual([{ n: 1, signed: true }, { n: 2, signed: false }]);
    // And the signed file is byte-identical to what she signed.
    expect(await vault.readRaw(`${SITE.dir}/adapted.r1.md`)).toBe(signedBytes);
  });
});

describe('restoring archives, and never moves a signature', () => {
  it('the current file is archived before the chosen one is written back', async () => {
    await turn(sheet(4));
    await turn(sheet(5));
    await turn(sheet(6));

    const { nowCurrent } = await restoreRevision(vault, SITE, 1);

    // «Volver a la uno» never costs her the three: four revisions now, not two.
    const revisions = await listRevisions(vault, SITE);
    expect(revisions.map((r) => r.n)).toEqual([1, 2, 3, 4]);
    expect(nowCurrent).toBe(4);
    expect(await vault.readRaw(`${SITE.dir}/${SITE.stem}.md`)).toBe(sheet(4));
    // And nothing was renumbered: revision 3 is still what it was.
    expect(await vault.readRaw(`${SITE.dir}/adapted.r3.md`)).toBe(sheet(6));
  });

  it('restoring a signed revision restores a signed document', async () => {
    /*
     * Not a special case: the signature is in the content, so copying the content copies
     * it. That is what «the signature belongs to the sheet» means (`005` FR-511) — and it
     * is why nothing here has to move a signature, which is the operation that would
     * make one land on a document nobody read.
     */
    await turn(stampSignedOff(sheet(4), 'la PT', '2026-09-05'));
    await turn(sheet(5));
    await restoreRevision(vault, SITE, 1);

    const revisions = await listRevisions(vault, SITE);
    expect(revisions.find((r) => r.current)!.signed).toBe(true);
    // And the revision that was signed is still signed, on its own file, unchanged.
    expect(revisions.find((r) => r.n === 1)!.signed).toBe(true);
  });

  it('and restoring an unsigned one leaves the working document unsigned', async () => {
    await turn(sheet(4));
    await turn(stampSignedOff(sheet(5), 'la PT', '2026-09-05'));
    await restoreRevision(vault, SITE, 1);
    expect((await listRevisions(vault, SITE)).find((r) => r.current)!.signed).toBe(false);
  });

  it('a revision she tidied away by hand is answered, not crashed on', async () => {
    // The vault is hers and she may tidy it. A channel that throws an unhandled error on
    // a missing file is a channel that turns her housekeeping into a bug report.
    await turn(sheet(4));
    await expect(restoreRevision(vault, SITE, 7)).rejects.toThrow(/revision-missing/);
  });
});

describe('a composition uses the same mechanism, with its own stem', () => {
  const IR: RevisionSite = { dir: 'material/job-2', stem: 'ir' };

  it('archives `ir.rN.md` and lists them the same way', async () => {
    await vault.ensureDir(IR.dir);
    await vault.writeRaw(`${IR.dir}/ir.md`, sheet(4));
    await archivePrevious(vault, IR);
    await vault.writeRaw(`${IR.dir}/ir.md`, sheet(5));

    const revisions = await listRevisions(vault, IR);
    expect(revisions.map((r) => r.n)).toEqual([1, 2]);
    expect(revisions[0]!.path).toBe('material/job-2/ir.r1.md');
    // And the two families do not see each other's files.
    expect(await listRevisions(vault, SITE)).toEqual([]);
  });
});

describe('what changed, derived from the two files (FR-2404)', () => {
  it('names what was removed, in her units', () => {
    const diff = revisionDiff(sheet(4), `---
extraction:
  verified: true
---

::: {#b1 .instruction}
Resuelve estas multiplicaciones.
:::
`);
    expect(diff.empty).toBe(false);
    expect(diff.sentences.join(' ')).toContain('He quitado 1 ejercicio (e1)');
  });

  it('and separates a change of numbers from a change of wording', () => {
    // She has a verified key in her hand: «he cambiado los números» is the sentence that
    // makes her check it, and folding it into «he cambiado e1» would hide it.
    const numbers = revisionDiff(sheet(4), sheet(7));
    expect(numbers.sentences.join(' ')).toContain('los números');
    expect(numbers.sentences.join(' ')).toContain('Comprueba la hoja de soluciones');

    const wording = revisionDiff(sheet(4), sheet(4).replace('Resuelve estas', 'Haz estas'));
    expect(wording.sentences.join(' ')).toContain('sin tocar las cantidades');
    expect(wording.sentences.join(' ')).not.toContain('los números');
  });

  it('an identical document is an empty diff, which mints no revision', () => {
    expect(revisionDiff(sheet(4), sheet(4)).empty).toBe(true);
    expect(revisionDiff(sheet(4), sheet(4)).sentences).toEqual([]);
  });

  /**
   * The model's own account is content, and is not consulted.
   *
   * A turn whose output includes «he quitado tres ejercicios» in a report-notes block has
   * said something about itself. The diff is computed from the blocks, so what it says is
   * simply another block — and here it says nothing was removed, because nothing was.
   */
  it('the model’s own summary changes nothing about what is reported', () => {
    const boasting = sheet(4).replace('::: {#e1 .exercise}',
      '::: {#n1 .report-notes}\nHe quitado tres ejercicios y he simplificado todo.\n:::\n\n'
      + '::: {#e1 .exercise}');
    const diff = revisionDiff(sheet(4), boasting);
    expect(diff.sentences.join(' ')).toContain('He añadido 1 bloque (n1)');
    expect(diff.sentences.join(' ')).not.toContain('quitado');
  });
});

/**
 * The record says which revision was signed, and that later ones exist
 * (026 T026, FR-2412).
 *
 * `signedOff` alone answers about the **working** file, so a turn after a sign-off turns
 * it `false` — and the record would then say «sin firmar» about a document she remembers
 * signing. Six weeks later she needs both halves: that revision 2 was signed, and that
 * there is a revision 3 nobody has read.
 */
describe('what the record can say about a document with revisions', () => {
  it('names the signed revision even when a later one is working', async () => {
    await vault.ensureDir('material/job-1/E38');
    await vault.writeRaw('material/job-1/ir.md', sheet(4));
    await turn(stampSignedOff(sheet(4), 'la PT', '2026-09-05'));
    await turn(sheet(5));

    const entries = await recordFor(vault, 'E38');
    const entry = entries.find((e) => e.jobId === 'job-1')!;
    expect(entry.signedOff, 'the working revision is not signed').toBe(false);
    expect(entry.signedRevision, 'and the record forgot she ever signed').toBe(1);
    expect(entry.revision).toBe(2);
  });

  it('and says nothing about a signed revision when there has never been one', async () => {
    await vault.ensureDir('material/job-1/E38');
    await vault.writeRaw('material/job-1/ir.md', sheet(4));
    await turn(sheet(4));
    const entry = (await recordFor(vault, 'E38')).find((e) => e.jobId === 'job-1')!;
    expect(entry.signedRevision).toBeUndefined();
  });
});
