import { describe, it, expect, vi } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { Vault, pagesToIR, irToMarkdown, parseFrontMatter, startedFor } from '@rampa/core';

/**
 * Work she left half-finished, and whose it is (020 T006/T007/T026/T027).
 *
 * ## Why this file exists at all
 *
 * `for_learner` is a field, and this repository's signature defect is «a field written,
 * typed and read by nothing». So the writer and the reader are asserted against a real
 * directory: the stamp lands in `ir.md`, and the one walk of `material/` reports it.
 *
 * ## And why the functions are exported
 *
 * They used to be handler bodies. Five handlers written after a `return` inside another
 * handler were unreachable in `030`, `tsc` said nothing, and the channel test passed by
 * static analysis — a handler body is invisible to every unit test here. `ingest:pending`
 * and `ingest:claim` are one line each now, and this is what they call.
 *
 * And they live in `jobs/` rather than `ipc/` because the Electron-surface bound refused
 * them there — for the fifth time in this project's history, and correctly: they take a
 * vault and import no Electron, so counting them as bridge would have made the metric
 * say «the bridge grew» about code that never touches it.
 */
vi.mock('electron', () => ({ ipcMain: { handle: () => {} }, app: {}, dialog: {}, shell: {} }));

const { pendingIngests, claimIngest } = await import('../src/jobs/ingest.js');

const scratch = async () => {
  const dir = await mkdtemp(join(tmpdir(), 'rampa-half-'));
  return { dir, vault: new Vault(dir) };
};

/** A reading of two pages, one confirmed, optionally stamped for a learner. */
async function halfRead(vault: Vault, job: string, forLearner?: string): Promise<void> {
  const fm = forLearner ? `for_learner: "${forLearner}"\n` : '';
  await vault.writeRaw(`material/${job}/ir.md`,
    `---\n${fm}source: "photos"\n---\n\n::: {#b1 .explanation}\nDos por tres\n:::\n`);
  await vault.writeRaw(`material/${job}/extraction.json`, JSON.stringify({
    source: 'photos', verified: false,
    pages: [{ page: 1, verified: true, problems: [], attempts: 1, flags: [] },
            { page: 2, verified: false, problems: [], attempts: 1, flags: [] }],
  }) + '\n');
}

describe('one walk of the material directory answers who and how far (FR-1828)', () => {
  it('reports the learner a reading was started for, and how much is left', async () => {
    const { vault } = await scratch();
    await halfRead(vault, 'job-20260907T090000', 'C47');

    const [j] = await pendingIngests(vault);
    expect(j?.learner).toBe('C47');
    expect(j?.confirmed).toBe(1);
    expect(j?.pages).toBe(2);
  });

  /**
   * The case FR-1827 is entirely about: **every** job in every vault that exists today.
   *
   * Absent rather than `null`, because `learner: null` would read as a value somebody
   * wrote — «nobody claimed this» is the shape of not knowing, and the caseload
   * distinguishes the two by exactly this.
   */
  it('leaves the learner out when nothing was stamped, rather than guessing', async () => {
    const { vault } = await scratch();
    await halfRead(vault, 'job-20260907T090000');

    const [j] = await pendingIngests(vault);
    expect(j).toBeDefined();
    expect('learner' in j!).toBe(false);
  });

  /**
   * `002`'s older spelling, accepted (`021` T004).
   *
   * A vault written last week is the normal case, not the edge one. Reading
   * `for_learner` directly is the defect that made a composed job vanish from her
   * record, and this is the same read in a second place.
   */
  it('accepts the older spelling a composed job carries', async () => {
    const { vault } = await scratch();
    await vault.writeRaw('material/job-20260907T100000/ir.md',
      '---\ncomposed_for: "C09"\nsource: "generated"\n---\n\n::: {#b1 .explanation}\nx\n:::\n');
    await vault.writeRaw('material/job-20260907T100000/extraction.json', JSON.stringify({
      source: 'generated', verified: false, pages: [{ page: 1, verified: false, problems: [], attempts: 1, flags: [] }],
    }) + '\n');

    const [j] = await pendingIngests(vault);
    expect(j?.learner).toBe('C09');
  });

  /** Confirmed readings are not half-finished, so they are not offered again. */
  it('says nothing about a reading she already finished confirming', async () => {
    const { vault } = await scratch();
    await vault.writeRaw('material/job-20260907T110000/ir.md',
      '---\nfor_learner: "C47"\n---\n\n::: {#b1 .explanation}\nx\n:::\n');
    await vault.writeRaw('material/job-20260907T110000/extraction.json', JSON.stringify({
      source: 'photos', verified: true, pages: [{ page: 1, verified: true, problems: [], attempts: 1, flags: [] }],
    }) + '\n');

    expect(await pendingIngests(vault)).toEqual([]);
  });
});

