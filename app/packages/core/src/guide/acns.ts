import { acnsHeader } from './acns-document.js';
import type { RecordEntry } from '../record/entry.js';
import type { AcnsSection } from './corpus.js';
import { hasGuideMeasures } from './overlay.js';

/**
 * Drafting the ACNS Rampa has been writing all along
 * (017 T019-T022, FR-1513…1517, research R3).
 *
 * ## Why Rampa is entitled to help with this one
 *
 * An **ACNS changes no objective and no criterio de evaluación** — it changes
 * methodology, activities, timing, materials and assessment instruments. That is
 * exactly the line Principle III already refuses to cross, and exactly what every
 * adaptation report in the vault already records: the recipe applied, the axis that
 * justified it, the blocks it touched, and what was not done and why.
 *
 * So this is a **rendering of work that exists**, not a generation. The distinction
 * is the whole feature: nothing here asks a model for a sentence.
 *
 * ## What R3 found when that claim was checked
 *
 * Four sections are sourceable from `014`'s record, two are partly, and one is not at
 * all. The «partly» ones are the interesting pair:
 *
 * - **Temporalización** — the dates say *when work happened*. They do not say what
 *   she plans for the term, and a document that blurs the two is a document somebody
 *   files.
 * - **Instrumentos de evaluación** — the adapted exams and the access arrangements
 *   named (`019` FR-1718). Missing whatever she uses that Rampa never saw.
 *
 * **Desfase curricular** is not sourceable at all: it is a professional judgement
 * from an evaluation, and Rampa has nothing to build it from. Named as missing.
 *
 * ## And nothing is interpolated
 *
 * FR-1514. A drafted section nobody can source is a form filled in by a language
 * model — which is FR-1515's own wording for the no-recorded-work case, and it
 * applies per section as well as per learner.
 */

export interface AcnsInput {
  /** Her label for the learner. The **code** is what goes in the document. */
  learnerCode: string;
  /** Course and stage, from `011`, in her words. */
  year?: string;
  stage?: string;
  subject?: string;
  /** Everything ever made for this learner (`014`). */
  record: readonly RecordEntry[];
  /** Her overlay, verbatim. Where a measure from a guide already lives. */
  overlay: string | null;
  /**
   * Job id → the recipe ids its report records.
   *
   * Supplied by the caller because the recipes live in each `report.md` and `core`
   * does not read files. The first version of this function had a `recipesIn()` that
   * returned `[]` with a `void e;` to silence the compiler — a no-op pretending to be
   * a data path, which is the exact decoration this project has already had to
   * remove once. If the caller has no reports to offer, `metodologia` is named as
   * missing, which is the honest outcome and the one FR-1514 asks for.
   */
  recipesByJob?: Readonly<Record<string, readonly string[]>>;
  /** The sections the regulation requires, from the corpus (FR-1517). */
  sections: readonly AcnsSection[];
  /** Passed in, never read from a clock (Principle II). */
  on: string;
}

export interface AcnsDraft {
  markdown: string;
  /** Sections Rampa could not source, named rather than filled (FR-1514). */
  missing: string[];
  /** Every line in the draft traces to one of these. SC-1503's evidence. */
  sources: string[];
}

/**
 * No recorded work, no draft (FR-1515).
 *
 * Returns the sentence rather than a boolean, because «cannot» is only useful if it
 * says why — and the why is the argument: a draft assembled from nothing is a form
 * filled in by a language model, with a school's letterhead on it.
 */
export function requireRecordedWork(record: readonly RecordEntry[]): string | null {
  if (record.length > 0) return null;
  return 'Todavía no he adaptado nada para este alumno, así que no tengo con qué '
    + 'redactar la ACNS. Un borrador hecho de nada es un formulario rellenado por un '
    + 'modelo de lenguaje, y lo firmarías tú. Adapta algo primero y vuelve.';
}

export function draftAcns(input: AcnsInput): AcnsDraft {
  const missing: string[] = [];
  const sources: string[] = [];
  const md: string[] = [];

  /*
   * The mark and the disclaimer first (FR-1502, FR-1516, SC-1506).
   *
   * A document that *looks* filed invites somebody to file it, and an ACNS is
   * coordinated by the **tutor** — so the draft must not imply the PT wrote it
   * (FR-1504). Both facts go above the content, where they cannot be scrolled past.
   */
  md.push(
    ...acnsHeader(false),
    '',
    `Alumno: **${input.learnerCode}**`
    + `${input.year ? ` · Curso: ${input.year}` : ''}`
    + `${input.stage ? ` · Etapa: ${input.stage}` : ''}`
    + `${input.subject ? ` · Área: ${input.subject}` : ''}`,
    '',
    `Ordenado por Rampa el ${input.on}, a partir de ${input.record.length} `
    + `${input.record.length === 1 ? 'trabajo registrado' : 'trabajos registrados'}.`,
    '',
  );

  for (const section of input.sections) {
    const built = sectionBody(section, input);

    if (built === null) {
      /*
       * Named, not filled. And the corpus's own `from` is what she reads — the
       * reason a section cannot be sourced is judgement, so it lives in
       * `instructions/guide.md` beside the section it belongs to.
       */
      missing.push(section.label);
      md.push(`## ${section.label}`, '',
        `**Esto lo tienes que poner tú.** ${section.from}`, '');
      continue;
    }

    md.push(`## ${section.label}`, '', ...built.lines, '');
    sources.push(...built.sources);

    if (section.sourceable === 'partial') {
      // What exists, plus a marked gap. The pair R3 called interesting.
      md.push(`**Falta lo tuyo.** ${section.from}`, '');
      missing.push(`${section.label} (en parte)`);
    }
  }

  return { markdown: md.join('\n'), missing, sources };
}

