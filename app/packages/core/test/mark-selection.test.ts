import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import {
  parseRecipe, parseMarkCondition, selectRecipes, applies, isGuard, buildAdaptPrompt,
  type Recipe, type Profile,
} from '../src/index.js';

/**
 * A mark selects, and the axes' rules hold (033 T002, FR-3104, SC-3101, quickstart §2).
 *
 * ## The case this closes
 *
 * A learner arrives in March without the classroom's language. He has no observed axis —
 * nobody has assessed his attention or his working memory, and there is nothing wrong
 * with either. Before this, `selectRecipes` returned **nothing** for him: the profile that
 * selects no recipe at all is the profile of the child this feature exists for, and what
 * she got was an adaptation that adapted nothing.
 *
 * That is P1's «a profile that selects nothing» stop, in its sharpest instance. The mark
 * closes it without inventing an axis value for him — because inventing one would write a
 * barrier into a record that follows him, and what he has is a transition.
 *
 * ## And the rules that must not bend
 *
 * Absent is not zero. Zero is her statement that it is over, not an absence of one. And a
 * recipe keyed only on the mark is an **adaptation**: classing it as a guard would make it
 * reach every learner in her caseload, including the ones who speak the language.
 */
const recipe = (front: string, id: string): Recipe => {
  const parsed = parseRecipe(`---\n${front}\n---\n\nCuerpo.\n`, `${id}.md`, 'core');
  if (!parsed) throw new Error(`the fixture ${id} did not parse`);
  return parsed;
};

const VEHICULAR = recipe(
  'id: apoyo-lengua-vehicular\nversion: 1\naxes: []\nmarks: [vehicular>=1]\n'
  + 'scope: [instruction, exercise]\nconflicts: []', 'apoyo-lengua-vehicular');

const ATTENTION = recipe(
  'id: how-much-at-once\nversion: 1\naxes: [ATE>=2]\nscope: [instruction, exercise]\n'
  + 'conflicts: []', 'how-much-at-once');

const GUARD = recipe(
  'id: keep-curricular-terms\nversion: 1\naxes: []\nscope: [instruction]\nconflicts: []',
  'keep-curricular-terms');

const READING = recipe(
  'id: lectura-facil-es\nversion: 1\naxes: [DEC>=2]\nscope: [instruction, exercise]\n'
  + 'conflicts: []', 'lectura-facil-es');

const CORPUS = [VEHICULAR, ATTENTION, GUARD, READING];

const profile = (over: Partial<Profile> = {}): Profile => ({
  code: 'V01', axes: {}, works: [], avoid: [], interests: [],
  response: {}, language: { instruction: 'es' },
  ...over,
} as Profile);

const selected = (p: Profile): string[] =>
  selectRecipes(CORPUS, p, 'es').selected.map((r) => r.id).sort();

describe('the condition grammar', () => {
  it('reads `vehicular>=1` and rejects a mark it does not know', () => {
    expect(parseMarkCondition('vehicular>=1')).toEqual({ mark: 'vehicular', op: '>=', level: 1 });
    /*
     * Rejected rather than ignored. A recipe keyed on a condition the parser cannot read
     * is a recipe that is silently never selected — this repository's most repeated
     * defect, and the one the whole `marks:` grammar could have reintroduced.
     */
    expect(parseMarkCondition('inventado>=1')).toBeNull();
    expect(parseMarkCondition('vehicular>=9')).toBeNull();
    expect(parseMarkCondition('vehicular')).toBeNull();
  });

  it('and the fixture recipe really carries the condition', () => {
    // Otherwise every case below would be asserting on a recipe with no conditions,
    // which is a guard, and they would all pass for the wrong reason.
    expect(VEHICULAR.marks).toEqual([{ mark: 'vehicular', op: '>=', level: 1 }]);
    expect(VEHICULAR.axes).toEqual([]);
  });
});

