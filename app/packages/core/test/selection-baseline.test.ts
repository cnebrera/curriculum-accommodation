import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { parseRecipe, selectRecipes, type Recipe, type Profile } from '../src/index.js';

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
const PROFILES: Array<{ name: string; profile: Profile }> = [
  { name: 'cognitive load and attention', profile: { code: 'B01', axes: { COG: 3, ATE: 2 } } as Profile },
  { name: 'executive function', profile: { code: 'B02', axes: { EJE: 3, DEC: 2 } } as Profile },
  { name: 'visual access', profile: { code: 'B03', axes: { 'PER-V': 3 } } as Profile },
  { name: 'reading, in Spanish', profile: { code: 'B04', axes: { DEC: 3, LIN: 2 } } as Profile },
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

describe('the case T005 will change most', () => {
  /**
   * `exam-access-not-difficulty` is scoped `[assessment]`. Today it is offered to
   * any profile whose axes match, for **any** document — including a study text
   * with no assessment blocks in it at all.
   *
   * After T005 it should be offered only where the document has assessment
   * blocks. This assertion is here to fail then, loudly, in the commit that makes
   * it true.
   */
  it('an assessment-scoped recipe is currently offered regardless of the document', () => {
    const examOnly = corpus.find((r) => r.id === 'exam-access-not-difficulty');
    expect(examOnly, 'the fixture recipe is gone; update this baseline').toBeDefined();
    expect(examOnly!.scope).toEqual(['assessment']);

    // `selectRecipes` takes no document, which IS the finding: it cannot filter
    // on scope because it has never been given anything to filter against.
    expect(selectRecipes.length, 'selectRecipes still takes (all, profile, lang)').toBe(3);
  });
});
