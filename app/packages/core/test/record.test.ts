import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Vault, recordFor, learnersOf, schoolYearOf } from '../src/index.js';

/**
 * The learner's record (014 T001-T008).
 *
 * The record is **derived**. Every case here builds a vault by writing the files
 * `005` writes, then asks what a learner has been given — and nothing anywhere
 * writes a record for it to read back. SC-1203 is the whole design: delete
 * `record.md`, reopen the learner, get the same list.
 *
 * The fixture that matters most is the last one: a vault with **no `adapted_on`
 * stamp at all**, which is every vault that exists today. If the record can only
 * be built going forward, this feature ships with the history it exists to show
 * already lost (FR-1204).
 */
let vault: Vault;

beforeEach(async () => {
  vault = new Vault(join(await mkdtemp(join(tmpdir(), 'rampa-record-')), 'Rampa'));
});

/** The files a job leaves behind, written the way the pipeline writes them. */
async function seedJob(jobId: string, learners: string[], opts: {
  source?: 'file' | 'pasted' | 'composed';
  stamp?: string;
  signedOff?: boolean;
  kind?: string;
  revisions?: number;
} = {}): Promise<void> {
  const { source = 'pasted', stamp = '2026-05-12', signedOff = false, kind = 'worksheet' } = opts;

  const irFm = source === 'composed'
    ? 'source: "generated"\nobjectives:\n  - "Multiplicar con llevadas"\nanchor: "MAT.3.A.2.7"'
    : source === 'file' ? 'source: "photos"' : 'source: "pegado"';
  await vault.writeRaw(`material/${jobId}/ir.md`,
    `---\n${irFm}\nextraction: {"verified": true}\n---\n\n::: {#b1 .explanation}\nHola\n:::\n`);

  if (source === 'file') {
    await vault.writeRaw(`material/${jobId}/source/pagina-1.txt`, 'una foto, en espíritu');
  }

  for (const learner of learners) {
    const review = signedOff ? 'review:\n  signed_off: true\n  by: "PT"\n  date: "2026-05-13"\n' : '';
    await vault.writeRaw(`material/${jobId}/${learner}/adapted.md`,
      `---\n${review}adapted_on: "${stamp}"\nschool_year: "${schoolYearOf(stamp)}"\n`
      + `kind: "${kind}"\nsubject: "Naturales"\n---\n\n::: {#b1 .explanation}\nHola\n:::\n`);
    await vault.writeRaw(`material/${jobId}/${learner}/report.md`, '# Informe\n');
    for (let r = 1; r <= (opts.revisions ?? 0); r++) {
      await vault.writeRaw(`material/${jobId}/${learner}/adapted.r${r}.md`, '# vieja\n');
    }
    await vault.writeRaw(`output/${jobId}/${learner}/sheet.html`, '<p>hola</p>');
  }
}

describe('everything ever made for one learner', () => {
  it('lists a job that was adapted for her', async () => {
    await seedJob('job-a', ['E38']);
    const record = await recordFor(vault, 'E38');

    expect(record).toHaveLength(1);
    expect(record[0]).toMatchObject({
      jobId: 'job-a', learner: 'E38', date: '2026-05-12',
      schoolYear: '2025-2026', kind: 'worksheet', subject: 'Naturales',
      signedOff: false, revision: 1,
    });
  });

  /**
   * Principle IV, and the reason the files do not move. `005` made this the
   * normal case rather than a curiosity.
   */
  it('shows one shared worksheet in both learners\' records, stored once', async () => {
    await seedJob('job-a', ['E38', 'M12']);

    const hers = await recordFor(vault, 'E38');
    const his = await recordFor(vault, 'M12');

    expect(hers).toHaveLength(1);
    expect(his).toHaveLength(1);
    // The same extraction...
    expect(hers[0]!.documents.ir).toBe(his[0]!.documents.ir);
    // ...and her own adaptation.
    expect(hers[0]!.documents.adapted).not.toBe(his[0]!.documents.adapted);
  });

  it('does not show a job that was never adapted for anybody', async () => {
    await vault.writeRaw('material/job-orphan/ir.md', '---\nsource: "pegado"\n---\n\ntexto\n');
    expect(await recordFor(vault, 'E38')).toEqual([]);
    expect(await learnersOf(vault, 'job-orphan')).toEqual([]);
  });

  it('does not show another learner\'s work', async () => {
    await seedJob('job-a', ['M12']);
    expect(await recordFor(vault, 'E38')).toEqual([]);
  });

  it('puts the newest first', async () => {
    await seedJob('job-old', ['E38'], { stamp: '2025-11-03' });
    await seedJob('job-new', ['E38'], { stamp: '2026-05-12' });
    expect((await recordFor(vault, 'E38')).map((e) => e.jobId)).toEqual(['job-new', 'job-old']);
  });

  /** Principle VII. Hiding it would mean the one thing she cannot find is the
   *  thing she abandoned halfway. */
  it('shows an unsigned draft, marked unsigned', async () => {
    await seedJob('job-a', ['E38'], { signedOff: false });
    await seedJob('job-b', ['E38'], { signedOff: true, stamp: '2026-05-14' });

    const record = await recordFor(vault, 'E38');
    expect(record.map((e) => [e.jobId, e.signedOff])).toEqual([
      ['job-b', true], ['job-a', false],
    ]);
  });

  it('counts revisions', async () => {
    await seedJob('job-a', ['E38'], { revisions: 2 });
    const [entry] = await recordFor(vault, 'E38');
    expect(entry!.revision).toBe(3);
    expect(entry!.documents.revisions).toHaveLength(2);
  });
});