/** One section, or `null` where nothing can source it. */
function sectionBody(
  section: AcnsSection, input: AcnsInput,
): { lines: string[]; sources: string[] } | null {
  if (section.sourceable === 'none') return null;

  switch (section.id) {
    case 'datos':
      return {
        lines: [
          `- Código: ${input.learnerCode}`,
          ...(input.year ? [`- Curso: ${input.year}`] : []),
          ...(input.stage ? [`- Etapa: ${input.stage}`] : []),
          /*
           * The name is not here, and that is not an omission to apologise for: it
           * never enters a file Rampa writes. She writes it in Séneca, where it
           * belongs.
           */
          '- Nombre: *lo pones tú en Séneca — yo no lo guardo.*',
        ],
        sources: ['el perfil'],
      };

    case 'metodologia': {
      const byRecipe = new Map<string, { count: number; when: string[] }>();
      for (const e of input.record) {
        for (const id of input.recipesByJob?.[e.jobId] ?? []) {
          const seen = byRecipe.get(id) ?? { count: 0, when: [] };
          seen.count += 1;
          if (e.date && !seen.when.includes(e.date)) seen.when.push(e.date);
          byRecipe.set(id, seen);
        }
      }

      if (byRecipe.size === 0 && !hasGuideMeasures(input.overlay)) return null;

      const lines = [...byRecipe.entries()]
        .sort((a, b) => b[1].count - a[1].count)
        .map(([id, seen]) => `- ${id} — aplicado en ${seen.count} `
          + `${seen.count === 1 ? 'documento' : 'documentos'}`
          + `${seen.when.length ? ` (${seen.when.sort()[0]} a ${seen.when.sort().at(-1)})` : ''}`);

      if (hasGuideMeasures(input.overlay)) {
        // FR-1512's other side: the report distinguishes them, and so does this.
        lines.push('- Y las medidas de la adaptación curricular oficial, que están en '
          + 'su fichero de adaptaciones y mandan sobre lo anterior.');
      }

      return { lines, sources: ['los informes de adaptación', 'el fichero de adaptaciones'] };
    }

    case 'actividades': {
      if (input.record.length === 0) return null;
      const byKind = new Map<string, number>();
      for (const e of input.record) byKind.set(e.kind, (byKind.get(e.kind) ?? 0) + 1);
      return {
        lines: [...byKind.entries()].map(([kind, n]) =>
          `- ${KIND_ES[kind] ?? kind}: ${n} ${n === 1 ? 'documento adaptado' : 'documentos adaptados'}`),
        sources: ['el registro del alumno'],
      };
    }

    case 'materiales': {
      if (input.record.length === 0) return null;
      const rendered = new Set<string>();
      for (const e of input.record) {
        for (const path of e.documents.rendered) {
          const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
          if (MODALITY_ES[ext]) rendered.add(MODALITY_ES[ext]!);
        }
      }
      return {
        lines: [
          `- Material adaptado documento a documento (${input.record.length} en total).`,
          ...(rendered.size
            ? [`- Entregado como: ${[...rendered].sort().join(', ')}.`]
            : ['- *Todavía no has generado ningún fichero para entregar.*']),
        ],
        sources: ['el registro del alumno'],
      };
    }

    case 'temporalizacion': {
      const dates = input.record.map((e) => e.date).filter(Boolean).sort();
      if (dates.length === 0) return null;
      const years = [...new Set(input.record.map((e) => e.schoolYear).filter(Boolean))];
      return {
        lines: [
          `- Trabajo realizado entre el ${dates[0]} y el ${dates.at(-1)}.`,
          ...(years.length ? [`- Curso escolar: ${years.sort().join(', ')}.`] : []),
        ],
        sources: ['las fechas del registro'],
      };
    }

    case 'evaluacion': {
      const exams = input.record.filter((e) => e.kind === 'exam');
      if (exams.length === 0) return null;
      return {
        lines: [
          `- ${exams.length} ${exams.length === 1 ? 'prueba adaptada' : 'pruebas adaptadas'}, `
          + 'cambiando la vía de acceso y de respuesta y no lo que se pregunta.',
          '- Las adaptaciones de acceso están nombradas como tales en cada informe.',
        ],
        sources: ['los informes de las pruebas adaptadas'],
      };
    }

    default:
      /*
       * A section the corpus added and this code does not know how to build.
       *
       * **Named as missing, never guessed.** The alternative — assembling something
       * plausible from the record — is the interpolation FR-1514 forbids, and it
       * would arrive silently the day somebody adds a section to the Markdown.
       */
      return null;
  }
}

const KIND_ES: Record<string, string> = {
  worksheet: 'Fichas y ejercicios', exam: 'Pruebas de evaluación',
  study: 'Textos de estudio', problems: 'Hojas de problemas',
  generated: 'Material generado a partir de objetivos', material: 'Material',
};

const MODALITY_ES: Record<string, string> = {
  pdf: 'PDF para fotocopiar', html: 'página para pantalla',
  odt: 'documento editable', txt: 'texto en orden de lectura',
};
