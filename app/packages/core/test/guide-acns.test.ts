import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import {
  draftAcns, requireRecordedWork, guideSection, appendGuideSection, hasGuideMeasures,
  GUIDE_HEADING, parseGuideCorpus, type RecordEntry, type Measure,
} from '../src/index.js';

/**
 * The overlay, and the ACNS draft (017 Phases 2 and 4).
 *
 * The claim under test is the one US2 rests on: **an ACNS draft is a rendering of
 * work that already exists, not a generation.** So the assertions are mostly about
 * what is *not* there — no invented section, no interpolated date, and nothing that
 * could be mistaken for a filed document.
 */
const root = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');
const corpus = parseGuideCorpus(readFileSync(join(root, 'instructions', 'guide.md'), 'utf8'));

const entry = (over: Partial<RecordEntry> = {}): RecordEntry => ({
  jobId: 'job-1', learner: 'A1B2', date: '2026-03-03', schoolYear: '2025-2026',
  kind: 'worksheet', signedOff: true, revision: 1,
  source: { of: 'pasted' },
  documents: { ir: 'material/job-1/ir.md', adapted: 'material/job-1/A1B2/adapted.md', revisions: [], rendered: [] },
  missing: [],
  ...over,
});

const base = {
  learnerCode: 'A1B2', year: '5.º de Primaria', stage: 'Primaria',
  sections: corpus.acnsSections, on: '2026-06-12', overlay: null,
};

describe('no recorded work, no draft', () => {
  /** FR-1515, and the argument is the sentence itself. */
  it('declines and says why', () => {
    const said = requireRecordedWork([]);
    expect(said).toContain('formulario rellenado por un modelo de lenguaje');
    // And it says what would unblock it, rather than only refusing.
    expect(said).toContain('Adapta algo primero');
  });

  it('says nothing once there is work', () => {
    expect(requireRecordedWork([entry()])).toBeNull();
  });
});

describe('nothing may look filed', () => {
  /** SC-1506, FR-1502, and it is above the content where it cannot be scrolled past. */
  it('says Séneca is the record, before anything else', () => {
    const { markdown } = draftAcns({ ...base, record: [entry()] });

    expect(markdown).toContain('BORRADOR');
    expect(markdown).toContain('Esto no está presentado');
    expect(markdown).toContain('Séneca');
    expect(markdown.indexOf('Séneca')).toBeLessThan(markdown.indexOf('## Datos del alumno'));
  });

  /** FR-1504. The **tutor** coordinates an ACNS; Rampa must not imply the PT wrote it. */
  it('names the tutor as coordinator and does not claim authorship', () => {
    const { markdown } = draftAcns({ ...base, record: [entry()] });
    expect(markdown).toContain('la coordina el tutor');
    expect(markdown).toContain('Rampa no la ha escrito');
  });

  /** The name never enters a file Rampa writes, and the draft says so rather than blanking. */
  it('leaves the name to her, and says where it goes', () => {
    const { markdown } = draftAcns({ ...base, record: [entry()] });
    expect(markdown).toContain('A1B2');
    expect(markdown).toContain('lo pones tú en Séneca');
  });
});

describe('what cannot be sourced is named, never filled', () => {
  /** FR-1514, and «desfase curricular» is the one that cannot be sourced at all. */
  it('names desfase curricular as hers, with the corpus\'s own reason', () => {
    const { markdown, missing } = draftAcns({ ...base, record: [entry()] });

    expect(missing).toContain('Desfase curricular');
    expect(markdown).toContain('Esto lo tienes que poner tú');
    // The reason comes from `instructions/guide.md`, not from this code.
    expect(markdown).toContain('juicio profesional');
  });

  /**
   * The «partly» pair R3 called interesting. «Del 3 de marzo al 12 de junio» is a
   * fact about work done and **not a plan for a term**, and a document that blurs
   * the two is a document somebody files.
   */
  it('gives what exists for a partial section, and marks the gap', () => {
    const { markdown, missing } = draftAcns({
      ...base,
      record: [entry(), entry({ jobId: 'job-2', date: '2026-05-20' })],
    });

    expect(markdown).toContain('Trabajo realizado entre el 2026-03-03 y el 2026-05-20');
    expect(markdown).toContain('**Falta lo tuyo.**');
    expect(missing).toContain('Temporalización (en parte)');
  });

  it('does not invent a section the corpus added and the code does not know', () => {
    const { markdown, missing } = draftAcns({
      ...base, record: [entry()],
      sections: [{ id: 'algo-nuevo', label: 'Una sección nueva', sourceable: 'full', from: 'De algún sitio.' }],
    });

    // Named as missing rather than assembled from a plausible guess (FR-1514).
    expect(missing).toContain('Una sección nueva');
    expect(markdown).toContain('Esto lo tienes que poner tú');
  });

  it('never dates a section it could not source', () => {
    const { markdown } = draftAcns({ ...base, record: [entry({ date: '' })] });
    // No dates in the record → no temporalización line pretending to have them.
    expect(markdown).not.toContain('Trabajo realizado entre el  y el');
  });
});

