import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

/**
 * The diagram wiring (022 T010/T012/T016/T018, FR-2001/2002/2005/2006/2011).
 *
 * `runCompose` needs a provider, a key, a vault and a window, so what is run here is the
 * **corpus** — against the repository's own file — and what is asserted over the source is
 * the wiring, with the comments stripped. That split is deliberate: the corpus claims are
 * about a file a PT edits and must be checked by reading it, and the wiring claims are
 * about which of two sentences is sent, which has no unit-testable seam short of running
 * the whole job against a model.
 */
const repoRoot = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');
vi.mock('../src/corpus/bundle.js', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  corpusRoot: () => repoRoot,
}));

const { parseFigureCorpus } = await import('@rampa/core');
const corpus = parseFigureCorpus(
  readFileSync(join(repoRoot, 'instructions', 'figures.md'), 'utf8'));

const src = readFileSync(
  join(repoRoot, 'app', 'packages', 'shell', 'src', 'jobs', 'compose.ts'), 'utf8');
const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

describe('the request rides the existing call (T010)', () => {
  it('the requests are parsed out of the same response as the exercises', () => {
    // **No new provider call**: a sheet with diagrams costs what a sheet without them
    // costs. The requests are extra lines the model may add after the exercises.
    expect(code).toContain('parseDiagramRequests(raw, figures)');
    expect(code).toContain('return { proposed: args.shape.parse(raw), cents, raw };');
  });

  it('and there is exactly one place a figure is built', () => {
    // A second construction site is a second set of quantities, and one of them would
    // eventually not be the exercise's.
    expect((code.match(/figureQuantities\(/g) ?? []).length).toBe(1);
    expect((code.match(/drawn\.set\(/g) ?? []).length).toBe(1);
  });

  it('the corpus is read at compose time and never at render time', () => {
    // Its judgement is baked into the stamped block, which is what makes a composed
    // document renderable anywhere for ever (FR-2004).
    expect(code).toContain("parseFigureCorpus(await loadInstruction('figures'))");
    const render = readFileSync(
      join(repoRoot, 'app', 'packages', 'core', 'src', 'render', 'figures', 'render.ts'), 'utf8');
    expect(render).not.toContain('parseFigureCorpus');
    expect(render).not.toContain('loadInstruction');
  });

  it('an unverified group stamps nothing (FR-2003)', () => {
    // One branch, two guarantees: no answer in the key, no picture on the page.
    expect(code).toMatch(/group\.of !== undefined \|\| group\.unverified\) continue/);
  });
});

describe('the theme comes from her vault or not at all (T016, FR-2005/2006)', () => {
  it('the corpus carries both sentences, and the code chooses between them', () => {
    expect(corpus.themeWhenKnown).toContain('{interests}');
    expect(corpus.themeWhenUnknown).toBeTruthy();
    // Themed at random would be inventing a fact about a child — the same refusal `011`
    // makes about ages and courses.
    expect(corpus.themeWhenUnknown).toContain('sencillos');
    expect(code).toContain('args.figures.themeWhenKnown.replace');
    expect(code).toContain('args.figures.themeWhenUnknown');
  });

  it('and an arriving theme is dropped when nothing was recorded', () => {
    // Not «the prompt did not ask for one»: a model may theme anyway, and a theme with no
    // recorded interest behind it is a fact about the child that nobody wrote down.
    expect((code.match(/learner\.profile\.interests \?\? \[\]\)\.length > 0/g) ?? []).length)
      .toBe(2);
  });

  it('the diagram invitation reaches the exercise path only', () => {
    // A study text has no verified quantity to draw from and a composed problem tells its
    // own story. Absence of the corpus is what stops the invitation being sent, so a path
    // that must not offer diagrams cannot.
    expect(code).toContain('shape.noun === EXERCISE_SHAPE.noun ? { figures }');
  });
});

describe('the property line, and what actually enforces it (T018, FR-2007)', () => {
  it('the corpus says it, in the words she and the model both read', () => {
    // A trademark on a child's worksheet is a sharper infringement than a Creative
    // Commons breach, and this project has just spent a day being careful about the
    // softer one.
    expect(corpus.requestFormat).toContain('personajes');
    expect(corpus.requestFormat).toContain('marcas');
    expect(corpus.requestFormat).toContain('Pikachu');
  });

  it('and the structural half is the allowlist, not the sentence', () => {
    /*
     * The sentence is a request; the wall is a fact. No `image`, no `use`, no external
     * reference means **no artwork can be embedded at all** — so the worst a model can do
     * with a character is draw a rough silhouette out of rectangles, and the rest is her
     * review. Recorded as a limit rather than claimed as solved.
     */
    const validate = readFileSync(
      join(repoRoot, 'app', 'packages', 'core', 'src', 'render', 'figures', 'validate.ts'),
      'utf8');
    for (const forbidden of ['image', 'use']) {
      expect(validate).not.toMatch(new RegExp(`'${forbidden}',`));
    }
  });
});

