import { describe, it, expect } from 'vitest';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { parseRecipe } from '@rampa/core';

const appRoot = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..');
const corpus = join(appRoot, 'corpus');
const shellSrc = join(appRoot, 'packages', 'shell', 'src');

/**
 * Every file of the corpus module, concatenated.
 *
 * It used to be `readFile(shellSrc/ipc/corpus.ts)`. That file was split into six
 * on 2026-08-30 (013 T018) and both assertions below started failing with ENOENT
 * — which is the good outcome: a test pinned to one filename is a test that
 * stops asserting the moment somebody reorganises, and an ENOENT is at least
 * loud. Reading the directory means the next split does not break it either, and
 * a seventh file cannot quietly escape the guarantee by being new.
 */
async function corpusModule(): Promise<string> {
  const dir = join(shellSrc, 'corpus');
  const files = await walk(dir);
  const parts = await Promise.all(files.filter((f) => f.endsWith('.ts')).map((f) => readFile(f, 'utf8')));
  if (parts.length === 0) throw new Error(`no corpus module found under ${dir}`);
  return parts.join('\n');
}

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries: string[];
  try { entries = await readdir(dir); } catch { return out; }
  for (const e of entries) {
    const p = join(dir, e);
    if ((await stat(p)).isDirectory()) out.push(...await walk(p));
    else out.push(p);
  }
  return out;
}

/**
 * T080 — the corpus ships read-only (006 FR-413).
 *
 * The coverage analysis caught this exact gap: *bundling it is not the same as
 * preventing writes.* The guarantee is structural — there is no IPC path that
 * writes into the bundle — so the way to assert it is over the code, not over a
 * filesystem permission that an installer or a package manager could change.
 */