describe('a learner with the mark and no observed axis', () => {
  const marco = profile({
    vehicular: { intensity: 2, languages: ['ar'], noted_on: '2026-03-04' },
  } as Partial<Profile>);

  it('selects the vehicular recipe — the profile no longer selects nothing (SC-3101)', () => {
    expect(selected(marco)).toContain('apoyo-lengua-vehicular');
    expect(selectRecipes(CORPUS, marco, 'es').selected.length).toBeGreaterThan(0);
  });

  it('and not the reading recipe, which is about decoding and not about him', () => {
    /*
     * `lectura-facil-es` is keyed on `DEC>=2` — a decoding difficulty. A child who reads
     * his own language fluently and is three weeks into this one has no decoding
     * difficulty, and offering him «lectura fácil» would be adapting the wrong thing
     * while telling his record something untrue.
     */
    expect(selected(marco)).not.toContain('lectura-facil-es');
  });

  it('and the mark composes with a real axis when she observed one', () => {
    const both = profile({
      axes: { ATE: 2 },
      vehicular: { intensity: 2, languages: ['ar'], noted_on: '2026-03-04' },
    } as Partial<Profile>);
    expect(selected(both)).toContain('apoyo-lengua-vehicular');
    expect(selected(both)).toContain('how-much-at-once');
  });
});

describe('absent, and zero, and the difference between them', () => {
  it('an absent block activates nothing — not observed is never 0', () => {
    expect(selected(profile())).not.toContain('apoyo-lengua-vehicular');
    expect(applies(VEHICULAR, profile())).toBe(false);
  });

  it('intensity 0 activates nothing either, and for a different reason', () => {
    /*
     * «Ya sigue la clase en su idioma»: her statement that the barrier is over, kept with
     * the date she made it. It fails `>=1` — which is the right outcome — but it is not
     * an absence, and the block stays so the record says when she decided.
     */
    const over = profile({
      vehicular: { intensity: 0, languages: ['ar'], noted_on: '2026-06-10' },
    } as Partial<Profile>);
    expect(selected(over)).not.toContain('apoyo-lengua-vehicular');
    expect(over.vehicular?.noted_on).toBe('2026-06-10');
    expect(over.vehicular?.intensity).toBe(0);
  });

  it('and a `<=0` condition can still find it, which is what makes them different', () => {
    /*
     * The assertion that proves the two states are distinguishable rather than merely
     * both inactive. Nothing in the corpus keys on `vehicular<=0` today — but if absent
     * and 0 were the same value, no future recipe could tell «she says it is over» from
     * «nobody looked».
     */
    const over = profile({
      vehicular: { intensity: 0, languages: [], noted_on: '2026-06-10' },
    } as Partial<Profile>);
    const expired = recipe(
      'id: probe\nversion: 1\naxes: []\nmarks: [vehicular<=0]\nscope: []\nconflicts: []', 'probe');
    expect(applies(expired, over)).toBe(true);
    expect(applies(expired, profile())).toBe(false);
  });
});

describe('a mark-only recipe is an adaptation, not a guard', () => {
  it('`isGuard` says so', () => {
    /*
     * A guard constrains every other recipe and is never dropped in a conflict. A
     * vehicular recipe classed as one would apply to **every** learner in her caseload —
     * including the ones who speak the classroom's language — and could never lose to
     * the exam guard. Both wrong, and both invisible until a sheet came out strange.
     */
    expect(isGuard(VEHICULAR)).toBe(false);
    expect(isGuard(GUARD)).toBe(true);
    expect(isGuard(ATTENTION)).toBe(false);
  });

  it('and the guard still reaches a learner with nothing recorded at all', () => {
    // The other half: widening `isGuard` must not have stopped guards being guards.
    expect(selected(profile())).toContain('keep-curricular-terms');
  });
});

