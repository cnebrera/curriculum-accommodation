import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import {
  readGuide, clinicalTermIn, whyNotOurs, parseGuideCorpus, parseAcsCorpus,
  checkDeclines, requireEvaluation, MINIMUM_CLINICAL, MINIMUM_PROPOSAL_PHRASES,
  type Candidate,
} from '../src/index.js';

/**
 * The clinical filter and the ACS refusals (017 Phase 1, SC-1502, SC-1507).
 *
 * Written **before** anything extracts, because a filter added after the flow works
 * is a filter written to fit what already happens — the argument `018` T001 proved by
 * finding a real licence defect on its first run.
 *
 * ## The fixture is synthetic, and that is a constraint not a shortcut
 *
 * [ADR 0002](../../../docs/decisions/0002-no-clinical-material.md) forbids real
 * clinical material in this repository. The DIAC below is invented — and the
 * constraint is what makes it arguable in public: anybody can read what is being
 * filtered and say it is wrong.
 */
const root = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');
const guide = parseGuideCorpus(readFileSync(join(root, 'instructions', 'guide.md'), 'utf8'));
const acs = parseAcsCorpus(readFileSync(join(root, 'instructions', 'acs.md'), 'utf8'));

/** A synthetic DIAC, with the shape of a real one and none of its content. */
const DIAC: Candidate[] = [
  { text: 'Diagnóstico: trastorno del espectro autista, nivel 1.', source: 'Apartado 2' },
  { text: 'La evaluación psicopedagógica de marzo sitúa el desfase en dos cursos.', source: 'Apartado 2' },
  { text: 'Coeficiente intelectual en el percentil 12 según WISC-V.', source: 'Apartado 2' },
  { text: 'Situación familiar: convive con la abuela materna.', source: 'Apartado 1' },
  { text: 'Enunciados de una sola instrucción por frase.', source: 'Apartado 5' },
  { text: 'Tiempo adicional en las pruebas escritas: un 50 % más.', source: 'Apartado 5' },
  { text: 'Material impreso con tipografía de 14 puntos y doble espacio.', source: 'Apartado 5' },
  { text: 'Apoyo del PT tres sesiones semanales en aula de apoyo.', source: 'Apartado 6' },
  { text: 'Coordinación con la familia una vez al trimestre.', source: 'Apartado 6' },
];

describe('no diagnosis reaches the vault', () => {
  /** **SC-1502.** The one this whole phase exists for. */
  it('keeps not a single clinical line among the measures', () => {
    const { measures } = readGuide(DIAC, guide);
    const text = measures.map((m) => m.text).join(' | ');

    for (const term of ['Diagnóstico', 'trastorno del espectro', 'psicopedagógica',
      'Coeficiente intelectual', 'WISC', 'percentil', 'Situación familiar', 'abuela']) {
      expect(text, `«${term}» survived the filter`).not.toContain(term);
    }
  });

  it('keeps the measures that are measures', () => {
    const { measures } = readGuide(DIAC, guide);
    expect(measures.map((m) => m.text)).toEqual([
      'Enunciados de una sola instrucción por frase.',
      'Tiempo adicional en las pruebas escritas: un 50 % más.',
      'Material impreso con tipografía de 14 puntos y doble espacio.',
      'Apoyo del PT tres sesiones semanales en aula de apoyo.',
      'Coordinación con la familia una vez al trimestre.',
    ]);
  });

  /** FR-1508. A silent filter makes the overlay a partial record she trusts. */
  it('says what it left out, in words, and never as a count', () => {
    const { omitted } = readGuide(DIAC, guide);

    expect(omitted.length).toBeGreaterThan(0);
    expect(omitted.join(' ')).toContain('He dejado fuera');
    // Not «3 elementos omitidos», which is a number she cannot check.
    expect(omitted.join(' ')).not.toMatch(/^\d+ /);
  });

  /**
   * The sentence naming the omission must not **be** the omission.
   *
   * Quoting the filtered line would put the diagnosis in the interface — the same
   * leak, one screen further on.
   */
  it('does not quote the line it filtered', () => {
    const { omitted } = readGuide(DIAC, guide);
    const said = omitted.join(' ');
    expect(said).not.toContain('espectro autista');
    expect(said).not.toContain('percentil 12');
    expect(said).not.toContain('abuela');
  });

  it('collapses four clinical lines into the reasons, not into four sentences', () => {
    // «diagnóstico» four times is one thing to tell her about.
    const repeated: Candidate[] = Array.from({ length: 4 },
      () => ({ text: 'Diagnóstico: algo.', source: 'x' }));
    expect(readGuide(repeated, guide).omitted).toHaveLength(1);
  });
});

