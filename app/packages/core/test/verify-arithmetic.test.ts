import { describe, it, expect } from 'vitest';
import { arithmetic, verify, type Skill } from '../src/index.js';

/**
 * The arithmetic verifier (002 T004, FR-123/124).
 *
 * The case the whole feature turns on is in «rejects, never repairs»: a
 * model-proposed exercise with a wrong stated answer is **thrown away**, not
 * corrected. A model that got the arithmetic wrong got something else wrong too,
 * and fixing the visible half hides the rest.
 *
 * The second-most-important group is «carrying is a constraint». `4 × 2` is
 * multiplication and does not exercise carrying — and a model asked to make
 * something easier reaches for the numbers first, because that is what "easier"
 * means everywhere else. If that rejection does not work, «multiplicar con
 * llevadas» silently becomes «multiplicar», handed to the child who most needed
 * the original.
 */
const skill = (id: string, constraints: string[] = [], level?: Skill['level']): Skill =>
  ({ id, constraints, ...(level ? { level } : {}) });

const check = (s: Skill, expression: string, statedAnswer?: string) =>
  verify(arithmetic, s, { expression, ...(statedAnswer !== undefined ? { statedAnswer } : {}) });

describe('it computes the answer itself', () => {
  it.each([
    ['47 × 8', '376'],
    ['376 + 128', '504'],
    ['1000 - 1', '999'],
    ['144 ÷ 12', '12'],
    ['12 * 12', '144'],
    ['100 / 4', '25'],
    ['7:1', '7'],
  ])('%s = %s', (expr, answer) => {
    expect(arithmetic.solve({ expression: expr })).toBe(answer);
  });

  /**
   * Exact, on scaled integers. `0.1 + 0.2` is `0.30000000000000004` in floating
   * point, and a verifier that rejected a model's correct `0.3` would reject every
   * correct exercise — exhausting the retry budget and telling her nothing could
   * be generated.
   */
  it('does decimals exactly, not in floating point', () => {
    expect(arithmetic.solve({ expression: '0,1 + 0,2' })).toBe('0.3');
    expect(arithmetic.solve({ expression: '1.5 × 3' })).toBe('4.5');
    expect(arithmetic.solve({ expression: '2.50 - 0.25' })).toBe('2.25');
  });

  it('says unknown rather than guessing', () => {
    // A division that does not terminate. A rounded key marks a correct answer
    // wrong, which is the specific harm this branch exists to avoid.
    expect(arithmetic.solve({ expression: '10 ÷ 3' })).toBe('unknown');
    expect(arithmetic.solve({ expression: '5 ÷ 0' })).toBe('unknown');
    expect(arithmetic.solve({ expression: 'la mitad de doce' })).toBe('unknown');
    expect(arithmetic.solve({ expression: '2 + 3 + 4' })).toBe('unknown');
  });
});

describe('rejects, never repairs', () => {
  /** **The case the whole feature turns on.** */
  it('throws away an exercise whose stated answer is wrong', () => {
    const v = check(skill('arith.multiply'), '47 × 8', '368');

    expect(v.ok).toBe(false);
    if (!v.ok && v.reason === 'wrong-answer') {
      // The right answer is reported for the log, and the exercise is still gone.
      expect(v.answer).toBe('376');
      expect(v.because).toContain('376');
    } else {
      throw new Error(`expected wrong-answer, got ${!v.ok ? v.reason : 'ok'}`);
    }
  });

  it('accepts the same exercise with the right answer', () => {
    expect(check(skill('arith.multiply'), '47 × 8', '376').ok).toBe(true);
  });

  it('compares answers as values, so 8.0 and 8 are the same answer', () => {
    // A checker strict about formatting rejects correct work, which is how a
    // verifier becomes the reason nothing can be generated.
    expect(check(skill('arith.divide'), '16 ÷ 2', '8.0').ok).toBe(true);
    expect(check(skill('arith.add'), '1,5 + 1,5', '3').ok).toBe(true);
  });

  it('accepts an exercise with no stated answer at all', () => {
    // Nothing to disagree with. The key is ours either way.
    const v = check(skill('arith.multiply'), '47 × 8');
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.answer).toBe('376');
  });
});

describe('carrying is a constraint, not a topic', () => {
  const carrying = skill('arith.multiply', ['carries']);

  it('accepts 47 × 8, which carries', () => {
    expect(check(carrying, '47 × 8', '376').ok).toBe(true);
  });

  /**
   * The rejection that keeps «multiplicar con llevadas» meaning something.
   * `21 × 3 = 63`: arithmetically perfect, and it exercises nothing she asked for.
   */
  it.each(['21 × 3', '4 × 2', '11 × 5'])('rejects %s, which does not carry', (expr) => {
    const v = check(carrying, expr);
    expect(v.ok).toBe(false);
    if (!v.ok) {
      expect(v.reason).toBe('does-not-exercise');
      expect(v.because).toContain('llevadas');
    }
  });

  it('checks addition carrying column by column, not by the size of the result', () => {
    const adding = skill('arith.add', ['carries']);
    // 25 + 25 = 50: the units column carries. A "result over ten" rule would
    // also accept 5 + 4 = 9 → no, but would accept 10 + 5 = 15, which does not
    // carry at all.
    expect(check(adding, '25 + 25').ok).toBe(true);
    expect(check(adding, '10 + 5').ok).toBe(false);
    expect(check(adding, '23 + 45').ok).toBe(false);
  });

  it('says unknown for carrying in a subtraction, rather than pretending', () => {
    // Carrying is not a property of subtraction; borrowing is. Answering `false`
    // would report «no practica llevadas» about an exercise where the concept
    // does not apply.
    const v = check(skill('arith.subtract', ['carries']), '50 - 20');
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('unknown');
  });
});

