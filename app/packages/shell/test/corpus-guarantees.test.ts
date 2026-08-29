import { describe, it, expect } from 'vitest';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { parseRecipe } from '@rampa/core';

const appRoot = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..');
const corpus = join(appRoot, 'corpus');
const shellSrc = join(appRoot, 'packages', 'shell', 'src');

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

  it('the vault is where writes go, and it is never the corpus', async () => {
    const corpusIpc = await readFile(join(shellSrc, 'ipc', 'corpus.ts'), 'utf8');
    // Reading is the whole job of that module.
    expect(corpusIpc).toMatch(/readFile/);
    expect(corpusIpc).not.toMatch(/writeFile|appendFile|rm\s*\(/);
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
    const corpusIpc = await readFile(join(shellSrc, 'ipc', 'corpus.ts'), 'utf8');
    expect(corpusIpc).not.toMatch(/material|adapted\.md|jobDir/);
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
    // ADR 0006: harness/commands and templates were bundled and never read.
    // Anything added here must have a reader, or it is decoration in an installer.
    expect(dirs.sort()).toEqual(['checklists', 'instructions', 'recipes']);
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