describe('she says whose the orphan work is (FR-1827)', () => {
  it('fills the blank, and the walk reports it from then on', async () => {
    const { vault } = await scratch();
    await halfRead(vault, 'job-20260907T120000');

    expect(await claimIngest(vault, 'job-20260907T120000', 'C47')).toBe(true);
    const [j] = await pendingIngests(vault);
    expect(j?.learner).toBe('C47');
  });

  /**
   * It only ever fills a blank.
   *
   * Re-pointing a reading at another child would be a way to move work between
   * learners, which is not the question the caseload is asking — and it would strand
   * whatever had already been adapted under the first one. Asserted because «only fills
   * a blank» is the kind of claim that is true in the prose and absent from the code.
   */
  it('refuses to move a reading that already belongs to somebody', async () => {
    const { vault } = await scratch();
    await halfRead(vault, 'job-20260907T130000', 'C47');

    expect(await claimIngest(vault, 'job-20260907T130000', 'C09')).toBe(false);
    const [j] = await pendingIngests(vault);
    expect(j?.learner).toBe('C47');
  });

  /** And her own edits survive: the front matter gains a line, the file is not rebuilt. */
  it('adds a line instead of rewriting what she may have typed', async () => {
    const { dir, vault } = await scratch();
    await vault.writeRaw('material/job-20260907T140000/ir.md',
      '---\nsource: "photos"\n---\n\n::: {#b1 .explanation}\nEsto  lo  escribí  yo\n:::\n');
    await vault.writeRaw('material/job-20260907T140000/extraction.json', JSON.stringify({
      source: 'photos', verified: false, pages: [{ page: 1, verified: false, problems: [], attempts: 1, flags: [] }],
    }) + '\n');

    await claimIngest(vault, 'job-20260907T140000', 'C47');
    const raw = await new Vault(dir).readRaw('material/job-20260907T140000/ir.md');
    expect(raw).toContain('for_learner: "C47"');
    // The double spaces are the point: a round trip through the writer would eat them.
    expect(raw).toContain('Esto  lo  escribí  yo');
  });

  /** A job whose reading is not there at all is refused rather than invented. */
  it('says no when there is no reading to stamp', async () => {
    const { vault } = await scratch();
    expect(await claimIngest(vault, 'job-nope', 'C47')).toBe(false);
  });
});

describe('the stamp survives the round trip it is written through (T006)', () => {
  /**
   * `pagesToIR` → `irToMarkdown` → `parseFrontMatter` → `startedFor`.
   *
   * Four functions, and the field has to come out the other end: the IR on disk is the
   * interchange format, a teacher may hand-edit it, and `startedFor` is what every
   * reader uses. Asserted end to end rather than at the first hop, because a front
   * matter value that serialises and does not parse back is the shape of this
   * project's field-nobody-reads defect with an extra step.
   */
  it('a reading stamped for a learner reads back as his', () => {
    const doc = pagesToIR(
      [{ page: 1, notes: [], blocks: [{ id: 'b1', class: 'explanation', text: 'Dos por tres' }] }] as never,
      { source: 'photos', frontMatter: { for_learner: 'C47' } });

    const raw = irToMarkdown(doc);
    expect(startedFor(parseFrontMatter(raw).data)).toBe('C47');
  });

  /**
   * And the wiring, structurally — said out loud because it is second best.
   *
   * `runIngest` has never been *executed* by a test in this repository: it needs a
   * provider, real image files and money. So what is checked here is that the learner
   * reaches `pagesToIR` at all, which is the one line that would silently stop
   * stamping. The behaviour above is real; this is a guard, and calling it a guard is
   * the point — a reader who thinks the writer is covered will not look again.
   */
  it('the ingest job hands the learner to the document it builds', async () => {
    const root = join(dirname(new URL(import.meta.url).pathname), '..');
    const job = await readFile(join(root, 'src', 'jobs', 'ingest.ts'), 'utf8');
    const ipc = await readFile(join(root, 'src', 'ipc', 'ingest.ts'), 'utf8');

    expect(job).toMatch(/frontMatter:\s*\{\s*for_learner:\s*forLearner\s*\}/);
    // And the channel forwards it, which is the other end of the same line.
    expect(ipc).toMatch(/handle\('ingest:run'[\s\S]{0,200}forLearner\)/);
  });
});
