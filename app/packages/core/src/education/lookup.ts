import type { EducationSystem, EducationStage, EducationYear } from './parse.js';

/**
 * Year → stage, year → age, and the one that matters: **divergence** (011 T004).
 *
 * Pure lookups over a parsed system. The interesting function is the last one.
 */
export interface FoundYear { stage: EducationStage; year: EducationYear }

export function findYear(system: EducationSystem, yearId: string): FoundYear | null {
  for (const stage of system.stages) {
    const year = stage.years.find((y) => y.id === yearId);
    if (year) return { stage, year };
  }
  return null;
}

/** Every year, flattened, in the order the file declares — which is school order. */
export const allYears = (system: EducationSystem): FoundYear[] =>
  system.stages.flatMap((stage) => stage.years.map((year) => ({ stage, year })));

export interface Divergence {
  /** Years away from the year's typical age. Positive means older. */
  years: number;
  /** Past the threshold, and therefore worth telling the model about. */
  notable: boolean;
}

/**
 * How far this learner is from the usual age for his year (research R4).
 *
 * **Two years, not one.** One year is ordinary — a summer birthday, a late start,
 * a repetition that everybody has — and a sentence that fires on most learners
 * stops being read, taking the case that mattered with it.
 *
 * At two years or more, register and curricular demand have genuinely come apart,
 * and that is the single most useful thing the model could know about this
 * learner: the material has to be pitched at his year and sound like his age.
 *
 * Returns null where there is nothing to compare — no age recorded, or a year that
 * says nothing about age (educación especial, adults). Not "no divergence":
 * nothing to say.
 */
export const DIVERGENCE_YEARS = 2;

export function divergence(age: number | undefined, year: EducationYear): Divergence | null {
  if (age === undefined || year.typicalAge === null) return null;
  const years = age - year.typicalAge;
  return { years, notable: Math.abs(years) >= DIVERGENCE_YEARS };
}

/** What `studies` says for this year, given a modality where the stage has them. */
export function studiesFor(found: FoundYear, modality?: string): string | undefined {
  const { year } = found;
  if (modality && year.studiesByModality?.[modality]) return year.studiesByModality[modality];
  // No modality chosen on a stage that has them: say nothing rather than pick one.
  // A Bachillerato learner whose modality is unknown is better served by silence
  // than by Ciencias.
  if (year.studiesByModality && !modality) return undefined;
  return year.studies;
}

/**
 * The bounds for one skill at one year (002 FR-122).
 *
 * `undefined` means **the corpus does not say**, and that is a real answer rather
 * than a reason to fall back on anything. What the caller must do with it is not
 * guess: nothing is constrained and the report says the level was not checked.
 *
 * The alternative — a default, or the model's own sense of what a ten-year-old
 * handles — is the exact substitution FR-122 exists to forbid, and it would be
 * invisible: a sheet of four-digit multiplications for a third-year looks like a
 * sheet of multiplications.
 */
export function skillLevelFor(
  found: FoundYear, skillId: string,
): { maxDigits?: number; decimals?: boolean } | undefined {
  return found.year.skills?.[skillId];
}

/** True when the corpus has anything to say about levels for this year. */
export const hasSkillLevels = (found: FoundYear): boolean =>
  Object.keys(found.year.skills ?? {}).length > 0;

/**
 * Is this education file stale? (011 T021/T022, FR-908.)
 *
 * A curriculum changes. `last_checked` is the day somebody read the education
 * authority's pages — not the day the file was edited — so a file nobody has
 * re-read in over a year is a file making claims about a system that may have moved.
 *
 * ## Marked, never withdrawn
 *
 * Unlike a stale provider entry, which is hidden. Hiding the only education system
 * leaves her unable to record a course at all, and a slightly out-of-date list of
 * Spanish school years is far better than no list — so this returns a **warning**,
 * and the caller shows it beside the choice rather than removing the choice.
 *
 * 400 days rather than 365: a file checked at the start of one school year should not
 * turn red in the middle of the next one for being six weeks over.
 */
export const STALE_AFTER_DAYS = 400;

export interface Staleness {
  days: number;
  stale: boolean;
  /** Null when the file records no `last_checked` at all, which is its own problem. */
  lastChecked: string | null;
}

export function stalenessOf(
  lastChecked: string | undefined,
  /** Today, passed in: a pure function that reads the clock cannot be asserted. */
  today: string,
): Staleness {
  if (!lastChecked) return { days: Infinity, stale: true, lastChecked: null };
  const then = Date.parse(lastChecked);
  const now = Date.parse(today);
  if (!Number.isFinite(then) || !Number.isFinite(now)) {
    return { days: Infinity, stale: true, lastChecked };
  }
  const days = Math.floor((now - then) / 86_400_000);
  return { days, stale: days > STALE_AFTER_DAYS, lastChecked };
}

/** What to tell her, or `null` when there is nothing to say. */
export function stalenessNotice(s: Staleness, systemLabel: string): string | null {
  if (!s.stale) return null;
  if (s.lastChecked === null) {
    return `No consta cuándo se comprobó la lista de cursos de ${systemLabel}. `
      + 'Sigue estando, y puede estar desfasada.';
  }
  const years = Math.floor(s.days / 365);
  return `La lista de cursos de ${systemLabel} se comprobó el ${s.lastChecked}, hace `
    + `${years >= 1 ? `más de ${years} ${years === 1 ? 'año' : 'años'}` : `${s.days} días`}. `
    + 'La sigo usando — una lista algo desfasada es mejor que ninguna — pero si un '
    + 'curso no encaja, es por esto.';
}
