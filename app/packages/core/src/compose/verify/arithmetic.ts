import type { Skill, ProposedExercise, Verifier } from './types.js';

/**
 * The arithmetic verifier (002 T002/T003, FR-123/124).
 *
 * Deterministic, offline, no model — `packages/core/test/isolation.test.ts`
 * enforces that, and it is the point rather than a nicety. **The answer key is
 * computed here and never requested from a model**, because a sheet with a wrong
 * key goes to a child who is learning the operation and gets marked by a teacher
 * who trusts it.
 *
 * ## Carrying is a constraint, not a topic
 *
 * «Multiplicar con llevadas» is multiplication **plus a property the exercise must
 * have**. `4 × 2` is multiplication and does not exercise carrying, and a model
 * asked to make something easier reaches for the numbers first — because that is
 * what "easier" means everywhere else. So `exercises()` checks the property, and
 * an exercise that lacks it is rejected rather than accepted for being
 * arithmetically correct.
 *
 * `47 × 8` carries. `21 × 3` does not. That is the whole distinction, and no
 * amount of wording changes it.
 *
 * ## Exact arithmetic, deliberately
 *
 * Decimals are computed on scaled integers rather than in floating point. `0.1 +
 * 0.2` is `0.30000000000000004` in IEEE 754, and a verifier that rejected a
 * model's correct `0.3` would reject every correct exercise it was given — the
 * failure mode where a strict checker exhausts the retry budget and she is told
 * nothing could be generated.
 */

/** `47 × 8`, `1.5 + 2`, `120 ÷ 4`. One operation, two operands. */
const EXPR = /^\s*(-?\d+(?:[.,]\d+)?)\s*([+\-−×x*÷/:])\s*(-?\d+(?:[.,]\d+)?)\s*=?\s*$/;

type Op = '+' | '-' | '×' | '÷';

const OP: Record<string, Op> = {
  '+': '+', '-': '-', '−': '-',
  '×': '×', x: '×', '*': '×',
  '÷': '÷', '/': '÷', ':': '÷',
};

interface Parsed { a: string; b: string; op: Op }

function parse(expression: string): Parsed | null {
  const m = EXPR.exec(expression.replace(/\s+/g, ' '));
  if (!m) return null;
  const op = OP[m[2]!];
  if (!op) return null;
  return { a: m[1]!.replace(',', '.'), b: m[3]!.replace(',', '.'), op };
}

/** Digits after the decimal point. */
const scaleOf = (s: string): number => (s.split('.')[1] ?? '').length;

/** A decimal string as an integer plus a scale, so nothing is done in floats. */
function toScaled(s: string, scale: number): bigint {
  const [whole, frac = ''] = s.split('.');
  const padded = (frac + '0'.repeat(scale)).slice(0, scale);
  return BigInt((whole ?? '0') + (scale ? padded : ''));
}

const fromScaled = (n: bigint, scale: number): string => {
  if (scale === 0) return n.toString();
  const neg = n < 0n;
  const digits = (neg ? -n : n).toString().padStart(scale + 1, '0');
  const whole = digits.slice(0, -scale);
  const frac = digits.slice(-scale).replace(/0+$/, '');
  return `${neg ? '-' : ''}${whole}${frac ? `.${frac}` : ''}`;
};

/**
 * Does a written addition of these two carry?
 *
 * Column by column, right to left, exactly as a child does it — because that is
 * what «con llevadas» means to the teacher who asked. Not «is the result larger
 * than ten».
 */
function additionCarries(a: string, b: string): boolean {
  const scale = Math.max(scaleOf(a), scaleOf(b));
  let x = toScaled(a, scale);
  let y = toScaled(b, scale);
  if (x < 0n || y < 0n) return false;   // signs are a different lesson

  while (x > 0n || y > 0n) {
    if ((x % 10n) + (y % 10n) >= 10n) return true;
    x /= 10n;
    y /= 10n;
  }
  return false;
}

/** Does a written subtraction need borrowing? Column by column, as she teaches it. */
function subtractionBorrows(a: string, b: string): boolean {
  const scale = Math.max(scaleOf(a), scaleOf(b));
  let x = toScaled(a, scale);
  let y = toScaled(b, scale);
  if (x < y) return false;              // a negative result is a different lesson
  while (y > 0n) {
    if (x % 10n < y % 10n) return true;
    x /= 10n;
    y /= 10n;
  }
  return false;
}

/**
 * Does a written multiplication carry?
 *
 * True when any single-digit partial product exceeds nine, or when the partial
 * products carry as they are added — which is what makes `47 × 8` the exercise
 * and `21 × 3` not.
 */
function multiplicationCarries(a: string, b: string): boolean {
  const digitsOf = (s: string): number[] =>
    [...s.replace('-', '').replace('.', '')].map(Number).reverse();
  const da = digitsOf(a);
  const db = digitsOf(b);

  for (const x of da) {
    let carry = 0;
    for (const y of db) {
      const p = x * y + carry;
      if (p > 9) return true;
      carry = Math.floor(p / 10);
    }
    if (carry > 0) return true;
  }
  return false;
}

