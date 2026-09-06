import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

/*
 * The corpus is the repository's own `instructions/` and `recipes/`.
 *
 * `corpusRoot()` asks Electron where the application is, and there is no Electron
 * here. Only that one function is replaced — `walk` and the readers stay real — so
 * what these tests read is the corpus a teacher would correct, not a fixture. It is
 * pointed at the source tree rather than `app/corpus/`, which is a build artefact
 * and gitignored: a test that needs `npm run bundle:corpus` first is a test that
 * fails on a fresh clone for no reason.
 */
const repoRoot = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');
vi.mock('../src/corpus/bundle.js', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  /*
   * `governingRoot` and not `corpusRoot` (`034` T006).
   *
   * Every reader of recipes and instructions now asks «which corpus **governs**» rather
   * than «where is the bundle», because an accepted update has to reach all of them or
   * none. Mocking the old name silently stopped reaching these callers — which is the
   * seam moving, and the tests following it.
   */
  corpusRoot: () => repoRoot,
  governingRoot: async () => repoRoot,
}));

const { judgementLayer, systemPrompt, contentSystemPrompt } = await import('../src/jobs/compose.js');

/**
 * The content path has its own system, and a cut text is not an answer
 * (review AGE-04 and AGE-07, queue item 2.12).
 *
 * ## AGE-04, which was the worse of the two
 *
 * `composeContent` was handed `systemPrompt()` — the arithmetic one, which ends in
 * «Devuelve únicamente una línea por ejercicio… sin numerar, sin explicaciones, sin
 * texto alrededor» — while its own user message asked for IR blocks with
 * `data-objective` and `data-anchor`. Two contradictory output formats in one call.
 * A model that obeyed the system returned something `parseIR` cannot read, both
 * attempts failed, she paid for two 4.000-token calls, and the error told her the
 * text «se apoyaba en cosas que no me diste» — a wrong diagnosis that sends her to
 * fix her anchor when the fault was ours.
 *
 * ## Why the judgement layer is asserted to be shared
 *
 * The fix is not «a second prompt». Hard rules and `compose.md` are the pedagogical
 * judgement (Principle I) and must reach both paths identically; only the wire
 * format differs. A fix that forked the judgement too would let the two paths drift
 * apart in what they consider acceptable material, which is the expensive kind of
 * divergence — so the shared part is asserted, not just the difference.
 */
describe('the two paths share their judgement and not their format', () => {
  it('both carry the hard rules and compose.md', async () => {
    const layer = await judgementLayer();
    for (const system of [await systemPrompt(), await contentSystemPrompt()]) {
      expect(system.startsWith(layer),
        'a path that does not carry the judgement layer is adapting without the rules').toBe(true);
    }
  });

  it('the exercise path asks for one line per exercise', async () => {
    expect(await systemPrompt()).toContain('una línea por ejercicio');
  });

  it('the content path does not, because it asks for blocks', async () => {
    const system = await contentSystemPrompt();
    expect(system, 'the contradictory format is back').not.toContain('una línea por ejercicio');
    expect(system).not.toContain('sin texto alrededor');
    // And it says what the call *is* for, so the model is not left to infer it from
    // a user message that only describes markup.
    expect(system).toContain('material de estudio');
  });
});

/**
 * ## AGE-07, and why a source test is the honest instrument here
 *
 * `composeContent` cannot run offline: it needs a provider, a key and a vault, and
 * this package has no fake-provider harness. What *is* checked by running code is
 * the adapters' side — `packages/providers/test/truncation.test.ts` proves all three
 * report the cut, and each of those seams is mutation-verified.
 *
 * What is left is the wiring, and the wiring is what regressed before: the call site
 * passing the wrong system is exactly the AGE-04 defect, and a reader that ignores
 * `chunk.truncated` is exactly this project's signature defect — a field written,
 * typed and read by nothing (BACKLOG G36). So the wiring is asserted against the
 * source, with the comments stripped, because this file's neighbours have twice
 * failed on their own prose.
 */
const src = readFileSync(join(repoRoot, 'app', 'packages', 'shell', 'src', 'jobs', 'compose.ts'), 'utf8');
const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

describe('the wiring, which is where both defects lived', () => {
  it('the content call is given the content system', () => {
    expect(code).toMatch(/system:\s*await contentSystemPrompt\(\)/);
  });

  it('the arithmetic system reaches the arithmetic path only', () => {
    // One call site builds `system` for the exercise loop; nothing else may reuse it
    // for content. Asserted as a count so a second `composeContent(… system …)`
    // cannot creep back in.
    const contentCall = code.slice(code.indexOf('composeContent({'));
    expect(contentCall.slice(0, 400)).not.toMatch(/[^t]system,/);
  });

  it('the cut is read, not merely typed', () => {
    expect(code, 'chunk.truncated is written by three adapters and read by nobody')
      .toContain('chunk.truncated');
  });

  it('a cut becomes a problem the retry can see, and refuses if it persists', () => {
    expect(code).toMatch(/if \(truncated\)/);
    expect(code).toContain('límite de longitud');
  });

  it('the final error names the cut instead of blaming her anchor', () => {
    // The old message was unconditional. A run that failed on length told her to
    // give more anchor text, which costs her the next attempt as well.
    const thrown = code.slice(code.indexOf("RampaError('ir-no-provenance'"));
    expect(thrown).toContain('cutOff');
    expect(thrown.slice(0, 600)).toContain('se me ha cortado por longitud');
  });
});