describe('getting back to what she started from', () => {
  it('a photographed worksheet has a source, a read text and an output', async () => {
    await seedJob('job-a', ['E38'], { source: 'file' });
    const [entry] = await recordFor(vault, 'E38');

    expect(entry!.source.of).toBe('file');
    if (entry!.source.of === 'file') expect(entry!.source.paths).toHaveLength(1);
    expect(entry!.documents.ir).toContain('ir.md');
    expect(entry!.documents.rendered).toHaveLength(1);
  });

  /**
   * The case that would otherwise report a fault. `material/<job>/source/` is
   * absent for a pasted job because there was never a file — not because one
   * went missing.
   */
  it('a pasted job says the source and the read text are one document', async () => {
    await seedJob('job-a', ['E38'], { source: 'pasted' });
    const [entry] = await recordFor(vault, 'E38');
    expect(entry!.source.of).toBe('pasted');
    expect(entry!.missing).toEqual([]);
  });

  it('a composed job shows the objectives and the anchor instead of a file', async () => {
    await seedJob('job-a', ['E38'], { source: 'composed' });
    const [entry] = await recordFor(vault, 'E38');
    expect(entry!.source.of).toBe('composed');
    if (entry!.source.of === 'composed') {
      expect(entry!.source.objectives).toEqual(['Multiplicar con llevadas']);
      expect(entry!.source.anchor).toBe('MAT.3.A.2.7');
    }
  });

  /** FR-1206. A field, not a filter. */
  it('reports a document she deleted by hand rather than dropping the row', async () => {
    await seedJob('job-a', ['E38'], { source: 'file' });
    const { rm } = await import('node:fs/promises');
    await rm(join(vault.root, 'material', 'job-a', 'ir.md'));

    const record = await recordFor(vault, 'E38');
    expect(record, 'the row disappeared with the file').toHaveLength(1);
    expect(record[0]!.missing).toContain('material/job-a/ir.md');
  });
});

describe('a vault that predates this feature', () => {
  /**
   * FR-1204, and the requirement that decides whether this ships with history or
   * without it. Every vault in existence today has adapted documents with no
   * `adapted_on` stamp, because nothing wrote one until now.
   */
  it('records work that carries no stamp, dated from the file itself', async () => {
    await vault.writeRaw('material/job-old/ir.md', '---\nsource: "pegado"\n---\n\ntexto\n');
    await vault.writeRaw('material/job-old/E38/adapted.md',
      '---\nreview:\n  signed_off: true\n---\n\n::: {#b1 .explanation}\nviejo\n:::\n');

    const [entry] = await recordFor(vault, 'E38');
    expect(entry, 'work from before the stamp is invisible').toBeDefined();
    expect(entry!.date, 'undated rows sort wrong and read as broken').toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(entry!.signedOff).toBe(true);
    expect(entry!.kind).toBe('material');   // `012` has not shipped; no lie is told
  });

  it('survives a learner directory whose learner has been erased', async () => {
    await seedJob('job-a', ['E38']);
    const { rm } = await import('node:fs/promises');
    // The profile is gone; a crash left the job directory behind.
    await rm(join(vault.root, 'material', 'job-a', 'E38', 'adapted.md'));

    await expect(recordFor(vault, 'E38')).resolves.toEqual([]);
    expect(await learnersOf(vault, 'job-a')).toEqual([]);
  });
});

describe('the school year', () => {
  it('runs September to June', () => {
    expect(schoolYearOf('2026-05-12')).toBe('2025-2026');
    expect(schoolYearOf('2026-09-14')).toBe('2026-2027');
    expect(schoolYearOf('2026-06-30')).toBe('2025-2026');
  });

  /** The boundary month is a fact about a country, so it is a parameter and the
   *  default is only a default (`011` owns the real answer). */
  it('takes its boundary from outside itself', () => {
    expect(schoolYearOf('2026-03-01', 2)).toBe('2026-2027');
  });
});
