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
  sections: corpus.draftSections, on: '2026-06-12', overlay: null,
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
  /**
   * FR-1514, and «desfase curricular» is the one Rampa must not draft.
   *
   * ## Updated 2026-09-05, in the commit that made the section `partial` (`032` FR-3004)
   *
   * The claim has not been weakened; it has been split, because a fact appeared that did
   * not exist before. What Rampa still refuses to write is the **desfase the regulation
   * asks for** — that comes from a psycho-pedagogical evaluation, and the corpus's own
   * sentence still says so beneath whatever the draft prints.
   *
   * What it may now order is the note **she herself** made about the curricular level of
   * that área, attributed to her in as many words. A profile note printed as the
   * conclusion of an evaluation would be falsifying the *what* (Principle III), so the
   * two assertions below are the ones that matter: her sentence says «tú tienes
   * apuntado», and the «lo pones tú» line survives regardless.
   */
  it('never drafts the desfase itself, and says who has to', () => {
    const { markdown, missing } = draftAcns({ ...base, record: [entry()] });

    // Nothing recorded ⇒ exactly the old behaviour: named as missing, left empty.
    expect(missing).toContain('Desfase curricular');
    expect(markdown).toContain('Esto lo tienes que poner tú');
    // The reason comes from `instructions/guide.md`, not from this code.
    expect(markdown).toContain('evaluación psicopedagógica');
  });

  it('and when she has recorded a level, it is printed as hers, not as a finding', () => {
    const { markdown, missing } = draftAcns({
      ...base, record: [entry()], subject: 'Matemáticas',
      desfase: { cur: 2, fromPair: true },
    });

    expect(markdown).toContain('Tú tienes apuntado');
    expect(markdown).toContain('Matemáticas');
    expect(markdown).toContain('con contenidos de cursos anteriores');
    /*
     * And the section is **still** flagged as needing her, because what is printed is
     * her note and not the desfase. `partial` is exactly that pair: what exists, plus a
     * marked gap.
     */
    expect(missing).toContain('Desfase curricular (en parte)');
    expect(markdown).toContain('evaluación psicopedagógica');
  });

  it('and the general standing in for an unassessed área says so', () => {
    const { markdown } = draftAcns({
      ...base, record: [entry()], subject: 'Inglés',
      desfase: { cur: 2, fromPair: false },
    });
    /*
     * The sharpest case in the whole feature: an ACNS is a document somebody signs, and
     * a general value quietly presented as this área's observation is a claim about a
     * child that nobody made.
     */
    expect(markdown).toContain('No tienes nada apuntado para **Inglés**');
    expect(markdown).toContain('en general');
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

/**
 * The overlay records which kind of document it was (decision P12, review FLU-05).
 *
 * ## Why this one line matters
 *
 * `readGuide` has always worked the kind out — the screen renders «esto parece una
 * adaptación significativa» from it — and it **stopped there**. The overlay recorded
 * the document in her words («el DIAC de marzo») and not what it was, so the one
 * fact that tells a later adaptation it may work at a modified level never reached
 * the file the model reads.
 *
 * The consequence, with the old profile-keyed stop: a learner whose ACS had **already
 * been approved by his teaching team**, on a psychopedagogical assessment, got the
 * same refusal as one with no assessment at all. The decision had been taken by the
 * people whose decision it is, and the application would not act on it.
 */
describe('the overlay says what kind of document it came from', () => {
  const measures = [
    { text: 'Letra grande', source: 'p. 3', actionable: true },
  ] as never;

  it('names an ACS, and says adapting to that level is right', () => {
    const { markdown } = guideSection({
      measures, document: 'la ACS de marzo', on: '2026-03-01', kind: 'acs',
    });
    expect(markdown).toContain('**ACS**');
    expect(markdown).toMatch(/objetivos ya están modificados/);
    // And the limit stays: it does not authorise modifying an objective the ACS
    // does not name.
    expect(markdown).toMatch(/que esta ACS no nombre/);
  });

  it('names an ACNS, and says what it does and does not touch', () => {
    const { markdown } = guideSection({
      measures, document: 'la ACNS del tutor', on: '2026-03-01', kind: 'acns',
    });
    expect(markdown).toContain('**ACNS**');
    expect(markdown).toMatch(/no modifica ningún objetivo/);
  });

  it('says neither when the reading could not tell', () => {
    /*
     * `unknown` is a real answer and not a missing one. Recording a document as an
     * ACS because the classifier was unsure would unblock a modified level on no
     * evidence — which is the worst direction for this particular field to be
     * wrong in.
     */
    const { markdown } = guideSection({
      measures, document: 'un documento', on: '2026-03-01',
    });
    expect(markdown).not.toContain('**ACS**');
    expect(markdown).not.toContain('**ACNS**');
  });

  it('keeps the limit on its authority whatever the kind', () => {
    for (const kind of ['acs', 'acns', undefined] as const) {
      const { markdown } = guideSection({
        measures, document: 'x', on: '2026-03-01', ...(kind ? { kind } : {}),
      });
      expect(markdown, `${kind}`).toMatch(/No manda sobre las reglas duras/);
    }
  });
});
