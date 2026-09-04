import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { parseRecipe, selectRecipes, inScope, type Recipe, type Profile } from '../src/index.js';

/**
 * What recipe selection produces **today** (012 T001).
 *
 * This file exists to be a diff. `recipe.scope` is populated across every recipe
 * in the corpus and read by nothing — `selectRecipes` filters on axes and
 * language, resolves conflicts, and never looks at the field. T005 turns it on,
 * which is a **silent behaviour change to every adaptation this application has
 * ever produced**.
 *
 * Landing that without first recording what selection returns now means the first
 * person to notice is a teacher whose worksheets got quietly worse, and nobody
 * connects it to the commit. So: the current answers, written down, and T005
 * updates them in the same commit that changes the behaviour, so a reviewer reads
 * the difference rather than being told about it.
 *
 * **This is not a test of correctness.** Several of the expectations below are
 * arguably wrong — that is the point. It asserts what is, so that what changes is
 * visible.
 *
 * ## Updated 2026-08-31, in the commit that turned `scope` on (T005/T006)
 *
 * Both sides are now recorded. The `before` snapshots are unchanged and still
 * pass, because filtering is **opt-in**: a caller that passes no document gets
 * exactly what it got yesterday, which is what makes this a change somebody chose
 * rather than a change that happened.
 *
 * The `after` snapshots are the same four profiles against three real documents.
 * The difference between the two sets is the review.
 */
const repoRoot = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((e) => {
    const p = join(dir, e);
    return statSync(p).isDirectory() ? walk(p) : (p.endsWith('.md') && !p.endsWith('README.md') ? [p] : []);
  });
}

const corpus: Recipe[] = (() => {
  const root = join(repoRoot, 'recipes');
  const out: Recipe[] = [];
  for (const f of walk(root)) {
    const origin = f.includes('/conflicts/') ? 'conflict' : f.includes('/lang/') ? 'lang' : 'core';
    const r = parseRecipe(readFileSync(f, 'utf8'), f.slice(root.length + 1), origin);
    if (r) out.push(r);
  }
  return out;
})();

/** Four profiles that between them trigger most of the corpus. */
const profile = (code: string, axes: Record<string, 0 | 1 | 2 | 3>): Profile => ({
  code, axes, works: [], avoid: [], interests: [],
  response: {}, language: {},
} as Profile);

const PROFILES: Array<{ name: string; profile: Profile }> = [
  { name: 'cognitive load and attention', profile: profile('B01', { COG: 3, ATE: 2 }) },
  { name: 'executive function', profile: profile('B02', { EJE: 3, DEC: 2 }) },
  { name: 'visual access', profile: profile('B03', { 'PER-V': 3 }) },
  { name: 'reading, in Spanish', profile: profile('B04', { DEC: 3, LIN: 2 }) },
];

const byName = (name: string): Profile =>
  PROFILES.find((x) => x.name === name)!.profile;

const selected = (p: Profile, lang?: string): string[] =>
  selectRecipes(corpus, p, lang).selected.map((r) => r.id).sort();

describe('the corpus is loaded at all', () => {
  it('found the recipes', () => {
    // A baseline over an empty corpus would record nothing and pass for ever.
    expect(corpus.length).toBeGreaterThanOrEqual(8);
  });

  it('every recipe declares a scope, which nothing currently reads', () => {
    const without = corpus.filter((r) => r.scope.length === 0).map((r) => r.id);
    expect(without, 'a recipe with no scope would be unaffected by T005').toEqual([]);
  });
});

describe('selection today, per profile', () => {
  for (const { name, profile } of PROFILES) {
    it(`${name} — before scope filtering`, () => {
      expect(selected(profile, 'es')).toMatchSnapshot();
    });
  }
});

/** Three documents, by the block classes they contain. */
const DOCUMENTS: Array<{ name: string; classes: string[] }> = [
  { name: 'a worksheet: instructions and exercises', classes: ['instruction', 'exercise'] },
  { name: 'an exam: assessments and a figure', classes: ['assessment', 'figure', 'instruction'] },
  { name: 'a study text: explanation only', classes: ['explanation', 'example'] },
];

describe('selection after scope filtering', () => {
  for (const doc of DOCUMENTS) {
    for (const { name, profile } of PROFILES) {
      it(`${doc.name} · ${name}`, () => {
        expect(selectRecipes(corpus, profile, 'es', doc.classes).selected.map((r) => r.id).sort())
          .toMatchSnapshot();
      });
    }
  }
});

