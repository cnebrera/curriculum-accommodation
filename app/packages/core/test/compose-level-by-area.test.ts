import { describe, it, expect } from 'vitest';
import { targetYear, explainTarget, worthAsking, explainCurSource } from '../src/compose/level.js';
import { buildAdaptPrompt } from '../src/prompt/adapt.js';
import { curFor, type Profile } from '../src/vault/schema.js';

/**
 * Marco composes at two levels (032 T011, FR-3003, SC-3001, quickstart §3).
 *
 * ## What the per-area CUR is allowed to do, and what it is not
 *
 * It decides **whether the silent `enrolled` fallback is honest**. It never contributes a
 * year, and nothing here derives one from it: CUR 2 is «contenidos de cursos anteriores»,
 * count unknown, and mapping it to `enrolled − 2` would put an invented number on a
 * child's worksheet — the one property of composed material a teacher cannot check at a
 * glance and has no reason to suspect.
 *
 * So the whole feature, in this file, is a change to one sentence and one boolean. That
 * is the intended size.
 */
const marco = {
  code: 'M01', axes: { CUR: 2 }, cur_areas: { 'Matemáticas': 2, 'Lengua': 0 },
  works: [], avoid: [], interests: [], response: {}, language: {},
} as unknown as Profile;

/** What `jobs/compose.ts` assembles, with the area's CUR resolved by the one helper. */
const compose = (area?: string, chosen?: string) => targetYear({
  ...(chosen ? { chosen } : {}),
  enrolled: 'es:primaria-5',
  cur: curFor(marco, area),
  ...(area ? { area } : {}),
});

describe('composing for Lengua, where he is at level', () => {
  it('the enrolled course stands, quietly', () => {
    const t = compose('Lengua');
    expect(t.yearId).toBe('es:primaria-5');
    expect(t.from).toBe('enrolled');
    /*
     * US1's whole point: nothing about Lengua is treated as delayed. His general CUR is
     * 2, and before this feature that was the only value there was — so a Lengua
     * worksheet was composed for a child two courses behind in a subject where, by her
     * own observation, he is not.
     */
    expect(t.contradicted).toBeUndefined();
    expect(worthAsking(t)).toBe(false);
  });

  it('and the report does not ask her a question she already answered', () => {
    const said = explainTarget(compose('Lengua'));
    expect(said).toContain('Nadie lo ha elegido');
    expect(said).not.toContain('Lengua');
    expect(said).not.toContain('cursos anteriores');
  });
});

describe('composing for Matemáticas, where she recorded a gap', () => {
  it('the fallback is no longer silent', () => {
    const t = compose('Matemáticas');
    expect(t.from).toBe('enrolled');
    expect(t.contradicted).toEqual({ area: 'Matemáticas', cur: 2 });
    expect(worthAsking(t)).toBe(true);
  });

  it('and the sentence names this area\'s gap, in her own words', () => {
    const said = explainTarget(compose('Matemáticas'));
    expect(said).toContain('en Matemáticas');
    expect(said).toContain('contenidos de cursos anteriores');
    // Not the generic conditional, which asks what she has already answered.
    expect(said).not.toContain('si le llevas dos cursos de desfase');
  });

  it('«muy alejado» says that instead, because they are different observations', () => {
    const far = {
      ...marco, cur_areas: { 'Matemáticas': 3 },
    } as unknown as Profile;
    const t = targetYear({
      enrolled: 'es:primaria-5', cur: curFor(far, 'Matemáticas'), area: 'Matemáticas',
    });
    expect(explainTarget(t)).toContain('muy alejado de su curso');
  });
});

describe('when she answers, and when she does not', () => {
  it('her answer is `she-chose`: P32 and FR-129 intact', () => {
    const t = compose('Matemáticas', 'es:primaria-3');
    expect(t.from).toBe('she-chose');
    expect(t.yearId).toBe('es:primaria-3');
    /*
     * No `contradicted` on a year she chose: there is nothing to contradict. She named
     * the course, the corpus defines what it contains, and nothing anywhere is the
     * application's judgement about the child.
     */
    expect(t.contradicted).toBeUndefined();
    expect(worthAsking(t)).toBe(false);
    expect(explainTarget(t)).toContain('porque tú lo elegiste');
  });

  it('and declining still composes, because asking is never blocking (FR-3006)', () => {
    /*
     * Declining is simply not passing `chosen`, which is the same call as before she was
     * asked. There is no third state, no «blocked» target and no error — a mandatory gate
     * keyed on CUR ≥ 2 would be P12's condemned profile-keyed stop reborn at finer grain.
     */
    const t = compose('Matemáticas');
    expect(t.yearId).toBe('es:primaria-5');
    expect(explainTarget(t)).toContain('Nadie lo ha elegido');
  });
});