describe('the term matcher, which must not be clever', () => {
  it('folds accents and case', () => {
    expect(clinicalTermIn('DIAGNOSTICO del alumno', guide.clinicalTerms)).toBeTruthy();
    expect(clinicalTermIn('diagnóstico', guide.clinicalTerms)).toBeTruthy();
  });

  /**
   * The reason `match.ts` says «nothing further is inferred». A clever matcher fires
   * on «ciencias» for `CI` and on «teatro» for `TEA`, and a filter that flags
   * ordinary sentences is a filter somebody switches off.
   */
  it('does not fire on a word that merely contains a term', () => {
    for (const line of [
      'Trabaja bien en ciencias naturales.',
      'Le gusta el teatro y la música.',
      'Necesita neeeecesita — una errata en el documento.',
      'La tarea de tecnología la hace sola.',
    ]) {
      expect(clinicalTermIn(line, guide.clinicalTerms), line).toBeNull();
    }
  });

  it('matches a multi-word term as a phrase', () => {
    expect(clinicalTermIn('Presenta discapacidad intelectual leve.', guide.clinicalTerms))
      .toBe('discapacidad intelectual');
    // And not when only one of its words is there.
    expect(clinicalTermIn('Es una tarea intelectual exigente.', guide.clinicalTerms)).toBeNull();
  });
});

describe('a measure Rampa cannot act on is kept and marked', () => {
  /** FR-1510. Dropping it makes the overlay say less than the document says. */
  it('marks the ones that are not ours, without dropping them', () => {
    const { measures } = readGuide(DIAC, guide);
    const byText = new Map(measures.map((m) => [m.text, m]));

    expect(byText.get('Apoyo del PT tres sesiones semanales en aula de apoyo.')?.actionable)
      .toBe(false);
    expect(byText.get('Coordinación con la familia una vez al trimestre.')?.actionable)
      .toBe(false);
    expect(byText.get('Enunciados de una sola instrucción por frase.')?.actionable)
      .toBe(true);
  });

  it('says why, in her words', () => {
    expect(whyNotOurs('Apoyo del PT tres sesiones semanales.')).toContain('horario');
    expect(whyNotOurs('Enunciados de una sola instrucción.')).toBeNull();
  });

  it('keeps the citation, so she can check it against the document', () => {
    const { measures } = readGuide(DIAC, guide);
    expect(measures[0]!.source).toBe('Apartado 5');
    // A measure with no citation says so rather than pretending to one.
    expect(readGuide([{ text: 'Algo.', source: '' }], guide).measures[0]!.source)
      .toBe('sin indicar');
  });
});