describe('MOT finally selects something (019 US4)', () => {
  /**
   * A live defect rather than a missing feature: the teacher set the axis, zero
   * recipes read it, and she believed she had told us. `recipes/core/response-route.md`
   * is the corpus half; this is the assertion that it reaches a profile.
   */
  it('a learner who cannot write by hand gets a recipe about how he answers', () => {
    const p = profile('B05', { MOT: 2 });
    const ids = selectRecipes(corpus, p, 'es', ['instruction', 'exercise']).selected.map((r) => r.id);
    expect(ids, 'MOT>=2 selects nothing: 019 US4 has regressed').toContain('response-route');
  });

  it('and not for a learner who writes normally', () => {
    const p = profile('B06', { MOT: 0 });
    const ids = selectRecipes(corpus, p, 'es', ['instruction', 'exercise']).selected.map((r) => r.id);
    expect(ids).not.toContain('response-route');
  });

  it('applies to an exam, because a response route is an access arrangement', () => {
    const p = profile('B05', { MOT: 3 });
    const ids = selectRecipes(corpus, p, 'es', ['assessment']).selected.map((r) => r.id);
    expect(ids).toContain('response-route');
  });
});

describe('the coverage gap the filter revealed', () => {
  /**
   * **G20, opened by this test and closed on 2026-08-31.**
   *
   * With `scope` honoured, a study text made of `explanation` and `example` blocks
   * selected **zero** recipes for a learner with high cognitive load or weak
   * executive function: every load recipe in the corpus was scoped to `exercise` or
   * `assessment`.
   *
   * Before the filter, that learner got `one-task-per-page` (about exercises, and
   * being applied to prose anyway) and `exam-access-not-difficulty` (about exams,
   * and nonsense there). The coverage was never real — it was two misapplied
   * recipes, and this test is what made that visible.
   *
   * Closed the way the backlog entry demanded: **not** by loosening a scope, which
   * would have put the misapplication back and hidden it again, but by writing the
   * recipes the corpus was missing — `chunk-the-prose` (`COG`) and
   * `signpost-the-page` (`EJE`).
   *
   * The assertion is inverted rather than deleted. What it now protects is that the
   * prose recipes stay scoped to prose: if `chunk-the-prose` ever acquires
   * `exercise` in its scope, or the study text goes empty again, this fails.
   */
  it('a study text now selects the prose recipes — G20 closed', () => {
    const studyText = ['explanation', 'example'];

    const forLoad = selectRecipes(corpus, byName('cognitive load and attention'), 'es', studyText);
    expect(forLoad.selected.map((r) => r.id)).toContain('chunk-the-prose');

    const forExecutive = selectRecipes(corpus, byName('executive function'), 'es', studyText);
    expect(forExecutive.selected.map((r) => r.id)).toContain('signpost-the-page');
  });

  /**
   * `axes:` is **AND**, and it caught the author of those two recipes.
   *
   * `chunk-the-prose` was written `[COG>=2, EJE>=2, ATE>=2]`, which means «all three
   * at once» and fired for **neither** baseline profile — a recipe written to close a
   * coverage gap, covering nothing. The ninth instance in this project of something
   * written, parsed and read by nobody.
   *
   * Asserted rather than remembered: a prose recipe that stops applying to the
   * profile it was written for fails here.
   */
  it('each prose recipe fires for the axis it was written for', () => {
    const studyText = ['explanation', 'example'];
    const fires = (name: string, recipe: string): boolean =>
      selectRecipes(corpus, byName(name), 'es', studyText).selected.some((r) => r.id === recipe);

    expect(fires('cognitive load and attention', 'chunk-the-prose'), 'COG → chunk').toBe(true);
    expect(fires('executive function', 'signpost-the-page'), 'EJE → signpost').toBe(true);
    // And neither is a recipe that applies to everybody, which would be the other
    // way to make this test pass and would mean nothing.
    expect(fires('visual access', 'chunk-the-prose'), 'PER-V alone → no chunk').toBe(false);
    expect(fires('visual access', 'signpost-the-page'), 'PER-V alone → no signpost').toBe(false);
  });
});

describe('what changed, stated rather than left to the snapshots', () => {
  /**
   * The finding this whole spec rests on, now fixed and asserted from both ends.
   */
  it('an assessment-scoped recipe is no longer offered for a document with no assessments', () => {
    const examOnly = corpus.find((r) => r.id === 'exam-access-not-difficulty');
    expect(examOnly, 'the fixture recipe is gone; update this baseline').toBeDefined();
    expect(examOnly!.scope).toEqual(['assessment']);

    const study = ['explanation', 'example'];
    const exam = ['assessment', 'instruction'];

    expect(inScope(examOnly!, study), 'offered for a study text').toBe(false);
    expect(inScope(examOnly!, exam), 'not offered for an exam').toBe(true);

    // And end to end, for the profile the baseline shows it reaching.
    const before = selectRecipes(corpus, PROFILES[0]!.profile, 'es').selected.map((r) => r.id);
    const after = selectRecipes(corpus, PROFILES[0]!.profile, 'es', study).selected.map((r) => r.id);
    expect(before).toContain('exam-access-not-difficulty');
    expect(after).not.toContain('exam-access-not-difficulty');
  });

  /**
   * Opt-in, and that is load-bearing rather than cautious: it is what makes the
   * old snapshots still pass, and therefore what makes the diff in this commit
   * the whole of the behaviour change rather than part of it.
   */
  it('passing no document changes nothing', () => {
    for (const { profile } of PROFILES) {
      expect(selectRecipes(corpus, profile, 'es').selected.map((r) => r.id))
        .toEqual(selectRecipes(corpus, profile, 'es', undefined).selected.map((r) => r.id));
    }
  });

  /** A recipe declaring no restriction is not given one on its author's behalf. */
  it('a recipe with no scope applies anywhere', () => {
    const unscoped = { id: 'x', scope: [] } as unknown as Recipe;
    expect(inScope(unscoped, ['explanation'])).toBe(true);
    expect(inScope(unscoped, [])).toBe(true);
  });
});

