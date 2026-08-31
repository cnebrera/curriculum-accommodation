import type { Skill } from './verify/types.js';

/**
 * What she wants him to learn (002 T006, FR-101/121).
 *
 * ## The distinction the whole feature rests on
 *
 * **Content** needs an anchor — a source that says what is true — because a model
 * asked for facts will produce plausible ones (FR-102).
 *
 * **Skill practice** needs a level and a verifiable answer key. «Multiplicar con
 * llevadas» does not need a source; it needs exercises that actually carry, and
 * arithmetic that is right.
 *
 * Getting the branch wrong is not a cosmetic error. Content down the skill path
 * ships unanchored facts; a skill down the content path ships exercises nobody
 * checked.
 *
 * ## A skill is a constraint, not a topic
 *
 * She writes «multiplicar con llevadas», which is *multiplication* plus *a
 * property every exercise must have*. Parsing it as the topic "multiplication"
 * loses the half that matters, and a model told to make it easier reaches for the
 * numbers first.
 */

export type Objective =
  | { kind: 'skill'; text: string; skill: Skill }
  /** Not verifiable by code. Needs an anchor, and the checklist says so. */
  | { kind: 'content'; text: string };

/**
 * Phrases that name an arithmetic operation, as she writes them.
 *
 * Corpus-shaped rather than corpus, deliberately: this is a *language* mapping —
 * which Spanish words mean multiplication — and not a pedagogical judgement. What
 * a level should be is corpus (`011`); what «multiplicar» means is not.
 */
const OPERATIONS: Array<[RegExp, string]> = [
  [/\bmultiplic|\btabla[s]? de multiplicar|\bpor\s+dos\s+cifras/i, 'arith.multiply'],
  [/\bdivi[dis]|\brepart/i, 'arith.divide'],
  [/\bsum|\bañad|\bagreg/i, 'arith.add'],
  [/\brest|\bquit|\bsustra/i, 'arith.subtract'],
];

/**
 * Constraints, as she says them.
 *
 * «Con llevadas», «llevando», «sin llevadas» — and the negative matters as much
 * as the positive: a teacher asking for multiplication **without** carrying is
 * asking for the easier case on purpose, and treating that as "no constraint"
 * would hand her exercises that carry.
 */
const CONSTRAINTS: Array<[RegExp, string]> = [
  [/\bcon\s+llevad|\bllevando\b|\bcon\s+acarreo/i, 'carries'],
  [/\bprestando\b|\bcon\s+préstamo/i, 'borrows'],
  [/\bexact/i, 'exact'],
  [/\bdecimal|\bcoma\b/i, 'decimals'],
];

const NEGATED: Array<[RegExp, string]> = [
  [/\bsin\s+llevad|\bsin\s+acarreo/i, 'carries'],
  [/\bsin\s+decimal/i, 'decimals'],
];

/**
 * Read one objective as she wrote it.
 *
 * Returns `content` whenever it cannot recognise a skill — which is the safe
 * direction: content requires an anchor and gets human verification, so a
 * misread skill is handled conservatively rather than shipped unchecked.
 */
export function readObjective(text: string): Objective {
  const trimmed = text.trim();
  if (!trimmed) return { kind: 'content', text: trimmed };

  const op = OPERATIONS.find(([re]) => re.test(trimmed))?.[1];
  if (!op) return { kind: 'content', text: trimmed };

  /*
   * A negated constraint is not the absence of one.
   *
   * «Sin llevadas» is a request for the easier case, and reading it as "no
   * constraint" would let an exercise that carries through — which is the
   * opposite of what she asked for, on the sheet for the child who is not ready
   * for it yet.
   *
   * The verifier has no `no-carries` constraint, so this is expressed by *not*
   * adding `carries` and recording the negation for the prompt. Honest: code
   * checks what it can, and the prompt carries the rest.
   */
  const negated = NEGATED.filter(([re]) => re.test(trimmed)).map(([, c]) => c);
  const constraints = CONSTRAINTS
    .filter(([re, c]) => re.test(trimmed) && !negated.includes(c))
    .map(([, c]) => c);

  return { kind: 'skill', text: trimmed, skill: { id: op, constraints } };
}

/** Several objectives, in the order she wrote them. */
export const readObjectives = (lines: readonly string[]): Objective[] =>
  lines.map((l) => l.trim()).filter(Boolean).map(readObjective);

/**
 * Attach the level from the education corpus (FR-122).
 *
 * A separate step from reading, and that is the requirement rather than a style:
 * **the level never comes from her wording and never from a model.** If she
 * writes «multiplicar con llevadas para un niño de tercero», the "tercero" is
 * ignored here — the year comes from the profile and the bounds come from the
 * corpus, so a level cannot be talked into existence by the text of an objective.
 */
export function atLevel(
  objective: Objective,
  bounds: { maxDigits?: number; decimals?: boolean } | undefined,
): Objective {
  if (objective.kind !== 'skill' || !bounds) return objective;
  return { ...objective, skill: { ...objective.skill, level: bounds } };
}