describe('the mark reaches the model as what it is (T011, FR-3101/3106)', () => {
  const promptFor = (vehicular?: { intensity: number; languages: string[] },
                     glosses?: Array<{ word: string; gloss: string; language: string }>) =>
    buildAdaptPrompt({
      profile: profile(),
      recipes: [],
      ...(vehicular ? { vehicular } : {}),
      ...(glosses ? { glosses } : {}),
      material: '::: {#b1 .exercise}\n1. 2 × 3 =\n:::\n',
    }).prompt;

  it('its own section, saying it is not a language difficulty', () => {
    /*
     * The sentence that keeps `LIN` and this apart where it matters most — in the text a
     * model reads before it decides what to simplify. Without it, «nivel 2» beside nine
     * axis levels reads as a tenth axis, and the model adapts for a disorder.
     */
    const out = promptFor({ intensity: 2, languages: ['ar'] });
    expect(out).toContain('Lengua vehicular en adquisición');
    expect(out).toContain('No es una dificultad de lenguaje');
    expect(out).toContain('No le quites contenido');
  });

  it('and the languages are hers, named', () => {
    expect(promptFor({ intensity: 2, languages: ['ar', 'fr'] })).toContain('ar, fr');
  });

  it('intensity 0 sends nothing — her statement that it is over', () => {
    expect(promptFor({ intensity: 0, languages: ['ar'] }))
      .not.toContain('Lengua vehicular');
  });

  it('and an absent mark sends nothing either', () => {
    expect(promptFor()).not.toContain('Lengua vehicular');
  });

  it('glosses arrive as a finished list, with an instruction to add none', () => {
    /*
     * The model is never asked to translate. It is handed equivalences the code resolved
     * from published metadata and told to use those and no others — a rule it can follow.
     * «Traduce esto» is not a rule; it is a request for invention.
     */
    const out = promptFor({ intensity: 2, languages: ['ar'] },
      [{ word: 'denominador', gloss: 'مقام', language: 'ar' }]);
    expect(out).toContain('Vocabulario puente ya resuelto');
    expect(out).toContain('denominador → مقام');
    expect(out).toContain('no traduzcas nada por tu cuenta');
  });

  it('and no glosses means no section at all — an empty heading invites filling it', () => {
    /*
     * The no-fields-no-section rule, and here it earns its keep twice: an empty
     * «vocabulario puente» heading is an invitation, and what would fill it is exactly the
     * invented word in an unreadable script that this whole feature exists to prevent.
     */
    const out = promptFor({ intensity: 3, languages: ['ar'] });
    expect(out).toContain('Lengua vehicular en adquisición');
    expect(out).not.toContain('Vocabulario puente');
  });

  it('and an empty list is the same as none — which is the case a caller produces', () => {
    /*
     * The distinction mutation found. «No glosses» reaches this function two ways: the
     * caller passed nothing, or the caller ran the bridge and it resolved nothing —
     * because the set had no such language, or every word was ambiguous. The second is
     * the common one, and it is the one that would print an empty heading.
     */
    const out = promptFor({ intensity: 3, languages: ['ar'] }, []);
    expect(out).not.toContain('Vocabulario puente');
  });
});

describe('translating the whole sheet is refused, with the reason (T019/T020, FR-3109)', () => {
  const repo = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');
  const rules = readFileSync(join(repo, 'instructions', 'hard-rules.md'), 'utf8');

  it('the refusal is in the file sent with every request', () => {
    /*
     * In `hard-rules.md` and not in the three recipes, because the recipes only reach a
     * learner who has the mark — and «traduce la hoja entera» can be asked about any
     * learner. A rule that only travels with the recipes is a rule that is absent exactly
     * when somebody asks the question for the first time.
     */
    expect(rules).toContain('traducir la hoja entera se rechaza');
    expect(rules).toMatch(/dilo y explica por qué/);
  });

  it('and it carries both reasons, because a refusal without one is a wall', () => {
    /*
     * The two arguments are the ones a teacher can weigh and disagree with, which is what
     * makes this a position rather than a restriction:
     *
     * — nobody in the room can check a long translation, and the sheet has her name on it;
     * — a sheet in his own language lets him pass the year without the classroom's, and in
     *   September he is where he was with one year less ahead of him.
     */
    expect(rules).toContain('Nadie puede comprobarlo');
    expect(rules).toContain('Sustituir no es andamiar');
  });

  it('and it says what to do instead, so the answer is not only «no»', () => {
    expect(rules).toMatch(/Lo que sí puedes hacer/);
    expect(rules).toContain('ya resueltas');
  });

  it('and the recipe cites the rule rather than restating it', () => {
    /*
     * Two copies of one rule is how this repository has produced defects before: they
     * drift, and the one nobody edited is the one that keeps being sent. The recipe makes
     * the same argument in its own words for its own scope — key vocabulary, not whole
     * sheets — and the hard rule is where the refusal itself lives.
     */
    const recipeText = readFileSync(
      join(repo, 'recipes', 'core', 'vocabulario-clave-con-puente.md'), 'utf8');
    expect(recipeText).toContain('No es traducir la hoja');
    // …and it does not try to be the rule: no imperative refusal of its own.
    expect(recipeText).not.toContain('se rechaza');
  });
});