describe('what it does assemble traces to something', () => {
  it('groups the material by kind, from the record', () => {
    const { markdown, sources } = draftAcns({
      ...base,
      record: [entry(), entry({ jobId: 'j2', kind: 'exam' }), entry({ jobId: 'j3', kind: 'exam' })],
    });

    expect(markdown).toContain('Pruebas de evaluación: 2 documentos adaptados');
    expect(sources).toContain('el registro del alumno');
  });

  it('lists the recipes only when the caller supplies them', () => {
    const withRecipes = draftAcns({
      ...base, record: [entry(), entry({ jobId: 'j2' })],
      recipesByJob: { 'job-1': ['one-task-per-page'], j2: ['one-task-per-page', 'explicit-steps'] },
    });
    expect(withRecipes.markdown).toContain('one-task-per-page — aplicado en 2 documentos');

    /*
     * And with no reports to read, the section is **named as missing** rather than
     * assembled from nothing. The first version of this file had a stub returning
     * `[]` with a `void e;` to silence the compiler — a no-op pretending to be a
     * data path.
     */
    const without = draftAcns({ ...base, record: [entry()] });
    expect(without.missing).toContain('Metodología');
  });

  it('names the exams\' access arrangements without claiming to have changed the demand', () => {
    const { markdown } = draftAcns({ ...base, record: [entry({ kind: 'exam' })] });
    expect(markdown).toContain('no lo que se pregunta');
  });

  it('says what was delivered, or that nothing was', () => {
    const withPdf = draftAcns({
      ...base,
      record: [entry({ documents: { ...entry().documents, rendered: ['output/job-1/A1B2/sheet.pdf'] } })],
    });
    expect(withPdf.markdown).toContain('PDF para fotocopiar');

    expect(draftAcns({ ...base, record: [entry()] }).markdown)
      .toContain('Todavía no has generado ningún fichero');
  });
});

describe('the overlay section', () => {
  const measures: Measure[] = [
    { text: 'Enunciados de una sola instrucción.', source: 'Apartado 5', actionable: true },
    { text: 'Apoyo del PT tres sesiones semanales.', source: 'Apartado 6', actionable: false },
  ];

  it('separates the measures Rampa applies from the ones it cannot', () => {
    const { markdown } = guideSection({ measures, document: 'el DIAC de marzo', on: '2026-06-12' });

    expect(markdown).toContain('### Medidas');
    expect(markdown).toContain('### Medidas que Rampa no puede aplicar');
    // FR-1510: kept because the document says it, not because Rampa acts on it.
    expect(markdown).toContain('no porque yo haga algo con ellas');
  });

  it('carries each measure\'s citation, so she can check it', () => {
    const { markdown } = guideSection({ measures, document: 'x', on: '2026-06-12' });
    expect(markdown).toContain('*(Apartado 5)*');
  });

  it('repeats the limit on its authority, for the person reading the file', () => {
    const { markdown } = guideSection({ measures, document: 'x', on: '2026-06-12' });
    expect(markdown).toContain('manda sobre las recetas');
    expect(markdown).toContain('No manda sobre las reglas duras');
  });

  it('says what was not kept, in the file and not only on the screen', () => {
    const { markdown } = guideSection({
      measures, document: 'x', on: '2026-06-12',
      omitted: ['He dejado fuera lo que hablaba de «diagnóstico»: eso no lo guardo.'],
    });
    expect(markdown).toContain('### Lo que no he guardado');
  });

  /** FR-1512 keys on the heading, which is why it is not a parameter. */
  it('is recognisable afterwards, by a heading nothing else spells', () => {
    const { markdown } = guideSection({ measures, document: 'x', on: '2026-06-12' });
    expect(markdown.startsWith(GUIDE_HEADING)).toBe(true);
    expect(hasGuideMeasures(markdown)).toBe(true);
    expect(hasGuideMeasures('## Otra cosa\n\nTexto.')).toBe(false);
  });

  /**
   * Appended, never replacing. She may have typed measures by hand — that is what
   * `003` FR-209 has always allowed — and overwriting her words is the defect
   * `006` FR-410 already names.
   */
  it('keeps what she wrote by hand', () => {
    const mine = '# Mis adaptaciones\n\nLe dejo usar la calculadora en clase.';
    const out = appendGuideSection(mine, guideSection({ measures, document: 'x', on: 'y' }).markdown);

    expect(out).toContain('calculadora');
    expect(out.indexOf('calculadora')).toBeLessThan(out.indexOf(GUIDE_HEADING));
  });

  it('and a February DIAC does not retract October\'s', () => {
    const first = guideSection({ measures, document: 'el DIAC de octubre', on: '2025-10-02' }).markdown;
    const second = guideSection({ measures, document: 'el DIAC de febrero', on: '2026-02-11' }).markdown;
    const out = appendGuideSection(appendGuideSection(null, first), second);

    expect(out).toContain('octubre');
    expect(out).toContain('febrero');
  });

  it('says so plainly when a document had no measures at all', () => {
    const { markdown } = guideSection({ measures: [], document: 'x', on: 'y' });
    expect(markdown).toContain('No he encontrado ninguna medida');
  });
});

