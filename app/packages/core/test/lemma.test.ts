import { describe, it, expect } from 'vitest';
import { lemmaCandidates, NEVER_A_PICTOGRAM } from '../src/index.js';

/**
 * The smallest deterministic Spanish morphology that is safe (AGE-05, decision P20).
 *
 * ## What it is for
 *
 * `matchWord` did an exact orthographic lookup, and the cost was not low coverage
 * but **inconsistent** coverage: «rana» matched and «ranas» did not, so the same word
 * carried a drawing in one sentence and not in the next. For a learner who reads by
 * pictogram that is worse than a consistent absence, because the absence reads as a
 * difference in meaning.
 *
 * The `instructions` scope was the worst served of the three — the one that exists so
 * he can understand *what is being asked*. An instruction is an imperative
 * («rodea», «une», «escribe») and a catalogue's keywords are infinitives.
 *
 * ## What the tests are really checking
 *
 * Not accuracy. A candidate that matches nothing costs nothing, because the caller
 * tries the literal form first and keeps «exactly one, or nothing». What matters is
 * that it **never produces a plausible wrong word** for the classes where that would
 * put a picture on the page: `para` → `parar` is the case, and the closed-class list
 * is the answer.
 */
describe('plurals', () => {
  it('finds the singular of the ordinary cases', () => {
    expect(lemmaCandidates('ranas')).toContain('rana');
    expect(lemmaCandidates('papeles')).toContain('papel');
    expect(lemmaCandidates('lapices')).toContain('lapiz');
  });

  it('offers the more specific rule first, so the wrong one cannot win', () => {
    // `-ces` is also an `-es`, and «lapice» is not a word.
    expect(lemmaCandidates('lapices')[0]).toBe('lapiz');
  });

  it('never returns the word it was given', () => {
    // The caller has already tried it; returning it would be a wasted lookup and a
    // confusing provenance.
    for (const w of ['ranas', 'papeles', 'rodea', 'lavar']) {
      expect(lemmaCandidates(w)).not.toContain(w);
    }
  });
});

describe('verbs, and only the forms a worksheet uses', () => {
  it('turns an instruction into its infinitive', () => {
    // The whole point of the `instructions` scope: «rodea» is what the sheet says.
    expect(lemmaCandidates('rodea')).toContain('rodear');
    expect(lemmaCandidates('salta')).toContain('saltar');
  });

  it('offers both conjugations where the ending is ambiguous', () => {
    // `-e` is `-er` or `-ir`, and the set decides which exists.
    expect(lemmaCandidates('come')).toContain('comer');
    expect(lemmaCandidates('escribe')).toContain('escribir');
  });

  it('offers the reflexive form, which is how a catalogue lists a self-directed act', () => {
    expect(lemmaCandidates('lavar')).toContain('lavarse');
  });
});

describe('what it refuses, which is the part that matters', () => {
  it('refuses a closed-class word outright', () => {
    /*
     * «Para» stems to «parar». A stop sign on the preposition *para* is the
     * wrong-pictogram failure this project is built around — a picture the child
     * reads and the teacher does not check — so the class that could produce it is
     * refused rather than relied on to match nothing.
     */
    for (const w of ['para', 'como', 'sobre', 'entre', 'esta', 'cada']) {
      expect(lemmaCandidates(w), w).toEqual([]);
    }
  });

  it('refuses anything too short for the rules to mean anything', () => {
    for (const w of ['sol', 'pan', 'ir', 've']) expect(lemmaCandidates(w), w).toEqual([]);
  });

  it('refuses a multi-word key, which it does not attempt', () => {
    // «lavarse las manos» is indexed and unreachable for a different reason — the
    // tokeniser hands over one word at a time. Recorded as BACKLOG G44.
    expect(lemmaCandidates('lavarse las manos')).toEqual([]);
  });

  it('never offers a candidate shorter than three letters', () => {
    // «sal» → «sa» is noise that could collide with a real short keyword.
    for (const w of ['sales', 'oyes', 'aves']) {
      for (const c of lemmaCandidates(w)) expect(c.length, `${w} → ${c}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('is a finite list of closed classes, not a growing stop-list', () => {
    /*
     * Articles, prepositions, conjunctions, pronouns. It cannot grow with use,
     * which is what makes it code rather than something a teacher has to maintain —
     * and it is mechanics, not a judgement about a child.
     */
    expect(NEVER_A_PICTOGRAM.has('de')).toBe(true);
    expect(NEVER_A_PICTOGRAM.has('casa')).toBe(false);
    expect(NEVER_A_PICTOGRAM.has('rodear')).toBe(false);
  });
});

describe('determinism', () => {
  it('gives the same answer every time, in the same order', () => {
    // No dictionary, no randomness, no I/O: the same reason `planDownscale` is
    // arithmetic. The order is the priority, so it has to be stable.
    for (const w of ['ranas', 'rodea', 'lapices', 'come']) {
      expect(lemmaCandidates(w)).toEqual(lemmaCandidates(w));
    }
  });
});
