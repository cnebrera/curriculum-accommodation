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
   * **A finding, not a failure**, and the reason T001 was worth writing.
   *
   * With `scope` honoured, a study text made of `explanation` and `example`
   * blocks selects **zero** recipes for a learner with high cognitive load or
   * weak executive function. Every load recipe in the corpus is scoped to
   * `exercise` or `assessment`.
   *
   * Before the filter, that learner got `one-task-per-page` (which is about
   * exercises and was being applied to prose anyway) and
   * `exam-access-not-difficulty` (which is about exams and was nonsense here).
   * So the coverage was never real — it was two misapplied recipes.
   *
   * The filter is right and the corpus has a hole: nothing reduces load in
   * explanatory prose. Recorded as backlog **G20** rather than papered over by
   * loosening a scope, which would put the misapplication back and hide it again.
   */
  it('a study text selects nothing for a load profile — see backlog G20', () => {
    const studyText = ['explanation', 'example'];
    for (const name of ['cognitive load and attention', 'executive function']) {
      const p = PROFILES.find((x) => x.name === name)!.profile;
      expect(selectRecipes(corpus, p, 'es', studyText).selected,
        `${name}: if this is no longer empty, G20 has been closed — update this test`)
        .toEqual([]);
    }
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
