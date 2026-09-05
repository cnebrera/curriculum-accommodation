import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { AXES } from '../src/vault/schema.js';

/**
 * Two absences, asserted (032 T006, FR-3002 and FR-3006).
 *
 * An absence is the finding — the pattern `021` established for «no answer key reaches a
 * learner's sheet». Both of these are things that must *not* appear, and both are things
 * a later edit would add for reasons that look like tidying up at the time:
 *
 * **(a)** Only CUR has an area dimension. The moment `curFor` exists, generalising it to
 * `axisLevelOf(p, axis, area)` looks like removing a special case. It is not: the other
 * nine axes describe barriers that travel with the child *between* subjects. A per-area
 * DEC would say a learner decodes text differently in Mates than in Lengua, which is a
 * category error in the opposite direction from the one this feature fixes.
 *
 * **(b)** The significant-adaptation stop stays keyed on **the request**. P12 untied it
 * from the profile on 2026-09-04; the moment a per-area CUR exists is the first moment
 * somebody can re-tie it — «now that we know the gap *in this subject*, surely…». That
 * argument is wrong for the reason `adapt.md` already gives: most learners in an aula de
 * apoyo are one or two years behind and sit their group's exams with access adaptations,
 * which touch no objective at all. Keying a refusal on the gap refuses the ordinary case.
 */
const appRoot = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..');
const repoRoot = join(appRoot, '..');

const walk = (dir: string): string[] => {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'out' || entry.startsWith('.')) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(path);
  }
  return out;
};

const sources = (): Array<{ path: string; text: string }> =>
  [join(appRoot, 'packages'), join(appRoot, 'ui')]
    .flatMap(walk)
    .map((f) => ({ path: f.replace(`${appRoot}/`, ''), text: readFileSync(f, 'utf8') }));

/**
 * Comments stripped before matching.
 *
 * The prose above this line argues about `CUR>=2` in order to forbid it, and a guard that
 * its own explanation trips is a guard that gets deleted rather than obeyed. The same
 * reason `031`'s false-sentence test strips comments before searching.
 */
const code = (text: string): string =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

describe('only CUR has an area dimension (FR-3002)', () => {
  it('no generic per-area axis structure exists anywhere', () => {
    const offenders = sources()
      .filter(({ text }) => /axes_by_area|axesByArea|areasByAxis|levelFor\(\s*axis/.test(code(text)))
      .map(({ path }) => path);
    expect(offenders).toEqual([]);
  });

  it('`curFor` is CUR\'s alone: nothing passes it an axis', () => {
    /*
     * The signature is `curFor(profile, area?)` and an axis argument is what a
     * generalisation would add first. Matching the call shape rather than the name
     * catches the rename-and-widen too.
     */
    const offenders = sources()
      .filter(({ text }) => /curFor\(\s*[^,)]+,\s*['"](PER-V|PER-A|DEC|LIN|COG|ATE|EJE|MOT|REG)['"]/
        .test(code(text)))
      .map(({ path }) => path);
    expect(offenders).toEqual([]);
  });

  it('the ten axes are still ten, in one place, with CUR among them', () => {
    // A per-area axis would want its own list. There is one.
    expect(AXES).toHaveLength(10);
    expect(AXES).toContain('CUR');
    const declarations = sources()
      .filter(({ text }) => /const AXES\s*=/.test(code(text)))
      .map(({ path }) => path);
    expect(declarations).toEqual(['packages/core/src/vault/schema.ts']);
  });
});

describe('the significant-adaptation stop stays keyed on the request (FR-3006, P12)', () => {
  it('no code path refuses or stops on a CUR value, per-area or general', () => {
    /*
     * What this looks for is a **comparison** of a CUR value against a level — the shape
     * `curFor(...) >= 2` or `axisLevelOf(p, 'CUR') > 1`. Reading the value is fine and is
     * the whole feature; branching a refusal on it is the defect.
     *
     * The window between the read and the operator is deliberate: `curFor` returns `null`
     * for an unobserved axis, so the realistic shape is `(curFor(p) ?? 0) >= 2` and a
     * pattern demanding the operator immediately after the closing bracket walks straight
     * past it. A tripwire that only catches the clumsy way of doing the forbidden thing is
     * worse than none, because it reports safety.
     *
     * **What it does not catch**, said plainly rather than left to be discovered: an
     * aliased import (`import { curFor as gap }`). A text search over source cannot see
     * through a rename, and pretending otherwise is the same overclaim this feature is
     * built to remove. What the test is for is the edit somebody makes in good faith
     * while tidying — that edit calls the function by its name.
     */
    const offenders = sources()
      .filter(({ text }) => {
        const src = code(text);
        return /(curFor\(|axisLevelOf\([^)]*['"]CUR['"]\))[^;\n]{0,48}(>=|<=|>|<|===|!==)\s*\d/
          .test(src);
      })
      .map(({ path }) => path);
    expect(offenders,
      'a refusal keyed on the gap refuses the ordinary case: one or two years behind, '
      + 'sitting the group exam with access adaptations').toEqual([]);
  });

  it('and `instructions/adapt.md` speaks of the request, not of a level', () => {
    /*
     * Guarded the way `corpus-guarantees.test.ts` already guards corpus sentences: the
     * judgement lives in Markdown (Principle I), so the assertion is on the Markdown.
     * This is what makes P12's correction survive `032` rather than being remembered.
     */
    const adapt = readFileSync(join(repoRoot, 'instructions/adapt.md'), 'utf8');
    expect(adapt).toContain('What triggers the stop is what the');
    expect(adapt).toContain('never how far behind the learner is');
    // The sentence that says the level is not the trigger, in her language.
    expect(adapt).toMatch(/se paran igual con `CUR: 0` que con `CUR: 3`/);
    // And no rule anywhere phrased as «CUR de 2 o más ⇒ para».
    expect(adapt).not.toMatch(/CUR\s*(>=|≥|de)\s*2[^\n]{0,40}(para|stop|niega|rehúsa)/i);
  });
});

describe('no `<datalist>` anywhere, because typing into one kills the window', () => {
  it('is absent from every source file', () => {
    /*
     * A crash, found by pressing a key in the built application (032 T009/T021).
     *
     * An `<input list="…">` linked to a `<datalist>` opens a suggestion popup on the
     * first real keystroke, and that popup takes the renderer down with it: her window
     * disappears mid-sentence, with whatever she had not saved.
     *
     * **Every automated test missed it**, and the reason is worth more than the fix:
     * Playwright's `fill()` sets an input's value without dispatching key events, so a
     * suite can type into a datalist input all day and never open the popup. What found
     * it was `press('L')` — one key, by hand, in the real window.
     *
     * Guarded rather than remembered because the control is genuinely tempting: a list of
     * her own subjects beside a text box is exactly what `<datalist>` is for. The
     * replacement — buttons for what she has, a plain input for what she does not — costs
     * nothing and reads better besides.
     */
    const offenders = sources()
      .filter(({ text }) => /<datalist|\blist=["{]/.test(code(text)))
      .map(({ path }) => path);
    expect(offenders, 'an <input list> popup crashes the renderer on the first keystroke')
      .toEqual([]);
  });
});
