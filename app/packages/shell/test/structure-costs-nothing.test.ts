import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

/**
 * An agenda costs nothing, and that is a property of the code (028 T010, FR-2602).
 *
 * ## Why this is a source-level check
 *
 * «No model call» is the kind of claim that is true on the day it is written and false
 * six weeks later, when somebody adds «and let the model suggest the moments» to a screen
 * that already had everything else. Nobody would be doing anything wrong: the suggestion
 * is genuinely useful, and the file it lands in already imports a builder and a vault.
 *
 * What makes it a defect is what she was told. The whole argument for structure material
 * is that a PT can sit down at four in the afternoon, with no connection and no key, and
 * have the day's strip printed in five minutes. A version that quietly needs a provider
 * for one of its three kinds breaks that promise on the afternoon she most needs it, and
 * the failure looks like a bug in the school's wifi.
 *
 * So the boundary is asserted rather than remembered. The same shape `021` used for «no
 * `runAdaptation` in `jobs/compose.ts`»: an absence, checked.
 *
 * ## What is deliberately outside it
 *
 * The **social story** (`historia`) is drafted by a model and is supposed to be. It lives
 * in `runStory`, it records its cost through the ordinary path, and it is not what this
 * test guards. What must never happen is the agenda and the sequence acquiring one.
 */
const shell = join(dirname(new URL(import.meta.url).pathname), '..');

const read = (rel: string): string =>
  readFileSync(join(shell, 'src', rel), 'utf8')
    // Comments stripped: this file's own prose names the modules it forbids.
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

/** The two files an agenda actually travels through. */
const PATH = ['jobs/structure.ts', 'ipc/structure.ts'] as const;

describe('the agenda path cannot spend money', () => {
  it('imports nothing from the providers package', () => {
    for (const file of PATH) {
      expect(read(file), `${file} must not reach a provider`)
        .not.toMatch(/@rampa\/providers/);
    }
  });

  it('and calls nothing that sends or records a cost', () => {
    /*
     * Named individually rather than by a pattern, because the names are the point: these
     * are the four functions through which anything in this application reaches a model
     * or a bill. A new one appearing is a change somebody has to make deliberately, and
     * this list is where they meet the question.
     */
    for (const file of PATH) {
      const src = read(file);
      for (const forbidden of ['sendRedacted', 'recordCost', 'addCost', 'activeProvider']) {
        expect(src, `${file} calls ${forbidden}`).not.toContain(forbidden);
      }
    }
  });

  it('and neither does the builder it calls', () => {
    /*
     * `packages/core` is model-free by design and the isolation suite already walks it.
     * Asserted here anyway for the one file this feature added, because the isolation
     * suite's claim is about the package and this one is about the promise.
     */
    const build = readFileSync(
      join(shell, '..', 'core', 'src', 'structure', 'build.ts'), 'utf8');
    expect(build).not.toMatch(/@rampa\/providers|fetch\(|https?:\/\//);
  });

  it('the story is the exception, and it is the one that is allowed a provider', () => {
    /*
     * Stated as a test so the boundary is a shape rather than a convention: if the story
     * ever moves into `jobs/structure.ts`, the assertions above start failing and whoever
     * moved it has to decide where the line is instead of discovering later that an
     * agenda now needs a key.
     */
    expect(read('jobs/structure.ts')).not.toContain('runStory');
  });
});
