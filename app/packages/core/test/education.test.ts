import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { parseEducationSystem, loadEducationSystems } from '../src/education/parse.js';
import { findYear, allYears, divergence, studiesFor, DIVERGENCE_YEARS } from '../src/education/lookup.js';

/**
 * The education corpus (011 T006, quickstart §1 and §2).
 *
 * Reads the **shipped** files, so a value edited into `es.md` is a value this
 * suite re-checks. Testing a parser against invented markdown would pass forever
 * while the file a teacher actually reads drifted out of contract.
 */
const repoRoot = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');
const dir = join(repoRoot, 'instructions', 'education');
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.md') && f !== 'README.md')
  .map((f) => ({ path: `instructions/education/${f}`, raw: readFileSync(join(dir, f), 'utf8') }));

const systems = loadEducationSystems(files);
const es = systems.find((s) => s.id === 'es')!;

describe('the Spanish system, as it ships', () => {
  it('parses', () => {
    expect(systems.length).toBeGreaterThanOrEqual(1);
    expect(es).toBeDefined();
  });

  it('covers every stage Carlos asked for by name', () => {
    // The three at the end are why this feature exists: they are where age and
    // year come apart.
    const ids = es.stages.map((s) => s.id);
    for (const stage of ['infantil', 'primaria', 'eso', 'bachillerato',
                         'fp-basica', 'fp-medio', 'especial', 'adultos']) {
      expect(ids, `missing stage: ${stage}`).toContain(stage);
    }
  });

  it('gives Primaria six years and ESO four', () => {
    expect(es.stages.find((s) => s.id === 'primaria')!.years).toHaveLength(6);
    expect(es.stages.find((s) => s.id === 'eso')!.years).toHaveLength(4);
  });

  it('gives Bachillerato its modalities, because a sixteen-year-old has no single syllabus', () => {
    const bach = es.stages.find((s) => s.id === 'bachillerato')!;
    expect(bach.modalities).toEqual(['ciencias', 'humanidades', 'artes', 'general']);
    expect(bach.years[0]!.studiesByModality).toBeDefined();
    expect(Object.keys(bach.years[0]!.studiesByModality!)).toContain('ciencias');
  });

  /**
   * FR-912, and the reason it exists.
   *
   * A wrong age gets used; an absent one gets asked about. In educación especial
   * and in adult education the year says nothing about age, so filling a
   * plausible number would be worse than filling nothing.
   */
  it('leaves the age null exactly where the year says nothing about it', () => {
    const nulls = allYears(es).filter((f) => f.year.typicalAge === null).map((f) => f.year.id);
    expect(nulls.sort()).toEqual(['es:espa-1', 'es:espa-2', 'es:especial']);
  });

  it('gives every other year a plausible age, in school order', () => {
    const primaria = es.stages.find((s) => s.id === 'primaria')!.years.map((y) => y.typicalAge);
    expect(primaria).toEqual([6, 7, 8, 9, 10, 11]);
    const eso = es.stages.find((s) => s.id === 'eso')!.years.map((y) => y.typicalAge);
    expect(eso).toEqual([12, 13, 14, 15]);
  });

  it('writes `can` for every year, because it is the half that matters', () => {
    // It survives a curriculum reform where `studies` does not, and it is what
    // the adaptation actually needs.
    for (const { year } of allYears(es)) {
      expect(year.can, `${year.id} has no "can"`).toBeTruthy();
      expect(year.can!.length, `${year.id}'s "can" is too short to say anything`).toBeGreaterThan(30);
    }
  });

  it('says nothing about what is studied where the year does not predict it', () => {
    // FP, educación especial and adults. Pretending otherwise would be the worst
    // kind of wrong: confident and unfounded.
    for (const stageId of ['fp-basica', 'fp-medio', 'especial', 'adultos']) {
      for (const year of es.stages.find((s) => s.id === stageId)!.years) {
        expect(year.studies, `${year.id} claims to know what is studied`).toBeUndefined();
      }
    }
  });

  it('namespaces year ids by system, so two countries cannot collide', () => {
    expect(allYears(es).every((f) => f.year.id.startsWith('es:'))).toBe(true);
  });

  it('says in its own text that it is the state minimum and that communities differ', () => {
    // Where a teacher reading the file will see it — not only in a spec she will
    // never open.
    const body = es.body.replace(/\s+/g, ' ');
    expect(body).toMatch(/mínimos del Estado/);
    expect(body).toMatch(/comunidades autónomas/);
    expect(body).toMatch(/orientación, no currículo/i);
  });

  it('says the teacher outranks it', () => {
    expect(es.body.replace(/\s+/g, ' ')).toMatch(/manda sobre esto/);
  });

  /**
   * **This assertion failing is good news.**
   *
   * It stays false until a practising teacher has *disagreed* with something —
   * not until one has read it and nodded. Backlog G16 tracks it, and the same
   * standard as G2 and `docs/axis-calibration.md`.
   */
  it('is not claimed as reviewed, because it has not been', () => {
    expect(es.reviewedByTeacher).toBe(false);
    expect(es.lastChecked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('repair, not reject', () => {
  const raw = readFileSync(join(dir, 'es.md'), 'utf8');
  const without = (line: string) =>
    raw.split('\n').filter((l) => l.trim() !== line).join('\n');

  it('skips a system with no id', () => {
    expect(parseEducationSystem(without('id: es'), 'x.md')).toBeNull();
  });

  it('skips a system with no label', () => {
    expect(parseEducationSystem(without('label: España'), 'x.md')).toBeNull();
  });

  it('drops a broken year and loads the rest of the stage', () => {
    // Drop the id line and promote the label to the list item: a year with a
    // label and no id, which is still valid YAML. The earlier version produced a
    // duplicate key and killed the whole file, which tests the YAML parser rather
    // than this one.
    const broken = raw.replace(
      '      - id: primaria-3\n        label: 3.º de Primaria\n',
      '      - label: 3.º de Primaria\n');
    const system = parseEducationSystem(broken, 'x.md')!;
    const primaria = system.stages.find((s) => s.id === 'primaria')!;
    expect(primaria.years.length).toBeLessThan(6);
    expect(primaria.years.length).toBeGreaterThan(3);
  });

  it('treats an absurd age as absent rather than clamping it', () => {
    /*
     * A corpus edit must not be able to tell a teacher a Primaria pupil is 40 —
     * and clamping 40 to 99 would invent a different wrong answer. Absent is the
     * only honest reading.
     */
    const absurd = raw.replace('typical_age: 10', 'typical_age: 400');
    const system = parseEducationSystem(absurd, 'x.md')!;
    expect(findYear(system, 'es:primaria-5')!.year.typicalAge).toBeNull();
  });

  it('degrades a file that is not a system at all', () => {
    expect(parseEducationSystem('nada', 'x.md')).toBeNull();
    expect(parseEducationSystem('', 'x.md')).toBeNull();
    expect(parseEducationSystem('---\nid: x\nlabel: X\n---\n', 'x.md')).toBeNull();
  });

  it('treats a system that does not claim review as unreviewed', () => {
    const silent = raw.replace('reviewed_by_teacher: false', '');
    expect(parseEducationSystem(silent, 'x.md')!.reviewedByTeacher).toBe(false);
  });
});

describe('divergence — the reason the age is stored at all', () => {
  const p5 = findYear(es, 'es:primaria-5')!.year;

  it('is silent at one year, which is ordinary', () => {
    expect(divergence(11, p5)!.notable).toBe(false);
    expect(divergence(9, p5)!.notable).toBe(false);
  });

  it('fires at two, in both directions', () => {
    expect(divergence(12, p5)!.notable).toBe(true);
    expect(divergence(8, p5)!.notable).toBe(true);
    expect(DIVERGENCE_YEARS).toBe(2);
  });

  it('reports how far, and which way', () => {
    expect(divergence(14, p5)).toEqual({ years: 4, notable: true });
    expect(divergence(7, p5)).toEqual({ years: -3, notable: true });
  });

  it('has nothing to say where there is nothing to compare', () => {
    // No age recorded, or a year that says nothing about age. Not "no
    // divergence" — nothing to say, which is a different answer.
    expect(divergence(undefined, p5)).toBeNull();
    expect(divergence(30, findYear(es, 'es:espa-1')!.year)).toBeNull();
  });
});

describe('what is studied, given a modality', () => {
  const bach1 = findYear(es, 'es:bach-1')!;

  it("gives the modality syllabus when she has said which", () => {
    expect(studiesFor(bach1, 'ciencias')).toMatch(/Matemáticas I/);
    expect(studiesFor(bach1, 'humanidades')).toMatch(/Latín|Historia/);
  });

  it('says nothing rather than picking one when she has not', () => {
    // A Bachillerato learner whose modality is unknown is better served by
    // silence than by Ciencias.
    expect(studiesFor(bach1)).toBeUndefined();
  });

  it('falls back to the plain studies where there are no modalities', () => {
    expect(studiesFor(findYear(es, 'es:primaria-5')!)).toMatch(/Fracciones/);
  });
});
