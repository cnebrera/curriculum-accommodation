import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { buildReport, parseIR } from '../src/index.js';

/**
 * Every report says which judgement produced it (034 T008, FR-3207, Principle VI).
 *
 * ## Why a number in a report is worth this much
 *
 * «Lo revisé y estaba bien» becomes unanswerable the moment a recipe changes. Six corpus
 * corrections later, a report from January has to keep saying which criterion made it —
 * otherwise the traceability the whole of Principle VI is about stops at the recipe id
 * and never reaches the version of the recipe.
 */
const repoRoot = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');
const ir = () => parseIR(['---', '---', '',
  '::: {#b1 .exercise data-from="p1" data-recipe="one-task-per-page@1" data-axis="COG"}',
  'x', ':::'].join('\n'));

describe('the report cites the corpus that produced it', () => {
  it('by version, in the block she reads before signing', () => {
    const md = buildReport({ adapted: ir(), corpusVersion: 4 }).markdown;
    expect(md).toContain('criterio pedagógico versión 4');
  });

  it('and says nothing at all when the corpus was never numbered', () => {
    /*
     * Every sheet in every vault that predates this feature. «Versión 0» would be a
     * number she could look up and not find; silence is the honest answer, and it is
     * what «absent rather than guessed» means for a field like this.
     */
    for (const corpusVersion of [undefined, 0]) {
      const md = buildReport({ adapted: ir(), ...(corpusVersion !== undefined ? { corpusVersion } : {}) }).markdown;
      expect(md).not.toContain('criterio pedagógico');
    }
  });
});

describe('and the corpus has a version to cite', () => {
  it('the repository declares one, and the bundler copies it in', () => {
    /*
     * `corpus.version` is the source and `CORPUS-VERSION.json` is the copy the app
     * reads. Declared rather than derived: a number computed from a timestamp or a
     * commit count goes backwards the day somebody rebuilds an old tag, and a report
     * citing a version that later means something else is worse than one citing none.
     */
    const declared = JSON.parse(readFileSync(join(repoRoot, 'corpus.version'), 'utf8'));
    expect(Number.isInteger(declared.version)).toBe(true);
    expect(declared.version).toBeGreaterThan(0);
    expect(Number.isInteger(declared.formatVersion)).toBe(true);

    // And it explains, in the file, which of the two numbers moves when.
    const raw = readFileSync(join(repoRoot, 'corpus.version'), 'utf8');
    expect(raw).toContain('cambia el CONTENIDO');
    expect(raw).toContain('cambia la FORMA');
    // Including the one it is most often confused with.
    expect(raw).toContain('esquema del vault');
  });

  it('and the bundled copy carries it, so the running application can read it', () => {
    /*
     * `app/corpus/` is generated, so this asserts the **bundler** rather than the
     * artefact: the field is in the script that writes the file. Reading the generated
     * file would pass or fail on when somebody last ran `npm run dev`.
     */
    const script = readFileSync(
      join(repoRoot, 'app', 'scripts', 'bundle-corpus.mjs'), 'utf8');
    expect(script).toContain('version,');
    expect(script).toContain('formatVersion,');
    // And it refuses to build without one, rather than defaulting.
    expect(script).toContain('Build stopped');
  });

  it('and nothing in the corpus update path touches the vault schema version', () => {
    /*
     * The sibling rule (spec assumption, research R4), asserted because the two numbers
     * are the easiest pair in this project to confuse: `formatVersion` versions **our
     * publications against this app's parsers**, and P50's number versions **her data
     * against every app that opens it**. Coupling them would make an app update able to
     * claim something about a vault it has never seen.
     */
    const dir = join(repoRoot, 'app', 'packages', 'core', 'src', 'corpus-update');
    for (const f of readdirSync(dir)) {
      const code = readFileSync(join(dir, f), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
      expect(code, f).not.toContain('VAULT_SCHEMA');
      expect(code, f).not.toContain('vaultSchema');
    }
  });
});
