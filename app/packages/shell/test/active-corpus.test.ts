import { describe, it, expect, vi } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Which corpus governs, and why (034 T006, FR-3205).
 *
 * ## Why this is one function and not a path
 *
 * `021`'s resolver lesson. A function returning a path leaves every caller to guess what
 * it means, and the screen that has to say «estás con el criterio incluido porque la
 * actualización que aceptaste está a medias» cannot guess. So it returns the case.
 *
 * ## And why it blocks the rest of the feature
 *
 * Applying an update before every reader resolves the corpus in one place is **partial
 * application by architecture**: some readers on the new corpus and some on the old,
 * within one job. That is FR-3210's failure moved from the wire onto the disk.
 */
vi.mock('electron', () => ({ ipcMain: { handle: () => {} }, app: {}, dialog: {}, shell: {} }));

const { resolveActiveCorpus } = await import('../src/corpus/active.js');

const scratch = () => mkdtemp(join(tmpdir(), 'rampa-active-'));

/** A corpus root that looks like one: three directories and a version file. */
async function corpusAt(root: string, version: number, formatVersion = 1): Promise<string> {
  await mkdir(join(root, 'recipes'), { recursive: true });
  await mkdir(join(root, 'instructions'), { recursive: true });
  await mkdir(join(root, 'checklists'), { recursive: true });
  await writeFile(join(root, 'recipes', 'una.md'), '# receta\n');
  await writeFile(join(root, 'CORPUS-VERSION.json'),
    JSON.stringify({ version, formatVersion }));
  return root;
}

async function snapshot(store: string, version: number, formatVersion = 1): Promise<void> {
  await corpusAt(join(store, 'versions', String(version)), version, formatVersion);
}

const pointAt = async (store: string, active: number | null) => {
  await mkdir(store, { recursive: true });
  await writeFile(join(store, 'active.json'), JSON.stringify({ active, history: [] }));
};

describe('with nothing accepted', () => {
  it('the bundled corpus governs, and reports cite its version', async () => {
    const dir = await scratch();
    const bundled = await corpusAt(join(dir, 'bundled'), 3);
    const got = await resolveActiveCorpus({ store: join(dir, 'store'), bundled });
    expect(got.source).toBe('bundled');
    expect(got.version).toBe(3);
    expect(got.because).toBeUndefined();
    await rm(dir, { recursive: true, force: true });
  });

  it('and a build from before this feature says 0, not 1', async () => {
    /*
     * `1` would be a number invented to fill a field, and a January report citing it
     * would be citing a version nobody published. `0` reads as «antes de que esto se
     * numerara», which is what it is.
     */
    const dir = await scratch();
    const bundled = join(dir, 'viejo');
    await mkdir(join(bundled, 'recipes'), { recursive: true });
    expect((await resolveActiveCorpus({ store: join(dir, 'store'), bundled })).version).toBe(0);
    await rm(dir, { recursive: true, force: true });
  });
});

describe('with an accepted snapshot', () => {
  it('it governs when it is newer, complete and supported', async () => {
    const dir = await scratch();
    const bundled = await corpusAt(join(dir, 'bundled'), 3);
    const store = join(dir, 'store');
    await snapshot(store, 4);
    await pointAt(store, 4);

    const got = await resolveActiveCorpus({ store, bundled });
    expect(got.source).toBe('update');
    expect(got.version).toBe(4);
    await rm(dir, { recursive: true, force: true });
  });

  it('an incomplete one never governs, and the answer says why', async () => {
    /*
     * The publish is one atomic rename of a complete verified snapshot, so this should
     * be impossible — and it is checked anyway, because the failure it guards is a job
     * running with three recipes and no instructions: plausible output with none of the
     * judgement layer, and a version number saying it is current.
     */
    const dir = await scratch();
    const bundled = await corpusAt(join(dir, 'bundled'), 3);
    const store = join(dir, 'store');
    await mkdir(join(store, 'versions', '4', 'recipes'), { recursive: true });  // and no more
    await pointAt(store, 4);

    const got = await resolveActiveCorpus({ store, bundled });
    expect(got.source).toBe('bundled');
    expect(got.because).toBe('incomplete');
    await rm(dir, { recursive: true, force: true });
  });

  it('and one written for a newer Rampa never governs either', async () => {
    const dir = await scratch();
    const bundled = await corpusAt(join(dir, 'bundled'), 3);
    const store = join(dir, 'store');
    await snapshot(store, 4, 99);
    await pointAt(store, 4);

    const got = await resolveActiveCorpus({ store, bundled });
    expect(got.source).toBe('bundled');
    expect(got.because).toBe('unsupported');
    await rm(dir, { recursive: true, force: true });
  });

  it('a newer bundled corpus wins, and being passed over is said', async () => {
    /*
     * Rule 2. Installing an app that bundles a newer corpus must not silently downgrade
     * judgement to a stale snapshot she accepted in March — and a governor changing
     * without her is a fact she is owed.
     */
    const dir = await scratch();
    const bundled = await corpusAt(join(dir, 'bundled'), 7);
    const store = join(dir, 'store');
    await snapshot(store, 4);
    await pointAt(store, 4);

    const got = await resolveActiveCorpus({ store, bundled });
    expect(got.source).toBe('bundled');
    expect(got.version).toBe(7);
    expect(got.because).toBe('superseded-by-bundled');
    await rm(dir, { recursive: true, force: true });
  });

  it('and a pointer at a version that is not there falls back rather than throwing', async () => {
    const dir = await scratch();
    const bundled = await corpusAt(join(dir, 'bundled'), 3);
    const store = join(dir, 'store');
    await pointAt(store, 9);
    const got = await resolveActiveCorpus({ store, bundled });
    expect(got.source).toBe('bundled');
    expect(got.because).toBe('incomplete');
    await rm(dir, { recursive: true, force: true });
  });
});

describe('nothing else in the shell resolves a corpus path', () => {
  it('`corpusRoot` is called only where the resolution itself lives', async () => {
    /*
     * The structural half, and it is the one that makes «applying an update is a pointer
     * move» true. A second reader joining `join(corpusRoot(), …)` would be a reader
     * that never sees an accepted update — partial application, on disk, within one job.
     *
     * Three, and the third is the interesting one. `bundle.ts` defines it, `active.ts`
     * is the resolution — and `ensayo/sample.ts` reads the **bundle** on purpose: the
     * rehearsal's sample ships with the application, is pinned by a byte hash (`035`),
     * and is not something a corpus update publishes. A rehearsal that changed under her
     * would stop being the fixed thing she can show a colleague.
     */
    const { readFileSync, readdirSync } = await import('node:fs');
    const src = join(process.cwd(), 'packages', 'shell', 'src');
    const walk = (dir: string): string[] => {
      const out: string[] = [];
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) out.push(...walk(p));
        else if (p.endsWith('.ts')) out.push(p);
      }
      return out;
    };
    const callers = walk(src)
      .filter((f) => {
        const code = readFileSync(f, 'utf8')
          .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
        return /\bcorpusRoot\s*\(/.test(code);
      })
      .map((f) => f.replace(`${src}/`, ''))
      .sort();

    expect(callers).toEqual(['corpus/active.ts', 'corpus/bundle.ts', 'ensayo/sample.ts']);
  });
});