describe('what the report says (T012, FR-2002/2011/2015)', () => {
  it('every refusal becomes a note, and the notes become the report', () => {
    expect(code).toContain('...figureRefusals.map((r) => r.detail)');
  });

  it('a disagreeing quantity is named rather than silently corrected', () => {
    // «La cantidad la corregí yo» is a sentence she can act on; a silent correction is a
    // model whose mistakes she never learns about.
    expect(code).toContain("reason: 'quantities-drifted'");
    expect(src).toContain('Lo he dibujado con las cantidades del');
  });

  it('and a refused glyph loses the theme, not the diagram', () => {
    // Losing a correct picture over a decoration would be trading the part that matters
    // for the part that does not. She is told either way.
    expect(code).toMatch(/figureRefusals\.push\(glyph\);/);
    expect(code).not.toMatch(/isRefusal\(glyph\)\) \{[^}]*continue/);
  });
});

describe('the corpus this all rests on', () => {
  it('declares four kinds, each with its operations and its description', () => {
    expect(corpus.kinds).toHaveLength(4);
    for (const k of corpus.kinds) {
      expect(k.for.length, k.id).toBeGreaterThan(0);
      expect(k.describe, k.id).toContain('{');
    }
  });

  it('and bounds that are numbers a person can change', () => {
    expect(corpus.bounds.maxCells).toBeGreaterThan(1);
    expect(corpus.bounds.maxLineSpan).toBeGreaterThan(1);
    expect(corpus.bounds.maxParts).toBeGreaterThan(1);
  });

  it('but not the allowlist, which is deliberately not editable', () => {
    const figures = readFileSync(join(repoRoot, 'instructions', 'figures.md'), 'utf8');
    // A security boundary a teacher can edit is not a boundary (Principle IX). The file
    // says so about itself, which is where somebody looking for it will read it.
    expect(figures).toContain('validate.ts');
    expect(figures).not.toContain('allowlist:');
    expect(figures).not.toMatch(/^\s*elements:/m);
  });
});

/**
 * A stale diagram has no path to exist (022 T011, FR-2016).
 *
 * ## Two guarantees, and neither of them is a check
 *
 * **A correction re-composes.** `correctComposition` re-runs `runCompose` (`021` R3, and
 * the reason it is not `job:revise`), so the sheet is rebuilt and its figures with it.
 * There is no code path that updates an exercise and keeps its figure, which is a
 * stronger statement than «a check catches it»: the state cannot be reached.
 *
 * **And a figure is born in one place.** `buildSheet` stamps figure blocks and nothing
 * else does. Adaptation invents no diagrams — not because a check refuses but because no
 * call exists.
 *
 * What the render-time cross-check is for is the third case, which is neither of those: a
 * document a teacher edited by hand in her vault. That one is asserted in
 * `figures-never-a-way-in.test.ts`.
 *
 * **Not asserted here**: the end-to-end «correct a composition and look for old numbers»
 * walk, which needs a provider and is T025. Said rather than left to be assumed covered.
 */
describe('a stale diagram cannot exist (T011)', () => {
  it('correcting a composition re-composes, so the figures are rebuilt', () => {
    const correcting = code.slice(code.indexOf('export async function correctComposition'));
    expect(correcting).toContain('runCompose(');
    // And it is not the adaptation path, which would leave the figures untouched beside
    // exercises it had changed.
    expect(correcting).not.toContain('runAdaptation(');
  });

  it('and only `buildSheet` ever writes a figure block', () => {
    for (const [where, file] of [
      ['the adaptation', ['packages', 'shell', 'src', 'jobs', 'adapt.ts']],
      ['the compose job', ['packages', 'shell', 'src', 'jobs', 'compose.ts']],
      ['the guide', ['packages', 'shell', 'src', 'jobs', 'guide.ts']],
    ] as const) {
      const other = readFileSync(join(repoRoot, 'app', ...file), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
      expect(other, `${where} writes a figure block`).not.toContain("'data-figure'");
    }
    const sheet = readFileSync(
      join(repoRoot, 'app', 'packages', 'core', 'src', 'compose', 'sheet.ts'), 'utf8');
    expect(sheet).toContain("'data-figure'");
  });
});
