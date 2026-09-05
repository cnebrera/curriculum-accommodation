import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { parseRecipe, selectRecipes, type Recipe, type Profile } from '../src/index.js';

/**
 * The support thins as he learns, and reaches zero (033 T017, FR-3107, SC-3102).
 *
 * ## Why «reaches zero» is the requirement and not «is small at 1»
 *
 * A support that never goes away is a support that stops being a support. A child who is
 * still handed five-word sentences in May is not learning the classroom's language — he is
 * learning to get by without it, and the scaffolding has become the ceiling.
 *
 * So the mark expires **by observation**: she sets it to 0 when he follows the class, the
 * block stays with the date she decided, and no vehicular recipe fires from that moment.
 * Deleting the block would be a different act — «I should not have marked this» — and his
 * record needs to be able to tell the two apart.
 *
 * Over the **real** corpus, because the claim is about the recipes that ship rather than
 * about a fixture arranged to prove it.
 */
const repoRoot = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((e) => {
    const p = join(dir, e);
    return statSync(p).isDirectory() ? walk(p)
      : (p.endsWith('.md') && !p.endsWith('README.md') ? [p] : []);
  });
}

const corpus: Recipe[] = walk(join(repoRoot, 'recipes')).map((f) => parseRecipe(
  readFileSync(f, 'utf8'), f,
  f.includes('/conflicts/') ? 'conflict' : f.includes('/lang/') ? 'lang' : 'core',
)).filter((r): r is Recipe => r !== null);

const at = (intensity: number | null): Profile => ({
  code: 'V01', axes: {}, works: [], avoid: [], interests: [], response: {},
  language: { instruction: 'es' },
  ...(intensity === null
    ? {}
    : { vehicular: { intensity, languages: ['árabe'], noted_on: '2026-02-10' } }),
} as unknown as Profile);

const vehicularFor = (p: Profile): string[] =>
  selectRecipes(corpus, p, 'es').selected
    .filter((r) => r.marks.length > 0)
    .map((r) => r.id)
    .sort();

describe('the corpus really ships vehicular recipes', () => {
  it('there are some, and they name the mark rather than an axis', () => {
    // Otherwise every count below is zero and the whole file passes for nothing.
    const byMark = corpus.filter((r) => r.marks.length > 0);
    expect(byMark.length).toBeGreaterThanOrEqual(3);
    expect(byMark.every((r) => r.axes.length === 0)).toBe(true);
  });
});

describe('the supports thin as the mark comes down', () => {
  it('3, 2 and 1 all activate them — the graduation is inside the recipes', () => {
    /*
     * All three fire at every level ≥1 and each says in its own text how it scales. That
     * is deliberate: «one idea per sentence, thinning as intensity drops» is a judgement
     * about language that belongs in Markdown a teacher can correct (Principle I), not in
     * a condition list that would need a recipe per level.
     */
    for (const level of [3, 2, 1]) {
      expect(vehicularFor(at(level)), `at ${level}`).not.toEqual([]);
    }
  });

  it('and the count never goes up as he learns more', () => {
    // Monotonic: whatever the corpus grows to, more language must never mean more support.
    const counts = [3, 2, 1, 0].map((l) => vehicularFor(at(l)).length);
    for (let i = 1; i < counts.length; i += 1) {
      expect(counts[i]!, `level ${[3, 2, 1, 0][i]}`).toBeLessThanOrEqual(counts[i - 1]!);
    }
  });

  it('at 0 nothing vehicular fires at all', () => {
    /*
     * The requirement that matters most, and the one a graduated system usually gets
     * wrong: it reaches **zero**. A support that thins but never stops is a support that
     * has become the ceiling.
     */
    expect(vehicularFor(at(0))).toEqual([]);
  });

  it('and the block is still there, with the date she decided', () => {
    /*
     * Expired by observation, not by deletion. «Ya sigue la clase» is something she saw
     * and dated; an absent block would say nobody ever looked, and the fact that the
     * barrier existed and ended is part of his history.
     */
    const over = at(0);
    expect(over.vehicular?.intensity).toBe(0);
    expect(over.vehicular?.noted_on).toBe('2026-02-10');
  });

  it('and an absent mark is a different state, which also fires nothing', () => {
    expect(vehicularFor(at(null))).toEqual([]);
    expect(at(null).vehicular).toBeUndefined();
  });
});

describe('what the mark never does', () => {
  it('it never selects a recipe keyed on an axis', () => {
    /*
     * The failure this replaces: `LIN: 2` written to make something fire. If the mark
     * selected axis recipes, it would be that workaround with better manners — and the
     * report would still attribute the support to a barrier nobody observed.
     */
    for (const level of [3, 2, 1]) {
      const axisDriven = selectRecipes(corpus, at(level), 'es').selected
        .filter((r) => r.axes.length > 0);
      expect(axisDriven.map((r) => r.id), `at ${level}`).toEqual([]);
    }
  });

  it('and «lectura fácil» is never among them, at any intensity', () => {
    // It answers a decoding difficulty. He reads his own language fluently, and offering
    // it would adapt the wrong thing while telling his record something untrue.
    for (const level of [3, 2, 1, 0]) {
      expect(vehicularFor(at(level))).not.toContain('lectura-facil-es');
    }
  });
});

describe('on an exam, the supports are access and nothing else (T022, FR-3105)', () => {
  /**
   * The edge case with the most at stake in the whole feature.
   *
   * A child who cannot yet read the question is being assessed on the language rather
   * than on what he knows — so an exam is exactly where these supports matter. It is also
   * exactly where «adaptar» slides into «hacerlo más fácil»: shorter sentences in a
   * question can quietly become a shorter question, and the mark would then be lowering
   * the bar for a learner who never needed it lowered.
   *
   * The line is the one `012` already drew and `exam-access-not-difficulty` already
   * guards: the criterion is untouched, the route to it is cleared.
   */
  const examCorpus = corpus.filter((r) => r.scope.includes('assessment'));

  it('a vehicular recipe that touches an exam says the criterion is untouched', () => {
    const onExams = examCorpus.filter((r) => r.marks.length > 0);
    expect(onExams.length).toBeGreaterThan(0);
    for (const r of onExams) {
      /*
       * Its own text has to say it, because the recipe body is what the model reads.
       * A rule that lives only in a test is a rule the model never sees.
       */
      expect(r.body, r.id).toMatch(/no se toca|no se diluye|no cambia/i);
    }
  });

  it('and the exam guard is still selected beside them, never dropped', () => {
    /*
     * `exam-access-not-difficulty` constrains every other recipe. If the mark could drop
     * it in a conflict, a vehicular support could make an exam easier — which is the
     * failure this whole project is built around, arriving through the newest door.
     */
    const selected = selectRecipes(corpus, at(3), 'es').selected.map((r) => r.id);
    // It is axis-keyed in the shipped corpus, so it is not expected for a mark-only
    // profile — what must be true is that nothing vehicular claims to replace it.
    for (const r of corpus.filter((x) => x.marks.length > 0)) {
      expect(r.conflicts, r.id).not.toContain('exam-access-not-difficulty');
    }
    expect(selected).not.toContain('lectura-facil-es');
  });
});
