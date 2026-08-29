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