/**
 * A **división exacta**: remainder zero in integer division.
 *
 * Not "the decimal terminates". `7 ÷ 2 = 3,5` terminates perfectly and is not an
 * exact division — «exacta» is the curriculum's term for `resto 0`, and a child
 * practising exact division is practising the case where nothing is left over.
 *
 * The first implementation checked for a terminating decimal and accepted
 * `7 ÷ 2`, which would have put a division with a remainder on a sheet about
 * divisions without one. Caught by the test that asserted the rejection.
 */
function dividesExactly(a: string, b: string): boolean {
  // Decimal operands are not what «exacta» is about; the concept is integer.
  if (scaleOf(a) > 0 || scaleOf(b) > 0) return false;
  const y = BigInt(b);
  if (y === 0n) return false;
  return BigInt(a) % y === 0n;
}

/**
 * The constraints in her words (002, and the same lesson as `012` FR-1006).
 *
 * The ids are machine-readable on purpose — `constraints: ['carries']` — but they
 * reach the **report**, which she reads before she signs. The first version of
 * this file produced «no practica carries», which asks her to learn our
 * vocabulary to understand her own document.
 *
 * An unknown id falls through as itself rather than being dropped: a new
 * constraint should read oddly for one release, not vanish.
 */
export const CONSTRAINT_ES: Record<string, string> = {
  carries: 'llevadas',
  borrows: 'restar llevando',
  exact: 'divisiones exactas',
  decimals: 'decimales',
};

export const describeConstraints = (ids: readonly string[]): string =>
  ids.map((i) => CONSTRAINT_ES[i] ?? i).join(' y ');

/**
 * The four operations, and only the four (002 T022).
 *
 * `handles` used to be `startsWith('arith.')`, which claimed every arithmetic
 * skill anybody might name — and the claim was false. `arith.percent` reached
 * `exercises()`, whose operation table has no entry for it, so every proposal came
 * back `unknown`: the loop would spend the whole proposal budget, charge her for
 * it, and end with «no he podido comprobar los que proponía».
 *
 * The right answer for a skill this file cannot check is **no verifier**, which is
 * one ask, labelled as a draft, and cheaper. Claiming a skill it cannot decide is
 * how the unverifiable path gets bypassed by a verifier that means well.
 */
const HANDLED: ReadonlySet<string> = new Set([
  'arith.add', 'arith.subtract', 'arith.multiply', 'arith.divide',
]);

export const arithmetic: Verifier = {
  handles: (skillId) => HANDLED.has(skillId),

  describe: describeConstraints,

  solve(exercise: ProposedExercise): string | 'unknown' {
    const p = parse(exercise.expression);
    if (!p) return 'unknown';

    const scale = Math.max(scaleOf(p.a), scaleOf(p.b));
    const x = toScaled(p.a, scale);
    const y = toScaled(p.b, scale);

    switch (p.op) {
      case '+': return fromScaled(x + y, scale);
      case '-': return fromScaled(x - y, scale);
      case '×': return fromScaled(x * y, scale * 2);
      case '÷': {
        if (y === 0n) return 'unknown';           // not an answer, and not zero
        // Six decimal places of headroom, then trimmed. An exercise whose answer
        // does not terminate is reported as unknown rather than rounded — a
        // rounded key marks a correct answer wrong.
        const scaled = (x * 10n ** 6n) / y;
        if ((x * 10n ** 6n) % y !== 0n) return 'unknown';
        return fromScaled(scaled, 6);
      }
    }
  },

  exercises(skill: Skill, exercise: ProposedExercise): boolean | 'unknown' {
    const p = parse(exercise.expression);
    if (!p) return 'unknown';

    // The operation itself must match what she asked for.
    const wanted = skill.id.split('.')[1];
    const isOp: Record<string, Op> = { add: '+', subtract: '-', multiply: '×', divide: '÷' };
    if (wanted && isOp[wanted] && isOp[wanted] !== p.op) return false;

    /*
     * The level, from `011` and never from a model (FR-122).
     *
     * Checked here rather than in `verify()` because "too many digits for this
     * year" is a fact about the exercise, and the caller should not have to know
     * which verifier cares about digits.
     */
    const digits = (s: string): number => s.replace(/[-.]/g, '').length;
    if (skill.level?.maxDigits && Math.max(digits(p.a), digits(p.b)) > skill.level.maxDigits) {
      return false;
    }
    if (skill.level?.decimals === false && (scaleOf(p.a) > 0 || scaleOf(p.b) > 0)) {
      return false;
    }

    for (const c of skill.constraints) {
      switch (c) {
        case 'carries':
          if (p.op === '+' && !additionCarries(p.a, p.b)) return false;
          if (p.op === '×' && !multiplicationCarries(p.a, p.b)) return false;
          // Carrying is not a property of subtraction or division.
          if (p.op === '-' || p.op === '÷') return 'unknown';
          break;
        case 'borrows':
          if (p.op !== '-') return 'unknown';
          if (!subtractionBorrows(p.a, p.b)) return false;
          break;
        case 'exact':
          if (p.op === '÷' && !dividesExactly(p.a, p.b)) return false;
          break;
        case 'decimals':
          if (scaleOf(p.a) === 0 && scaleOf(p.b) === 0) return false;
          break;
        default:
          /*
           * A constraint this verifier does not know is `unknown`, not `true`.
           *
           * Returning `true` would silently approve an exercise against a
           * constraint nobody checked — which is the failure this whole branch
           * exists to prevent, arriving through a default case.
           */
          return 'unknown';
      }
    }
    return true;
  },
};