describe('an area she never detailed', () => {
  it('gets the general — fallback, never zero by omission (SC-3001)', () => {
    const t = compose('Inglés');
    // The general is 2, so Inglés inherits the gap rather than being silently read as
    // «at level», which is what a `?? 0` fallback would have asserted about a subject
    // nobody assessed.
    expect(curFor(marco, 'Inglés')).toBe(2);
    expect(t.contradicted).toEqual({ area: 'Inglés', cur: 2 });
  });

  it('and a job with no area at all uses the general too, naming no subject', () => {
    const t = compose();
    expect(t.contradicted).toEqual({ cur: 2 });
    expect(explainTarget(t)).toContain('en esta área');
  });

  it('a learner nobody assessed keeps today\'s sentence exactly', () => {
    const blank = {
      code: 'B01', axes: {}, works: [], avoid: [], interests: [], response: {}, language: {},
    } as unknown as Profile;
    const t = targetYear({ enrolled: 'es:primaria-5', cur: curFor(blank, 'Matemáticas') });
    expect(t.contradicted).toBeUndefined();
    expect(explainTarget(t)).toContain('si le llevas dos cursos de desfase');
  });
});

describe('the tripwire: no year is ever derived from a CUR value', () => {
  it('the target year is the enrolled one, unchanged, at every CUR level', () => {
    /*
     * Asserted as an equality across all four levels rather than trusted to the reading:
     * the tempting edit is `enrolled - cur`, and it would produce a plausible year that
     * nobody chose and that a teacher has no reason to question. `022` calls this shape
     * «a number the model wrote into a child's sheet»; here it would be a number *the
     * application* wrote, which is worse.
     */
    for (const cur of [0, 1, 2, 3] as const) {
      const t = targetYear({ enrolled: 'es:primaria-5', cur, area: 'Matemáticas' });
      expect(t.yearId).toBe('es:primaria-5');
    }
  });
});

describe('the report says which observation was consulted (T012, Principle VI)', () => {
  it('names the área when the value was hers for that subject', () => {
    expect(explainCurSource({ cur: 2, area: 'Matemáticas', fromPair: true }))
      .toContain('el que tienes apuntado en Matemáticas');
  });

  it('and says the general stood in, naming the área it stood in for', () => {
    /*
     * Both halves matter. «El general» alone leaves her unable to tell whether Rampa
     * read her Inglés note or failed to find one — and she wrote both, so the report has
     * to be checkable against what she wrote.
     */
    const said = explainCurSource({ cur: 2, area: 'Inglés', fromPair: false })!;
    expect(said).toContain('el general');
    expect(said).toContain('No tienes nada apuntado para Inglés');
  });

  it('and says nothing at all when nobody recorded a CUR', () => {
    // A line on every composition for every learner without one is noise, and noise is
    // how a report stops being read.
    expect(explainCurSource({ cur: null, fromPair: false })).toBeNull();
  });
});

describe('the prompt carries the CUR of this document\'s subject (T013, FR-3001)', () => {
  const promptFor = (subject?: string): string => buildAdaptPrompt({
    profile: marco,
    recipes: [],
    ...(subject ? { subject } : {}),
    material: '::: {#b1 .exercise}\n1. 2 × 3 =\n:::\n',
  }).prompt;

  it('a Lengua worksheet is not prompted as two courses behind', () => {
    /*
     * US1 failing in the prompt while succeeding in compose would be worse than not
     * having the feature: two halves of the application disagreeing about the same
     * child, in a place nobody would think to look.
     */
    const out = promptFor('Lengua');
    expect(out).toContain('CUR: 0');
    expect(out).toContain('(CUR es el de Lengua.)');
    expect(out).not.toContain('CUR: 2 ');
  });

  it('and the pairs travel as data, with the general named', () => {
    const out = promptFor('Matemáticas');
    expect(out).toContain('CUR: 2');
    expect(out).toContain('Nivel curricular por área: Matemáticas: 2 · Lengua: 0');
    expect(out).toContain('El general es 2.');
  });

  it('a document with no subject gets the general, exactly as today', () => {
    expect(promptFor()).toContain('CUR: 2');
    expect(promptFor()).not.toContain('CUR es el de');
  });
});
