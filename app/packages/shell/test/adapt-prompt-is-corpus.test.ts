import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

/*
 * Same shape as `content-path-system.test.ts`: only `governingRoot` is replaced,
 * because it asks Electron where the application is and there is no Electron here.
 * Pointed at the source tree and not `app/corpus/`, which is a build artefact — a
 * test that needs `npm run bundle:corpus` first fails on a fresh clone for no reason.
 */
const repoRoot = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');
vi.mock('../src/corpus/bundle.js', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  corpusRoot: () => repoRoot,
  governingRoot: async () => repoRoot,
}));

const { systemPrompt } = await import('../src/jobs/adapt.js');

/**
 * The adaptation prompt is the corpus, and nothing else (Principle I, backlog G72).
 *
 * ## What this is guarding against, and why it needs a test
 *
 * `app/README.md` tells the story: «the entire adaptation prompt used to be a string in
 * `packages/shell/src/jobs/adapt.ts` while the real instructions sat unread in the
 * bundle». It was rebuilt to assemble from `instructions/`, and **one sentence stayed
 * behind** — an `OUTPUT_FORMAT` constant appended after the corpus, telling the model
 * «devuelve únicamente el documento adaptado, en el mismo formato que recibes».
 *
 * That remnant survived a year and then cost something. When the output format was
 * finally written out properly in `instructions/adapt.md` (G68 — the model was returning
 * HTML because the corpus never showed it the fences), this constant was still appended
 * **last**, still saying the vague thing. Two copies of one rule, the weaker one with the
 * final word, which is the drift AGENTS.md names: «the drift between two copies of the
 * same rule is how this repository has produced defects before».
 *
 * Principle I is «the weakest gate in the project because nothing structural enforces
 * it». This is the structural enforcement for the one prompt that has already been
 * violated once: the assembled system prompt must be the two corpus files, joined, with
 * nothing of the application's own in it.
 */
const read = (name: string) =>
  readFileSync(join(repoRoot, 'instructions', `${name}.md`), 'utf8');

describe('the adaptation prompt carries no prose of the application’s own', () => {
  it('is exactly the corpus files it declares, joined', async () => {
    const prompt = await systemPrompt();
    const expected = `${read('hard-rules')}\n\n---\n\n${read('adapt')}`;
    expect(prompt).toBe(expected);
  });

  it('does not end with an instruction the corpus cannot correct', async () => {
    const prompt = await systemPrompt();
    // The exact remnant, and the shape of it: a sentence after the corpus ends.
    expect(prompt).not.toMatch(/en el mismo formato que recibes/);
    expect(prompt.trimEnd()).toBe(
      `${read('hard-rules')}\n\n---\n\n${read('adapt')}`.trimEnd());
  });

  it('reads a corpus that actually says how to return the document', async () => {
    /*
     * The other half of the same defect. Removing the app's sentence is only safe
     * because the corpus now carries the instruction — and better. If someone trims
     * §Output back, this fails rather than the model quietly returning HTML again.
     */
    const prompt = await systemPrompt();
    expect(prompt).toMatch(/Not HTML/i);
    expect(prompt).toMatch(/::: \{#/);
    expect(prompt).toMatch(/data-recipe/);
  });
});