/**
 * The conflict machinery, over the shipped corpus (review CONS-08, decision P27).
 *
 * ## What was silent
 *
 * `one-task-per-page` is scoped `[exercise, assessment]` and says «when one
 * exercise contains several sub-questions, split those too». `exam-access-not-
 * difficulty` lists «splitting a two-part answer into two one-part answers on an
 * assessment» among its anti-patterns. **Both are selected over the same
 * `.assessment` block**, neither declared the other, and the review's own note is
 * the point: the machinery was not dead — `lectura-facil` declares one conflict —
 * it was under-used, one declaration in ten recipes, so this pair was resolved by
 * whichever text the model happened to follow.
 *
 * And the commonest pair in a support classroom, dyslexia plus ADHD, had no
 * conflict recipe at all: `DEC>=2` asks for more on the page and `ATE>=2` asks for
 * less, and nothing in the corpus said who wins.
 */
describe('conflicts are declared, so they are recorded rather than guessed', () => {
  const find = (id: string): Recipe => corpus.find((r) => r.id === id)!;

  it('the exam pair declares itself, in both directions', () => {
    // Both directions, because the resolver walks each recipe's own list: a
    // one-sided declaration resolves only when that one happens to be visited.
    expect(find('one-task-per-page').conflicts).toContain('exam-access-not-difficulty');
    expect(find('exam-access-not-difficulty').conflicts).toContain('one-task-per-page');
  });

  it('and on an exam the guard is kept, with the constraint written down', () => {
    // `COG:3 ATE:2` selects `one-task-per-page`; the guard applies to every
    // `.assessment` block regardless of profile.
    const exam = ['assessment', 'instruction'];
    const sel = selectRecipes(corpus, byName('cognitive load and attention'), 'es', exam);
    const ids = sel.selected.map((r) => r.id);

    // Rule 0: a guard is never dropped, and neither is the recipe it constrains.
    expect(ids).toContain('exam-access-not-difficulty');
    expect(ids).toContain('one-task-per-page');

    const line = sel.resolved.find((x) => x.kept === 'exam-access-not-difficulty');
    expect(line, 'the conflict was resolved silently').toBeDefined();
    expect(line!.because).toMatch(/guarda/);
    expect(line!.because).toContain('one-task-per-page');
  });

  it('a version bump travels with the change, so provenance is not a moving target', () => {
    // `data-recipe: id@version` is what a teacher reads back. Declaring a conflict
    // changes what a recipe does, so both went to 2.
    expect(find('one-task-per-page').version).toBeGreaterThanOrEqual(2);
    expect(find('exam-access-not-difficulty').version).toBeGreaterThanOrEqual(2);
  });

  it('dyslexia and ADHD together now select the recipe that settles them', () => {
    /*
     * `DEC>=2` wants shorter lines, wider spacing and the text broken up; `ATE>=2`
     * wants nothing on the page that is not the task. Before this there was no
     * conflict recipe for the pair, so the contradiction was resolved the same
     * wrong way every week — and it is the commonest pair in a support classroom.
     */
    const p = profile('B07', { DEC: 2, ATE: 2 });
    const ids = selectRecipes(corpus, p, 'es', ['explanation', 'exercise']).selected
      .map((r) => r.id);
    expect(ids).toContain('conflict-decoding-vs-minimal-page');
  });

  it('and not for a learner who has only one of the two', () => {
    for (const axes of [{ DEC: 2 }, { ATE: 2 }] as Array<Record<string, 2>>) {
      const ids = selectRecipes(corpus, profile('B08', axes), 'es', ['exercise']).selected
        .map((r) => r.id);
      expect(ids, 'a conflict recipe fired without a conflict')
        .not.toContain('conflict-decoding-vs-minimal-page');
    }
  });

  it('names no particular support, because that would be one enabled by an axis', () => {
    /*
     * `018`'s rule, and `pictograms-not-automatic.test.ts` caught this file's own
     * first draft breaking it: a recipe that named a support would be that support
     * switched on by an axis, whatever its prose said.
     */
    const body = find('conflict-decoding-vs-minimal-page').body;
    expect(body).not.toMatch(/pictogram/i);
  });
});
