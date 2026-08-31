import type { EducationSystem } from '../education/parse.js';
import { findYear, skillLevelFor, hasSkillLevels, type FoundYear } from '../education/lookup.js';
import { atLevel, type Objective } from './objectives.js';

/**
 * The level, from `011` and from nowhere else (002 T012, FR-122).
 *
 * `atLevel` attaches bounds; `skillLevelFor` reads them out of the corpus. This
 * is the join, and the join is where the requirement actually lives — because
 * four separate things can go wrong between «multiplicar con llevadas» and
 * «operandos de hasta 3 cifras, sin decimales», and **every one of them has the
 * same tempting recovery**: use a sensible default.
 *
 * There is no sensible default. A sheet of four-digit multiplications for a
 * third-year looks exactly like a sheet of multiplications; the level is the one
 * property of composed material a teacher cannot check at a glance and would have
 * no reason to suspect. So when the level is unknown this says so, in her
 * language, and the report carries it (T015).
 *
 * ## Not checked is not a failure
 *
 * A year with no `skills:` block is a valid year — most of the corpus is prose
 * for the model, and the bounds exist only for arithmetic. Refusing to compose
 * would make the honest corpus the reason nothing works. So the material is
 * composed, the verifier still checks the arithmetic and the constraints, and the
 * only thing missing is the digit bound — which is what she is told.
 */

/** Why the level is or is not known, for the report and for the screen. */
export type LevelSource =
  /** From the corpus, for this year and this skill. */
  | { kind: 'corpus'; yearId: string }
  /** She has not recorded a course for this learner. */
  | { kind: 'no-year' }
  /** A course is recorded that this education system does not contain. */
  | { kind: 'year-unknown'; yearId: string }
  /** The year is real and the corpus says nothing about levels for it. */
  | { kind: 'year-has-no-levels'; yearId: string }
  /** The year has levels, and not for this skill. */
  | { kind: 'skill-not-in-year'; yearId: string; skillId: string }
  /** A content objective. There is no digit bound to look for. */
  | { kind: 'not-a-skill' };

export interface Leveled {
  /** The objective, with `skill.level` attached where the corpus knew it. */
  objective: Objective;
  source: LevelSource;
}

/**
 * Attach the level for one objective.
 *
 * The year comes from **the profile**, passed in — never from the objective's own
 * wording. «Multiplicar con llevadas para un niño de tercero» does not set the
 * level to third-year bounds: a level that can be talked into existence by the
 * text of an objective is a level a model can also talk into existence, and the
 * text of an objective is content (Principle IX).
 */
export function levelFor(
  objective: Objective,
  system: EducationSystem,
  yearId: string | undefined,
): Leveled {
  return levelFrom(objective, yearId ? findYear(system, yearId) : null, yearId);
}

/**
 * The same, from an already-resolved year.
 *
 * The shell resolves a year across **every** system the corpus ships, because
 * ids are namespaced (`es:primaria-5`) and a profile must keep working when a
 * second country is added. It therefore has a `FoundYear` and no single system,
 * and this is the entry point it uses — the decision table lives in one place
 * either way.
 */
export function levelFrom(
  objective: Objective,
  found: FoundYear | null,
  yearId: string | undefined,
): Leveled {
  if (objective.kind !== 'skill') return { objective, source: { kind: 'not-a-skill' } };
  if (!yearId) return { objective, source: { kind: 'no-year' } };
  if (!found) return { objective, source: { kind: 'year-unknown', yearId } };

  if (!hasSkillLevels(found)) {
    return { objective, source: { kind: 'year-has-no-levels', yearId } };
  }

  const bounds = skillLevelFor(found, objective.skill.id);
  if (!bounds) {
    return {
      objective,
      source: { kind: 'skill-not-in-year', yearId, skillId: objective.skill.id },
    };
  }

  return { objective: atLevel(objective, bounds), source: { kind: 'corpus', yearId } };
}

/** Several, in the order she wrote them. */
export const levelAll = (
  objectives: readonly Objective[],
  system: EducationSystem,
  yearId: string | undefined,
): Leveled[] => objectives.map((o) => levelFor(o, system, yearId));

/** True where the level was known and applied. */
export const levelWasChecked = (l: Leveled): boolean => l.source.kind === 'corpus';

/**
 * What to say when the level was not checked (FR-122, and T015's report).
 *
 * Returns `null` when there is nothing to say — the level came from the corpus,
 * or the objective is content and has no digits to bound.
 *
 * Each sentence names **what she can do about it**, which is why they are not one
 * sentence. «No he podido comprobar el nivel» leaves her nowhere; «no me consta
 * en qué curso está» points at the field she can fill in.
 */
export function explainLevel(l: Leveled, yearLabel?: (id: string) => string): string | null {
  const say = (id: string) => yearLabel?.(id) ?? id;
  switch (l.source.kind) {
    case 'corpus':
    case 'not-a-skill':
      return null;
    case 'no-year':
      return 'No me consta en qué curso está, así que no he limitado el tamaño de los '
        + 'números. Las cuentas están comprobadas; el nivel, no.';
    case 'year-unknown':
      return `No conozco el curso «${l.source.yearId}», así que no he limitado el tamaño `
        + 'de los números. Las cuentas están comprobadas; el nivel, no.';
    case 'year-has-no-levels':
      return `No tengo referencia de nivel para ${say(l.source.yearId)}, así que no he `
        + 'limitado el tamaño de los números. Revisa que las cifras le encajen.';
    case 'skill-not-in-year':
      return `No tengo referencia de nivel para esto en ${say(l.source.yearId)}, así que `
        + 'no he limitado el tamaño de los números. Revisa que las cifras le encajen.';
  }
}