describe('the corpus is read-only at runtime (T080, 006 FR-413)', () => {
  it('no shell module writes to the corpus root', async () => {
    const files = (await walk(shellSrc)).filter((f) => f.endsWith('.ts'));
    expect(files.length).toBeGreaterThan(5);

    const offenders: string[] = [];
    for (const f of files) {
      const src = await readFile(f, 'utf8');
      // corpus.ts is the only module that knows the bundle's location; if any
      // write primitive appears in a file that also resolves corpusRoot, the
      // read-only guarantee has a hole.
      const knowsCorpus = /corpusRoot\s*\(/.test(src);
      const writes = /\b(writeFile|appendFile|mkdir|rm|rename|unlink|copyFile|cp)\s*\(/.test(src);
      if (knowsCorpus && writes) offenders.push(f.replace(appRoot, ''));
    }
    expect(offenders, `these modules can both locate and write the corpus: ${offenders.join(', ')}`)
      .toEqual([]);
  });

  it('the vault is where writes go, and it is never the BUNDLE', async () => {
    /*
     * Reading was the whole job of that module until `034`, and the distinction the
     * feature forced is worth writing down rather than loosening around.
     *
     * `corpus/updates.ts` writes — into `userData/corpus/`, which is **not** the bundle.
     * FR-413 is about the corpus that ships inside the application: it is read-only and
     * an accepted update never touches it. What `034` adds is a second store beside it,
     * and applying an update is a **pointer** moving between the two, not a copy over
     * the first.
     *
     * So the check moves from «this directory contains no write» to the thing that was
     * always meant: no file both knows where the bundle is and writes. That is the test
     * above, and it still passes — `corpus/updates.ts` does not call `corpusRoot()`, and
     * `corpus/active.ts` does not write.
     */
    const files = (await walk(shellSrc)).filter((f) => f.endsWith('.ts'));
    const bundleWriters: string[] = [];
    for (const f of files) {
      const src = await readFile(f, 'utf8');
      if (/corpusRoot\s*\(/.test(src) && /\b(writeFile|rename|rm|cp)\s*\(/.test(src)) {
        bundleWriters.push(f.replace(appRoot, ''));
      }
    }
    expect(bundleWriters).toEqual([]);

    // And the module that does write says where: the store, never the bundle.
    const updates = await readFile(join(shellSrc, 'corpus', 'updates.ts'), 'utf8');
    expect(updates).toContain('args.store');
    expect(updates).not.toMatch(/corpusRoot\s*\(/);
  });
});

/**
 * T081 — a corpus update never rewrites already-adapted material (006 FR-416).
 *
 * Provenance records `recipe@version`. That attribute is the audit trail, and it
 * only means something if updating the corpus leaves last month's sheets saying
 * what they said at the time. Traceability to a moving target is not
 * traceability.
 */
describe('provenance survives a corpus update (T081, 006 FR-416)', () => {
  it('every bundled recipe declares an integer version', async () => {
    const files = (await walk(join(corpus, 'recipes')))
      .filter((f) => f.endsWith('.md') && !f.endsWith('README.md'));
    expect(files.length).toBeGreaterThan(0);

    for (const f of files) {
      const r = parseRecipe(await readFile(f, 'utf8'), f, 'core');
      expect(r, `unparseable recipe: ${f}`).not.toBeNull();
      expect(Number.isInteger(r!.version), `${r!.id} version must be an integer`).toBe(true);
      expect(r!.version).toBeGreaterThan(0);
    }
  });

  it('an adapted document keeps the version it was made with', async () => {
    // The mechanism, stated as a property: nothing in the update path touches
    // material/, so a sheet adapted with one-task-per-page@1 still says @1 after
    // the bundle ships @2. Asserted over the code because the alternative is
    // shipping two corpus versions in a test fixture.
    const corpusIpc = await corpusModule();
    /*
     * `material/` with the slash, and `material-kinds.md` excluded.
     *
     * The pattern was a bare `material`, which started matching on 2026-08-31
     * when `012` added `instructions/material-kinds.md` to the corpus — a corpus
     * file, read-only, and exactly the sort of thing this module is for. The
     * claim being made is about the vault's `material/` directory, so the
     * assertion should say so rather than matching a word.
     */
    expect(corpusIpc.replace(/material-kinds/g, ''))
      .not.toMatch(/['"`]material\/|VAULT\.material|adapted\.md|jobDir/);
  });

  it('the bundle carries both licences, or it is not distributable', async () => {
    for (const licence of ['LICENSE', 'LICENSE-CONTENT.md', 'NOTICE']) {
      const s = await stat(join(corpus, licence));
      expect(s.size, `${licence} must ship with the corpus`).toBeGreaterThan(0);
    }
  });

  it('bundles only what the application reads', async () => {
    const entries = await readdir(corpus);
    const dirs: string[] = [];
    for (const e of entries) {
      if ((await stat(join(corpus, e))).isDirectory()) dirs.push(e);
    }
    /*
     * ADR 0006: harness/commands and templates were bundled and never read. Anything
     * added here must have a reader, or it is decoration in an installer.
     *
     * `sample/` since `035`: the authored rehearsal set — an invented learner, a
     * worksheet, an adaptation and its report — read by `ensayo/sample.ts` at seed time.
     * It is content and ships under the same licence gate as the rest.
     */
    expect(dirs.sort()).toEqual(['checklists', 'instructions', 'recipes', 'sample']);

    // And it has a reader, which is the actual rule this list encodes.
    const reader = await readFile(
      join(appRoot, 'packages', 'shell', 'src', 'ensayo', 'sample.ts'), 'utf8');
    expect(reader).toMatch(/corpusRoot\(\)[\s\S]{0,60}'sample'/);
  });

  /**
   * T002 · the catalogue reaches the bundle.
   *
   * `bundle-corpus.mjs` copies `instructions/` recursively, so this works today
   * by inheritance rather than by intent — and a future change narrowing that
   * copy to named files would produce an application with **no services and no
   * error**, which is a broken installation that looks like a design decision.
   */
  it('ships the service catalogue', async () => {
    const dir = join(corpus, 'instructions', 'providers');
    const entries = (await readdir(dir)).filter((f) => f.endsWith('.md') && f !== 'README.md');
    expect(entries.length, 'the bundled catalogue is empty').toBeGreaterThanOrEqual(6);
  });

  it('ships the contract that tells the next contributor how to add one', async () => {
    const readme = await readFile(join(corpus, 'instructions', 'providers', 'README.md'), 'utf8');
    expect(readme).toContain('provider-catalogue.md');
    expect(readme).toContain('last_checked');
  });
});

/**
 * Every instruction file the application reads is in the bundle (019/018).
 *
 * The corpus-as-truth pattern has one failure mode that ships silently: a new
 * `instructions/x.md` that `loadInstruction('x')` reads, and that `bundle-corpus.mjs`
 * copies — until it does not. The consequence is a modality or a family that works
 * in the repository and throws in the installed application, which is the worst
 * place to find out.
 *
 * So the assertion is over what the code **asks for**, not over a list somebody
 * maintains beside it.
 */
describe('the bundle carries every instruction the code reads', () => {
  it('finds each `loadInstruction(...)` name in the bundle', async () => {
    const files = [
      join(appRoot, 'packages', 'shell', 'src', 'jobs'),
      join(appRoot, 'packages', 'shell', 'src', 'corpus'),
      join(appRoot, 'packages', 'shell', 'src', 'ipc'),
    ];

    const names = new Set<string>();
    for (const dir of files) {
      for (const f of await readdir(dir)) {
        if (!f.endsWith('.ts')) continue;
        const src = await readFile(join(dir, f), 'utf8');
        for (const m of src.matchAll(/loadInstruction\(\s*'([a-z-]+)'\s*\)/g)) {
          names.add(m[1]!);
        }
      }
    }

    // The scan is not passing because it found nothing to scan.
    expect(names.size).toBeGreaterThan(3);

    const missing: string[] = [];
    for (const name of names) {
      try {
        const s = await stat(join(corpus, 'instructions', `${name}.md`));
        if (s.size === 0) missing.push(`${name}.md (empty)`);
      } catch {
        missing.push(`${name}.md`);
      }
    }
    expect(missing, 'read by the code and absent from the bundle').toEqual([]);
  });
});

/**
 * A guide comes in through `008`, unchanged (017 T011, FR-1505/1506).
 *
 * A second ingest path would be the modality-specific pipeline Principle IV forbids
 * — and the document where a misreading matters most would be the one nobody had
 * checked, because the per-page verification gate lives on the existing path.
 *
 * Asserted structurally: the guide job reads a job that already exists, and refuses
 * one whose extraction is unverified.
 */
describe('the guide has no ingest path of its own', () => {
  it('opens no channel that reads a file', async () => {
    const src = await readFile(join(appRoot, 'packages', 'shell', 'src', 'ipc', 'guide.ts'), 'utf8');

    // No dialog, no file read, no second ingest.
    expect(src).not.toMatch(/showOpenDialog|readFile|readdir|runIngest|ingest:/);
    /*
     * The handlers, enumerated so a new one is a decision.
     *
     * Five became ten on 2026-09-04, and all five new ones are the ACNS becoming a
     * document (FR-1516, decision P46): saved, read back, rendered, printed, signed.
     * None of them reads a source file — `acnsPdf` **writes** a PDF, which is what
     * `ipc/print.ts` already does for a sheet, and the claim this test defends is that
     * a *guide* never arrives through here.
     */
    expect([...src.matchAll(/handle\('guide:(\w+)'/g)].map((m) => m[1]).sort())
      .toEqual([
        'acns', 'acnsHtml', 'acnsPdf', 'acnsRead', 'acnsSave', 'acnsSignOff',
        'acs', 'apply', 'ask', 'read',
      ]);
  });

  it('refuses a guide whose extraction she has not confirmed', async () => {
    const src = await readFile(join(appRoot, 'packages', 'shell', 'src', 'jobs', 'guide.ts'), 'utf8');

    // The same gate as a worksheet, on the document where it matters most.
    expect(src).toMatch(/if \(!isVerified\(doc\)\)/);
    expect(src).toContain('ir-unverified');
  });

  /**
   * And nothing is written before her confirmation (FR-1506).
   *
   * `readGuideJob` is the only thing that runs before the confirmation screen, and
   * the only write in this whole file is `applyGuide`'s, which she triggers.
   */
  it('writes nothing while reading', async () => {
    const src = await readFile(join(appRoot, 'packages', 'shell', 'src', 'jobs', 'guide.ts'), 'utf8');
    const readingHalf = src.slice(0, src.indexOf('export async function applyGuide'));

    expect(readingHalf).not.toMatch(/writeRaw|writeBinary|ensureDir/);
  });
});

/**
 * Sentences the corpus writes **for her** reach her (021 T025, and the eleventh
 * instance).
 *
 * The defect this closes, found by an e2e rather than by a review: `material-kinds.md`
 * gained `composing.before` — «te voy a proponer las preguntas de una prueba con nota…
 * tú validas cada pregunta» — the parser read it, the type carried it, and
 * `corpus:materialKinds` did not send it. The screen showed the label alone.
 *
 * That is the eleventh time in this project a field has been written, parsed, typed and
 * read by nobody, and this one was the sentence that tells a PT what it means to ask a
 * language model for an exam.
 *
 * The rule this asserts: **a field whose whole purpose is to be read by her must cross
 * the boundary.** Fields for the model (`rule`) and for the main process (`forbids`,
 * `composing.on_document`) deliberately do not, and the test names them so the
 * distinction is a decision rather than an omission.
 */
describe('what the corpus says to her crosses to the screen', () => {
  /** The `corpus:materialKinds` handler, sliced by its neighbours rather than by a regex
   *  that has to guess where a nested `});` ends. */
  const mappingSrc = async (): Promise<string> => {
    const src = await readFile(
      join(appRoot, 'packages', 'shell', 'src', 'corpus', 'recipes.ts'), 'utf8');
    const from = src.indexOf("handle('corpus:materialKinds'");
    const to = src.indexOf("handle('corpus:recipes'", from);
    expect(from, 'the handler was not found').toBeGreaterThan(-1);
    expect(to, 'the next handler was not found').toBeGreaterThan(from);
    return src.slice(from, to);
  };

  it('sends every field written for her', async () => {
    const mapping = await mappingSrc();
    for (const forHer of ['label', 'before', 'composing']) {
      expect(mapping, `${forHer} is written for her and must cross`).toContain(forHer);
    }
  });

  it('keeps the model’s and the process’s fields behind', async () => {
    const mapping = await mappingSrc();
    // `rule` is sent to the model literally; `forbids` is machine-readable and the report
    // is built in this process. A renderer holding either would be a second place
    // deciding what a document says.
    expect(mapping).not.toMatch(/\brule:/);
    expect(mapping).not.toMatch(/\bforbids:/);
    expect(mapping, 'on_document is printed by buildSheet, in this process')
      .not.toMatch(/onDocument:/);
  });

  /**
   * And what gets printed is spelled correctly (review AGE-09).
   *
   * `composing.on_document` is the one family of phrases that ends up **on the
   * paper**, in the header of an exam, because paper outlives the screen. It said
   * «Válida cada una antes de usarlas» — the adjective, where the imperative
   * «Valida» belongs — and the same sentence two fields above gets it right («tú
   * validas»), which is what makes it an erratum rather than a choice.
   *
   * A spelling mistake printed on an assessment, in front of teachers, costs
   * exactly the thing this application is asking them for. Small, and asserted
   * because the file is hand-edited corpus and nothing else would see it.
   */
  it('prints the imperative, not the adjective', async () => {
    // The shipped bundle, which is what actually reaches a printer.
    const raw = await readFile(join(corpus, 'instructions', 'material-kinds.md'), 'utf8');
    const printed = raw.replace(/\s+/g, ' ');
    expect(printed).toContain('Valida cada una antes de usarlas');
    expect(printed, 'the adjective is back on an exam header').not.toContain('Válida cada');
  });
});