/**
 * The interface names what it does in the regulation's vocabulary (017 FR-1501).
 *
 * Rampa has been producing **adaptaciones no significativas** since the first
 * worksheet — an ACNS changes methodology, activities, timing and materials and no
 * objective, which is Principle III stated as regulation — and it had never said so.
 *
 * Found on 2026-08-31 by `check-fr-coverage.sh`: FR-1501 was in the spec, in no task,
 * and unbuilt.
 */
describe('an ordinary adaptation says what it is', () => {
  it('names the ACNS, in the report she reads before signing', async () => {
    const { buildReport, parseIR } = await import('../src/index.js');
    const adapted = parseIR(['---', 'lang: es', '---', '',
      '::: {#b1 .exercise data-from="p1" data-recipe="one-task-per-page@1" data-axis="COG"}',
      '1. 47 × 8 =', ':::'].join('\n'));

    /*
     * Whitespace-collapsed: the sentence is hard-wrapped inside a blockquote, so
     * «Ningún objetivo ni criterio de evaluación cambia» spans two lines with a `>` in
     * between. Asserting the raw string failed on its own formatting — the seventh time
     * in this project, and the reason the helper is now written out every time.
     */
    const flat = buildReport({ adapted }).markdown.replace(/^>\s?/gm, '').replace(/\s+/g, ' ');

    expect(flat).toContain('adaptación curricular no significativa (ACNS)');
    // And the limit, which is the other half of naming it.
    expect(flat).toContain('Ningún objetivo ni criterio de evaluación cambia');
    expect(flat).toContain('no la decide una herramienta');
  });

  /** SC-1506: nothing Rampa produces may be mistaken for a filed document. */
  it('says Séneca is the register in the same breath', async () => {
    const { buildReport, parseIR } = await import('../src/index.js');
    const flat = buildReport({
      adapted: parseIR(['---', '---', '', '::: {#b1 .exercise}', 'x', ':::'].join('\n')),
    }).markdown.replace(/^>\s?/gm, '').replace(/\s+/g, ' ');

    expect(flat).toContain('Esto no está registrado');
    expect(flat).toContain('Séneca');
    // The tutor coordinates an ACNS — Rampa must not imply the PT authored it.
    expect(flat).toContain('la coordina el tutor');
  });

  it('says it before anything it changed', async () => {
    const { buildReport, parseIR } = await import('../src/index.js');
    const { markdown } = buildReport({
      adapted: parseIR(['---', '---', '',
        '::: {#b1 .exercise data-from="p1" data-recipe="one-task-per-page@1" data-axis="COG"}',
        'x', ':::'].join('\n')),
    });

    expect(markdown.indexOf('ACNS')).toBeLessThan(markdown.indexOf('one-task-per-page'));
  });
});