describe('the corpus fails closed', () => {
  /**
   * An empty clinical list means nothing is filtered and a diagnosis reaches the
   * vault: the failure this feature exists to prevent, arriving through a corpus
   * edit rather than through code.
   */
  it('falls back to a minimum rather than filtering nothing', () => {
    const empty = parseGuideCorpus('---\nclinical_terms: []\n---\n\n# x\n', 'test.md');
    expect(empty.clinicalTerms).toEqual(MINIMUM_CLINICAL);
    expect(clinicalTermIn('Diagnóstico: algo.', empty.clinicalTerms)).toBeTruthy();
  });

  it('and the ACS list too, rather than showing every answer', () => {
    const empty = parseAcsCorpus('---\ndecline: ""\n---\n\n# x\n', 'test.md');
    expect(empty.proposalPhrases).toEqual(MINIMUM_PROPOSAL_PHRASES);
    expect(empty.decline).toContain('no lo decido yo');
  });

  it('a section whose sourceability is unreadable is treated as not sourceable', () => {
    // Named as missing rather than assembled from a guess.
    const odd = parseGuideCorpus(
      '---\nclinical_terms: [x]\nacns_sections:\n  - id: a\n    label: A\n    sourceable: quizá\n---\n\n# x\n',
      'test.md');
    expect(odd.acnsSections[0]!.sourceable).toBe('none');
  });

  it('the shipped corpus carries both lists', () => {
    expect(guide.clinicalTerms.length).toBeGreaterThan(20);
    expect(guide.acnsSections.length).toBeGreaterThan(5);
    expect(acs.proposalPhrases.length).toBeGreaterThan(10);
    /*
     * And the section Rampa must not write for her.
     *
     * Was «at least one section is `sourceable: none`», which `desfase` satisfied. On
     * 2026-09-05 it became `partial` (`032` FR-3004): Rampa may now order the note **she
     * herself** made about that área's curricular level, and still may not draft the
     * desfase, which comes from a psycho-pedagogical evaluation.
     *
     * So the assertion names the section instead of counting shapes — which is stronger,
     * not weaker: «some section is none» was satisfiable by any section at all, and
     * would have kept passing if `desfase` had quietly become `full`.
     */
    const desfase = guide.acnsSections.find((s) => s.id === 'desfase');
    expect(desfase, 'the regulation asks for it, so the corpus must know it').toBeDefined();
    expect(desfase!.sourceable).not.toBe('full');
    expect(desfase!.from).toContain('evaluación psicopedagógica');
    expect(desfase!.from).toContain('lo pones tú');
  });
});

