import { verify, type ProposedExercise, type Skill, type SkillVerdict, type Verifier } from './verify/types.js';

/**
 * Word problems, verified against the statement the child reads
 * (027 T003, FR-2501/FR-2502, research R2).
 *
 * ## The cheap version, and why it is not this one
 *
 * The obvious implementation asks the model to declare its quantities and verifies
 * those. That **verifies the liar with his own declaration**: a model whose arithmetic
 * is wrong can declare quantities that agree with its wrong answer, and every check
 * passes. So the quantities come from the statement — the text the child will actually
 * read — the declared operation is admitted only if every operand is found there, and
 * the answer is computed by the arithmetic verifier `002` already built.
 *
 * ## What this deliberately does not verify, said out loud
 *
 * That the *story* implies the operation. «María tiene 3,50 € y compra un cuaderno de
 * 1,20 €» with `OPERACIÓN: 3,50 + 1,20` passes every check here if the model also claims
 * the sum. Deciding that «compra» means subtract is Spanish semantics — judgement in
 * code, which Principle I refuses — and brittle enough that every miss burns her budget.
 *
 * What stops it is layered instead of faked: the skill's operation must match what she
 * asked for (`exercises` rejects a sum for «problemas de restas»), the report says
 * exactly which checks ran, the draft mark stays, and SC-2505 puts a teacher in front of
 * it. Verifying pedagogy deterministically is not on offer, and pretending otherwise is
 * the failure this project exists to prevent.
 */

/** One parsed problem proposal. A block the parser half-understood is NO proposal. */
export interface ProposedProblem {
  /** The statement, verbatim, as the child would read it. */
  statement: string;
  /** The declared operation, e.g. `3,50 - 1,20`. Absent for a non-computable ask. */
  expression?: string;
  /** What the model said the answer is. Never trusted; only compared. */
  statedAnswer?: string;
}

/**
 * Every number in a piece of Spanish text, as a comparable value.
 *
 * ## The two separators, and which one decides
 *
 * Spanish writes «3,50 €» and «1.250 alumnos»: the comma is the decimal mark and the dot
 * groups thousands. A model prompted in Spanish writes both, and the arithmetic verifier
 * accepts either as a decimal point — so this normalises rather than assuming.
 *
 * A dot followed by exactly three digits, with digits before it, is read as a thousands
 * group; anything else is a decimal point. That is a **heuristic about typography**, not
 * about pedagogy, and it is the reason it lives in code.
 *
 * Extra numbers are harmless in the direction that matters: this list is what an operand
 * may be drawn *from*, and a number written in the statement is a number the child can
 * see. «El 3 de marzo» making `3` available is not a hole — it is a `3` on his page.
 */
export function extractQuantities(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.match(/-?\d[\d.,]*/g) ?? []) {
    const value = asValue(raw);
    if (value !== null) out.push(value);
  }
  return out;
}

/** A written number as a decimal string, or `null` when it is not one. */
function asValue(raw: string): string | null {
  let t = raw.replace(/[.,]+$/, '');
  if (t.includes(',')) {
    // Comma present: it is the decimal mark, so every dot is a thousands group.
    t = t.replace(/\./g, '').replace(',', '.');
  } else {
    // Thousands only when every dot group is exactly three digits — `1.250.000`.
    const parts = t.split('.');
    t = parts.length > 1 && parts.slice(1).every((p) => /^\d{3}$/.test(p))
      ? parts.join('')
      : t;
  }
  const n = Number(t);
  return Number.isFinite(n) ? String(n) : null;
}

/** The operands of a declared operation, as comparable values. */
export const operandsOf = (expression: string): string[] => extractQuantities(expression);

/**
 * Verify one problem. **Rejects, never repairs** (FR-2502).
 *
 * A statement rewritten by code is nobody's story: the model wrote it, the child reads
 * it, and patching its numbers to match an operation would produce a text no human
 * chose. So a proposal whose arithmetic and whose story are two different problems is
 * thrown away and asked for again.
 *
 * The two extra refusals ride `malformed`'s channel with their own sentences, because
 * the loop, the budget, `explainOutcome` and the report all key on `SkillVerdict` and a
 * sixth reason would be a fifth thing to teach every one of them.
 */
export function verifyProblem(v: Verifier, skill: Skill, p: ProposedProblem): SkillVerdict {
  const statement = p.statement.trim();
  if (!statement) {
    return { ok: false, reason: 'malformed', because: 'Ha propuesto una operación sin enunciado.' };
  }

  /*
   * No declared operation is `unknown`, not a rejection.
   *
   * It is not a bad proposal — it is one this layer cannot decide about, which is
   * exactly what `unknown` means. The exam path carries such questions as
   * declared-unverified (FR-2504); the problems loop lets the P19 cut handle a batch of
   * them, so a request whose every problem is non-computable costs one batch instead of
   * the whole budget.
   */
  if (!p.expression?.trim()) {
    return { ok: false, reason: 'unknown',
      because: `«${first(statement)}» no trae ninguna operación, así que no puedo comprobarlo.` };
  }

  const quantities = extractQuantities(statement);
  const operands = operandsOf(p.expression);
  const missing = operands.filter((o) => !quantities.includes(o));
  if (operands.length === 0 || missing.length > 0) {
    /*
     * An operand from nowhere means the story and the arithmetic are two different
     * problems — **and the child gets the story**. This is the check the whole feature
     * stands on: without it, verification confirms the model's separate declaration
     * rather than the text on the page.
     */
    return { ok: false, reason: 'malformed',
      because: `«${p.expression}» usa ${missing.length === 1 ? 'un número' : 'números'} `
        + `que no ${missing.length === 1 ? 'está' : 'están'} en el enunciado`
        + `${missing.length ? ` (${missing.join(', ')})` : ''}.` };
  }

  const verdict = verify(v, skill, { expression: p.expression, statedAnswer: p.statedAnswer });
  if (!verdict.ok) return verdict;

  /*
   * The answer must not be written in the statement — but «10 − 5 = 5» is fine.
   *
   * An answer in the statement is an answer on the learner's page, which is SC-2502's
   * cousin. The naive form of this check («is the answer among the statement's
   * numbers?») rejects half of all subtractions: «Tenía 10 caramelos y se comió 5.
   * ¿Cuántos le quedan?» answers 5, and the 5 is right there as an operand. Rejecting
   * that systematically would burn her budget on correct problems.
   *
   * So what is refused is an answer that appears in the statement **and is not one of
   * the operands** — «…¿cuánto le queda? Le quedan 2,30 €», which is the case that
   * actually puts the answer on his page.
   */
  const answer = asValue(verdict.answer.replace(',', '.'));
  if (answer !== null && quantities.includes(answer) && !operands.includes(answer)) {
    return { ok: false, reason: 'malformed', answer: verdict.answer,
      because: `El enunciado ya dice el resultado (${verdict.answer}), así que la respuesta `
        + 'estaría en la hoja del alumno.' };
  }

  return verdict;
}

/** The first few words, so a message names the problem without quoting a paragraph. */
const first = (s: string): string => {
  const words = s.split(/\s+/).slice(0, 6).join(' ');
  return words.length < s.length ? `${words}…` : words;
};
