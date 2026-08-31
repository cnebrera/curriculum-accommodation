import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { parseEducationSystem, loadEducationSystems } from '../src/education/parse.js';
import { findYear, allYears, divergence, studiesFor, skillLevelFor, hasSkillLevels, DIVERGENCE_YEARS } from '../src/education/lookup.js';

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

describe('the shipped Spanish file parses at all', () => {
  /**
   * Added 2026-08-31, after a corpus edit broke the YAML and **the suite got
   * quieter rather than louder**: `es` came back undefined, every test that used
   * it failed to collect, and the reported total dropped from 874 to 849 with
   * "849 passed" beside it.
   *
   * A file that stops parsing must fail one assertion by name, not remove
   * twenty-five. This is that assertion.
   */
  it('is a system with stages and years', () => {
    expect(es, 'instructions/education/es.md did not parse — check the YAML').toBeDefined();
    expect(es.stages.length).toBeGreaterThanOrEqual(8);
    expect(es.stages.every((st) => st.years.length > 0)).toBe(true);
  });

  it('carries machine-readable skill bounds for the primary years (002 FR-122)', () => {
    const p3 = findYear(es, 'es:primaria-3');
    expect(p3, '3.º de Primaria is missing').toBeDefined();
    expect(skillLevelFor(p3!, 'arith.multiply')).toEqual({ maxDigits: 2, decimals: false });

    // And silence where the corpus says nothing, which is a real answer.
    expect(skillLevelFor(p3!, 'lengua.ortografia')).toBeUndefined();
    const eso = findYear(es, 'es:eso-1');
    expect(hasSkillLevels(eso!), 'ESO has no bounds yet, and that is fine').toBe(false);
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

/**
 * The output check knows about the profile's newer fields (011 T018, FR-910).
 *
 * The rule the task states: **adding a profile field without extending this check is
 * how the next one reaches a sheet.** The school is the sharpest case — `015` FR-1306
 * puts it in the never-sent set beside the name, because a school plus a course plus
 * a set of barriers identifies a child far more sharply than a code does.
 */
describe('a learner\'s own facts never reach his sheet', () => {
  const sheet = (text: string) =>
    `<html><body><main><section id="b1">${text}</section></main></body></html>`;

  it('fails a render carrying his school', async () => {
    const { checkOutput } = await import('../src/index.js');
    const r = checkOutput(sheet('Rodea la casa. CEIP Miguel Hernández'), ['A1B2'], [],
      ['CEIP Miguel Hernández', 'es:primaria-5', 'Primaria']);

    expect(r.ok).toBe(false);
    expect(r.findings.join(' ')).toContain('CEIP Miguel Hernández');
    expect(r.findings.join(' ')).toContain('es un dato suyo');
  });

  it('fails a render carrying his course id', async () => {
    const { checkOutput } = await import('../src/index.js');
    expect(checkOutput(sheet('Ficha de es:primaria-5'), ['A1B2'], [], ['es:primaria-5']).ok)
      .toBe(false);
  });

  it('passes an ordinary sheet', async () => {
    const { checkOutput } = await import('../src/index.js');
    expect(checkOutput(sheet('Rodea la casa con un círculo.'), ['A1B2'], [],
      ['CEIP Miguel Hernández', 'es:primaria-5', 'Primaria']).ok).toBe(true);
  });

  /**
   * Short values are skipped, and that is a stated limit rather than an oversight.
   * «ESO» or an age of «9» would fire on ordinary content, and a two-character value
   * identifies nobody on its own — so the check covers the identifying fields and
   * says so.
   */
  it('does not fire on a value too short to identify anybody', async () => {
    const { checkOutput } = await import('../src/index.js');
    expect(checkOutput(sheet('Esto es una prueba de la ESO.'), ['A1B2'], [], ['ESO', '9']).ok)
      .toBe(true);
  });

  it('is case- and punctuation-insensitive, because a school name arrives with a comma', async () => {
    const { checkOutput } = await import('../src/index.js');
    expect(checkOutput(sheet('ceip miguel hernández, 5.º'), ['A1B2'], [],
      ['CEIP Miguel Hernández']).ok).toBe(false);
  });
});

/**
 * Staleness, and why a stale education file is **marked** rather than withdrawn
 * (011 T021/T022, FR-908).
 *
 * A stale provider entry is hidden. Hiding the only education system would leave her
 * unable to record a course at all — and a slightly out-of-date list of Spanish school
 * years is far better than no list. So this produces a sentence, and the caller keeps
 * the choice.
 */
describe('a curriculum goes out of date', () => {
  it('is not stale inside the window', async () => {
    const { stalenessOf, stalenessNotice } = await import('../src/index.js');
    const s = stalenessOf('2026-08-01', '2026-08-31');

    expect(s).toEqual({ days: 30, stale: false, lastChecked: '2026-08-01' });
    expect(stalenessNotice(s, 'España')).toBeNull();
  });

  /**
   * 400 days rather than 365: a file checked at the start of one school year should
   * not turn red in the middle of the next one for being six weeks over.
   */
  it('gives a school year of slack past the year mark', async () => {
    const { stalenessOf, STALE_AFTER_DAYS } = await import('../src/index.js');
    expect(STALE_AFTER_DAYS).toBe(400);
    expect(stalenessOf('2025-08-31', '2026-08-31').stale).toBe(false);
    expect(stalenessOf('2025-06-01', '2026-08-31').stale).toBe(true);
  });

  it('says how old it is, and that it is still being used', async () => {
    const { stalenessOf, stalenessNotice } = await import('../src/index.js');
    const said = stalenessNotice(stalenessOf('2024-01-10', '2026-08-31'), 'España');

    expect(said).toContain('2024-01-10');
    // The half that matters: it is not an error, and the list still works.
    expect(said).toContain('La sigo usando');
    expect(said).toContain('mejor que ninguna');
  });

  it('treats a missing date as stale, and says that instead', async () => {
    const { stalenessOf, stalenessNotice } = await import('../src/index.js');
    const s = stalenessOf(undefined, '2026-08-31');

    expect(s.stale).toBe(true);
    expect(s.lastChecked).toBeNull();
    expect(stalenessNotice(s, 'España')).toContain('No consta cuándo se comprobó');
  });

  it('treats an unreadable date as stale rather than as fresh', async () => {
    // Failing open here would mean a file with `last_checked: "el martes"` never
    // ageing, which is the one direction that must not happen silently.
    const { stalenessOf } = await import('../src/index.js');
    expect(stalenessOf('el martes', '2026-08-31').stale).toBe(true);
  });

  /** The shipped file, so the CI check and the interface cannot disagree. */
  it('the shipped Spanish file is inside the window', async () => {
    const { stalenessOf, parseEducationSystem } = await import('../src/index.js');
    const { readFileSync } = await import('node:fs');
    const { join, dirname } = await import('node:path');

    const root = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');
    const system = parseEducationSystem(
      readFileSync(join(root, 'instructions', 'education', 'es.md'), 'utf8'), 'es.md');
    if (!system) throw new Error('instructions/education/es.md no longer parses');

    const s = stalenessOf(system.lastChecked, new Date().toISOString().slice(0, 10));
    expect(s.lastChecked, 'es.md must record last_checked').not.toBeNull();
    expect(s.stale,
      `es.md was last checked ${s.days} days ago — read the authority's pages and update it`)
      .toBe(false);
  });
});

/**
 * The extension point, exercised rather than claimed (011 T020, SC-902).
 *
 * ## Why this is a fixture and not a second shipped file
 *
 * T020 said: «prove it by adding one — a second system file, enough to demonstrate
 * SC-902, **and delete it again if it cannot be written honestly**.»
 *
 * It cannot. The corpus's own standard is that a file is false until a practising
 * teacher disagrees with something concrete in it, and nobody here can write another
 * country's stages, typical ages and curricular expectations to that standard. Shipping
 * a plausible `pt.md` or `fr.md` would put a claim about somebody else's school system
 * in front of a teacher, which is exactly the failure `es.md`'s own header warns about.
 *
 * So the extension point is proved **here**, against a fixture, and the honest
 * statement is recorded: adding a real second system is a Markdown file and no code —
 * and nobody has written one, because writing one honestly needs somebody who teaches
 * in it.
 */
describe('a second education system is a Markdown file and no code', () => {
  const SECOND = [
    '---',
    'id: zz',
    'label: Sistema de prueba',
    'last_checked: "2026-08-31"',
    'reviewed_by_teacher: false',
    'stages:',
    '  - id: primero',
    '    label: Primer ciclo',
    '    years:',
    '      - id: p1',
    '        label: Año 1',
    '        typical_age: 7',
    '        can: >',
    '          Una frase.',
    '        studies: >',
    '          Otra frase.',
    '---',
    '',
    '# Sistema de prueba',
    '',
    'Fixture. No es un sistema real y no se distribuye.',
    '',
  ].join('\n');

  it('loads beside the shipped one, without touching a line of code', async () => {
    const { loadEducationSystems } = await import('../src/index.js');
    const { readFileSync } = await import('node:fs');
    const { join, dirname } = await import('node:path');

    const root = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');
    const es = readFileSync(join(root, 'instructions', 'education', 'es.md'), 'utf8');

    const systems = loadEducationSystems([
      { path: 'es.md', raw: es },
      { path: 'zz.md', raw: SECOND },
    ]);

    expect(systems).toHaveLength(2);
    expect(systems.map((s) => s.id).sort()).toEqual(['es', 'zz']);
  });

  /** SC-902's actual content: no year id can be confused across systems. */
  it('namespaces every year, so no lookup can return the wrong country\'s', async () => {
    const { loadEducationSystems, findYear } = await import('../src/index.js');
    const { readFileSync } = await import('node:fs');
    const { join, dirname } = await import('node:path');

    const root = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');
    const systems = loadEducationSystems([
      { path: 'es.md', raw: readFileSync(join(root, 'instructions', 'education', 'es.md'), 'utf8') },
      { path: 'zz.md', raw: SECOND },
    ]);

    const zz = systems.find((s) => s.id === 'zz')!;
    const es = systems.find((s) => s.id === 'es')!;

    expect(zz.stages[0]!.years[0]!.id).toBe('zz:p1');
    // The Spanish system does not contain the fixture's year, and vice versa.
    expect(findYear(es, 'zz:p1')).toBeNull();
    expect(findYear(zz, 'es:primaria-5')).toBeNull();
    // And a bare id matches nothing, which is what makes a profile portable.
    expect(findYear(zz, 'p1')).toBeNull();
  });

  it('drops a duplicate id rather than letting file order decide', async () => {
    const { loadEducationSystems } = await import('../src/index.js');
    const systems = loadEducationSystems([
      { path: 'a.md', raw: SECOND },
      { path: 'b.md', raw: SECOND.replace('label: Sistema de prueba', 'label: Otro') },
    ]);
    expect(systems).toHaveLength(1);
    expect(systems[0]!.label).toBe('Sistema de prueba');
  });

  /**
   * The honest statement, asserted so it cannot quietly become false: **one** system
   * ships. If a second real one is ever added, this fails and whoever added it has to
   * confirm a teacher of that system has read it.
   */
  it('and exactly one real system ships, because nobody has written a second honestly', async () => {
    const { readdirSync } = await import('node:fs');
    const { join, dirname } = await import('node:path');

    const root = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');
    const files = readdirSync(join(root, 'instructions', 'education'))
      .filter((f) => f.endsWith('.md') && f !== 'README.md');

    expect(files,
      'a second system shipped — has a teacher of that system read it? See 011 T020')
      .toEqual(['es.md']);
  });
});