describe('Rampa never proposes what to remove', () => {
  /** FR-1523/1525. The failure is a curriculum reduced because a tool suggested it. */
  it('refuses to show an answer that proposes removing an objective', () => {
    for (const answer of [
      'Te propongo quitar el objetivo 4, que es el menos importante.',
      'Yo eliminaría los criterios de evaluación 3 y 5.',
      'Se puede prescindir de dos objetivos del bloque de geometría.',
      'Habría que quitar el objetivo sobre fracciones.',
      'Quita el objetivo 4 y sustitúyelo por uno de primero.',
      'Reduce el criterio de evaluación a la mitad.',
    ]) {
      const v = checkDeclines(answer, acs);
      expect(v.ok, answer).toBe(false);
      if (!v.ok) expect(v.say).toContain('lo decide el equipo docente');
    }
  });

  /**
   * The sentence that declines contains «objetivos» and «quitar», so a document-wide
   * search for both would refuse Rampa's own refusal.
   */
  it('does not refuse its own decline', () => {
    expect(checkDeclines(acs.decline, acs).ok).toBe(true);
    expect(checkDeclines(
      'No te voy a decir qué objetivos quitar: eso lo decide el equipo docente.', acs).ok)
      .toBe(true);
  });

  it('lets ordinary help through', () => {
    for (const answer of [
      'La sección de metodología está incompleta: no dice cómo se le presentan las tareas.',
      'Los objetivos que has decidido modificar los puedes redactar así: …',
      'El documento no dice quién lo firma. Una ACS la redacta el PT.',
      'Falta la temporalización. ¿En qué trimestres lo has planificado?',
    ]) {
      expect(checkDeclines(answer, acs).ok, answer).toBe(true);
    }
  });

  /** The bound, asserted so nobody reads more into SC-1507 than it says. */
  it('says in the corpus that the list is not every phrasing', () => {
    /*
     * Comment markers stripped as well as whitespace collapsed. The sentence is a
     * YAML comment wrapped over two lines, so collapsing whitespace alone leaves the
     * `#` of the continuation in the middle of it — my first version asserted the
     * un-stripped string and failed on its own formatting.
     */
    const raw = readFileSync(join(root, 'instructions', 'acs.md'), 'utf8')
      .replace(/^\s*#\s?/gm, '').replace(/\s+/g, ' ');
    expect(raw).toContain('LÍMITE HONESTO');
    expect(raw).toContain('No es todo lo que un modelo podría escribir');
  });
});

describe('no evaluation, no ACS', () => {
  /** FR-1524, and it does not draft around it. */
  it('says why, and what would unblock it', () => {
    const said = requireEvaluation(false);
    expect(said).toContain('nula de procedimiento');
    expect(said).toContain('No voy a redactarla igualmente');
    // And leaves her a way forward that is not «lie to me».
    expect(said).toContain('dímelo y sigo');
  });

  it('says nothing when it is recorded', () => {
    expect(requireEvaluation(true)).toBeNull();
  });
});

describe('which document it is', () => {
  it('reads the kind where the document says', () => {
    expect(readGuide([], guide, { declaredKind: 'Adaptación curricular no significativa' }).kind)
      .toBe('acns');
    expect(readGuide([], guide, { declaredKind: 'Adaptación curricular significativa' }).kind)
      .toBe('acs');
    expect(readGuide([], guide, { declaredKind: 'DIAC' }).kind).toBe('acs');
  });

  /**
   * «no significativa» contains «significativa». Getting this backwards would treat
   * every ACNS as an ACS and demand a psychopedagogical evaluation for a document
   * that does not need one.
   */
  it('does not read «no significativa» as significativa', () => {
    expect(readGuide([], guide, { declaredKind: 'ACNS — no significativa' }).kind).toBe('acns');
  });

  it('is unknown when nothing says, rather than guessing', () => {
    // A DIAC from another comunidad has a different shape, and it is still hers.
    expect(readGuide([], guide).kind).toBe('unknown');
  });
});

/**
 * Every corpus file with a front matter block actually parses (017, and a lesson).
 *
 * `guide.md` shipped for ten minutes with **no closing `---`**. `parseFrontMatter`
 * returns `{}` with no repair recorded when the delimiter is missing — correctly, since
 * plenty of files legitimately have no front matter — so the header was simply
 * invisible and every list fell back to its built-in minimum.
 *
 * The fail-closed design is what caught it: the fallback logs, and the test asserting
 * the shipped list has more than twenty terms failed. But that only covers the files
 * somebody wrote a test for. This covers all of them.
 */
describe('every corpus file that has a header can read it', () => {
  it('parses, and the header is not silently empty', async () => {
    const { readdirSync, statSync } = await import('node:fs');
    const { parseFrontMatter } = await import('../src/index.js');

    const walk = (dir: string): string[] => readdirSync(dir).flatMap((e) => {
      const p = join(dir, e);
      return statSync(p).isDirectory() ? walk(p) : (p.endsWith('.md') ? [p] : []);
    });

    const files = [...walk(join(root, 'instructions')), ...walk(join(root, 'recipes'))];
    const broken: string[] = [];

    for (const f of files) {
      const raw = readFileSync(f, 'utf8');
      // Only files that *claim* a header. A README with no front matter is fine.
      if (!raw.startsWith('---\n')) continue;
      const { data } = parseFrontMatter(raw, f);
      if (Object.keys(data).length === 0) broken.push(f.slice(root.length + 1));
    }

    expect(files.length).toBeGreaterThan(10);
    expect(broken, 'a corpus file opens a header it never closes, or the YAML is invalid')
      .toEqual([]);
  });
});