describe('borrowing, which is the other half of what she says', () => {
  const borrowing = skill('arith.subtract', ['borrows']);

  it('accepts 52 - 27, which borrows', () => {
    expect(check(borrowing, '52 - 27', '25').ok).toBe(true);
  });

  it('rejects 57 - 22, which does not', () => {
    expect(check(borrowing, '57 - 22').ok).toBe(false);
  });

  it('does not treat a negative result as borrowing', () => {
    // 20 - 50 is a different lesson, and calling it "borrowing" would put it on a
    // sheet about borrowing.
    expect(check(borrowing, '20 - 50').ok).toBe(false);
  });
});

describe('the level comes from the corpus, never from a model', () => {
  it('rejects an exercise with more digits than the year allows', () => {
    const s = skill('arith.multiply', [], { maxDigits: 2 });
    expect(check(s, '12 × 4').ok).toBe(true);
    const v = check(s, '1234 × 4');
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('does-not-exercise');
  });

  it('rejects decimals where the year has none', () => {
    const s = skill('arith.add', [], { decimals: false });
    expect(check(s, '1.5 + 2').ok).toBe(false);
    expect(check(s, '15 + 2').ok).toBe(true);
  });

  it('requires decimals when that is the point', () => {
    const s = skill('arith.add', ['decimals']);
    expect(check(s, '1.5 + 2.25').ok).toBe(true);
    expect(check(s, '15 + 2').ok).toBe(false);
  });
});

describe('the operation has to be the one she asked for', () => {
  it('rejects a multiplication offered for an addition skill', () => {
    expect(check(skill('arith.add'), '4 × 2').ok).toBe(false);
  });

  it('accepts an exact division when that is the constraint', () => {
    const s = skill('arith.divide', ['exact']);
    expect(check(s, '144 ÷ 12', '12').ok).toBe(true);
  });

  it('rejects a division with a remainder when exactness was asked for', () => {
    // `7 ÷ 2` is a different lesson. Note it reads as `unknown` on the answer
    // first, because we refuse to round — either way it does not ship.
    expect(check(skill('arith.divide', ['exact']), '7 ÷ 2').ok).toBe(false);
  });
});

describe('what it refuses to decide', () => {
  it('a constraint it does not know is unknown, never approved', () => {
    /*
     * The `default:` case, and it matters more than it looks. Returning `true`
     * would silently approve an exercise against a constraint nobody checked —
     * which is exactly the failure this branch exists to prevent, arriving
     * through a fall-through.
     */
    const v = check(skill('arith.multiply', ['algo-que-no-conozco']), '47 × 8');
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('unknown');
  });

  it('a malformed expression is unknown, not rejected', () => {
    // "Rejected" would tell the compose loop to try again with a different
    // exercise; "unknown" tells it this cannot be checked at all, which is the
    // truth and reaches a different branch.
    const v = check(skill('arith.add'), 'dos más dos');
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('unknown');
  });

  it('only handles skills it claims', () => {
    expect(arithmetic.handles('arith.multiply')).toBe(true);
    expect(arithmetic.handles('lengua.ortografia')).toBe(false);
  });

  /**
   * Found by `verifier-inventory.test.ts` on its first run, and it was a real
   * defect. `handles` was `startsWith('arith.')`, so `arith.percent` was claimed —
   * and `exercises()` has no entry for it, so every proposal came back `unknown`.
   * The loop would spend the whole budget, charge her, and end with «no he podido
   * comprobar los que proponía».
   *
   * The right answer for a skill this file cannot decide is **no verifier**: one
   * ask, labelled as a draft, and cheaper.
   */
  it('does not claim an arithmetic skill it cannot decide', () => {
    for (const id of ['arith.percent', 'arith.fraction', 'arith.power', 'arith.root']) {
      expect(arithmetic.handles(id), id).toBe(false);
    }
  });
});

describe('it is model-free and offline', () => {
  /**
   * T005's assertion lives in the isolation suite too; this is the local half.
   * The rule that is not negotiable: **the answer key is never requested from a
   * model.** A sheet with a wrong key goes to a child learning the operation and
   * gets marked by a teacher who trusts it.
   */
  it('imports nothing that could reach a model or a network', async () => {
    const { readFileSync } = await import('node:fs');
    const { join, dirname } = await import('node:path');
    const src = readFileSync(join(
      dirname(new URL(import.meta.url).pathname), '..', 'src', 'compose', 'verify', 'arithmetic.ts',
    ), 'utf8');

    const imports = [...src.matchAll(/^\s*import\s[^;]*from\s+['"]([^'"]+)['"]/gm)].map((m) => m[1]);
    expect(imports).toEqual(['./types.js']);
    expect(src).not.toMatch(/fetch|http|provider|sendRedacted|prompt/i);
  });
});
