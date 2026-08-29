import { parseFrontMatter } from '../vault/parse.js';
import { logger } from '../log.js';

/**
 * Education systems, from the corpus (011 T002/T003).
 *
 * Third time this project has answered "where does a fact about the world live"
 * with "not in TypeScript" — after the provider catalogue and the axis
 * descriptors — and the answer is right for the same reason each time: a Spanish
 * teacher can read and correct this table, a British one can add hers, and
 * neither should need a release.
 *
 * Repair-not-reject, like everything else that reads the corpus: a broken year is
 * dropped and the rest of the system loads, because the screen she is standing on
 * must not die over a typo in a file about Bachillerato.
 */
export interface EducationYear {
  id: string;
  label: string;
  /**
   * Age at the start of the course, or **null** where the year says nothing about
   * age — educación especial, adult education.
   *
   * Null is load-bearing (FR-912): a wrong age gets used, an absent one gets
   * asked about, so filling a plausible number here would be worse than filling
   * nothing.
   */
  typicalAge: number | null;
  /** What a learner at this point can typically do. The stable half. */
  can?: string;
  /** A sketch of what is studied. Absent where the year does not predict it. */
  studies?: string;
  /** Bachillerato only today: content genuinely differs by modality. */
  studiesByModality?: Record<string, string>;
}

export interface EducationStage {
  id: string;
  label: string;
  /** Why this stage is unusual, for a contributor reading the file. */
  note?: string;
  modalities?: string[];
  years: EducationYear[];
}

export interface EducationSystem {
  id: string;
  label: string;
  lastChecked?: string;
  /**
   * False until a practising teacher has **disagreed** with something. Not until
   * one has read it — this project already learned that distinction with
   * `docs/axis-calibration.md` (backlog G2).
   */
  reviewedByTeacher: boolean;
  stages: EducationStage[];
  /** The prose. What the file says about its own limits, for a human. */
  body: string;
}

const str = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() ? v.trim() : undefined;

/**
 * A plausible age for a school year.
 *
 * The bound exists so a corpus edit cannot tell a teacher that a Primaria pupil
 * is 40. `null` and absent are both "no age" and are preserved as such; anything
 * outside the bound is logged and treated as absent rather than clamped —
 * clamping 40 to 99 would be inventing a different wrong answer.
 */
function typicalAge(v: unknown, where: string): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 3 || n > 99) {
    logger.warn('education.age.unusable', { where, value: String(v) });
    return null;
  }
  return Math.round(n);
}

export function parseEducationSystem(raw: string, path: string): EducationSystem | null {
  const { data, body } = parseFrontMatter(raw, path);

  const id = str(data['id']);
  const label = str(data['label']);
  if (!id || !label) {
    logger.warn('education.system.skipped', { path, reason: 'no id or label' });
    return null;
  }

  const rawStages = Array.isArray(data['stages']) ? data['stages'] : [];
  const stages: EducationStage[] = [];

  for (const s of rawStages) {
    if (!s || typeof s !== 'object') continue;
    const stage = s as Record<string, unknown>;
    const sid = str(stage['id']);
    const slabel = str(stage['label']);
    if (!sid || !slabel) {
      logger.warn('education.stage.skipped', { path, reason: 'no id or label' });
      continue;
    }

    const years: EducationYear[] = [];
    for (const y of Array.isArray(stage['years']) ? stage['years'] : []) {
      if (!y || typeof y !== 'object') continue;
      const year = y as Record<string, unknown>;
      const yid = str(year['id']);
      const ylabel = str(year['label']);
      // A broken year is dropped and the rest of the stage loads.
      if (!yid || !ylabel) {
        logger.warn('education.year.skipped', { path, stage: sid });
        continue;
      }
      const byModality = year['studies_by_modality'];
      years.push({
        // Namespaced by system, so `es:primaria-5` cannot collide with a British
        // year of the same name and a profile records which system it came from.
        id: `${id}:${yid}`,
        label: ylabel,
        typicalAge: typicalAge(year['typical_age'], `${path}:${yid}`),
        can: str(year['can']),
        studies: str(year['studies']),
        studiesByModality: byModality && typeof byModality === 'object'
          ? Object.fromEntries(Object.entries(byModality as Record<string, unknown>)
              .map(([k, v]) => [k, String(v)]))
          : undefined,
      });
    }

    if (years.length === 0) {
      logger.warn('education.stage.skipped', { path, stage: sid, reason: 'no usable years' });
      continue;
    }

    stages.push({
      id: sid,
      label: slabel,
      note: str(stage['note']),
      modalities: Array.isArray(stage['modalities'])
        ? stage['modalities'].map(String) : undefined,
      years,
    });
  }

  if (stages.length === 0) {
    logger.warn('education.system.skipped', { path, reason: 'no usable stages' });
    return null;
  }

  return {
    id, label,
    lastChecked: str(data['last_checked']) ?? dateish(data['last_checked']),
    // Absent means false. A system that does not say it was reviewed was not.
    reviewedByTeacher: data['reviewed_by_teacher'] === true,
    stages,
    body: body.trim(),
  };
}

/** YAML hands back a Date for an unquoted date — the defect found twice already. */
function dateish(v: unknown): string | undefined {
  return v instanceof Date && !Number.isNaN(v.getTime())
    ? v.toISOString().slice(0, 10) : undefined;
}

export function loadEducationSystems(
  files: ReadonlyArray<{ path: string; raw: string }>,
): EducationSystem[] {
  const out: EducationSystem[] = [];
  const seen = new Set<string>();
  for (const { path, raw } of files) {
    const system = parseEducationSystem(raw, path);
    if (!system || seen.has(system.id)) continue;
    seen.add(system.id);
    out.push(system);
  }
  return out.sort((a, b) => a.label.localeCompare(b.label, 'es'));
}
