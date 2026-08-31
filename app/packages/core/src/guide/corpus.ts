import { parseFrontMatter } from '../vault/parse.js';
import { logger } from '../log.js';

/**
 * The guide corpus (017 T002/T005/T006/T007, FR-1517).
 *
 * Three lists that are judgement rather than logic, so all three are Markdown a PT
 * can correct without touching TypeScript (Principle I):
 *
 * - **which Spanish terms are clinical** — and a DIAC from another comunidad will
 *   use words this list does not have, which is precisely why it is editable;
 * - **the sections the regulation requires**, because a change in Séneca must be a
 *   Markdown edit and not a release;
 * - **the phrasings that constitute a proposal about objectives**, which is the one
 *   list whose incompleteness is stated in the file itself.
 *
 * ## Every fallback here fails *closed*
 *
 * An empty clinical list means nothing is filtered, and a diagnosis reaches the
 * vault. An empty proposal list means every answer is shown. Both are the failure
 * the feature exists to prevent, arriving through a corpus edit rather than through
 * code — so a list that fails to load falls back to a built-in minimum and logs.
 */

export interface AcnsSection {
  id: string;
  label: string;
  /** `full`, `partial` or `none` — can Rampa source it from what it has? */
  sourceable: 'full' | 'partial' | 'none';
  /** Where it comes from, or why it cannot be sourced. Shown to her verbatim. */
  from: string;
}

export interface GuideCorpus {
  clinicalTerms: string[];
  acnsSections: AcnsSection[];
}

/**
 * The minimum, used only when the corpus file cannot be read.
 *
 * Deliberately the terms whose presence in a vault would be least defensible, not a
 * short version of the list — a fallback that filters «percentil» and not
 * «diagnóstico» would be worse than an obvious failure.
 */
export const MINIMUM_CLINICAL: string[] = [
  'diagnóstico', 'diagnostico', 'trastorno', 'síndrome', 'sindrome',
  'discapacidad intelectual', 'evaluación psicopedagógica', 'evaluacion psicopedagogica',
  'informe psicopedagógico', 'informe psicopedagogico', 'dictamen de escolarización',
  'coeficiente intelectual', 'medicación', 'medicacion', 'historia clínica',
  'TDAH', 'TEA', 'NEE',
];

export function parseGuideCorpus(raw: string, file = 'instructions/guide.md'): GuideCorpus {
  const { data } = parseFrontMatter(raw, file);

  const clinicalTerms = strings(data['clinical_terms']);
  if (clinicalTerms.length === 0) {
    logger.error('guide.no-clinical-terms', { file });
  }

  const acnsSections: AcnsSection[] = (Array.isArray(data['acns_sections']) ? data['acns_sections'] : [])
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const e = entry as Record<string, unknown>;
      const id = str(e['id']);
      const label = str(e['label']);
      const sourceable = str(e['sourceable']);
      if (!id || !label) return null;
      if (sourceable !== 'full' && sourceable !== 'partial' && sourceable !== 'none') {
        // A section whose sourceability is unreadable is treated as **none**: it
        // gets named as missing rather than assembled from a guess.
        logger.warn('guide.section-sourceable-unreadable', { file, id, value: sourceable });
        return { id, label, sourceable: 'none' as const, from: str(e['from']) };
      }
      return { id, label, sourceable, from: str(e['from']) };
    })
    .filter((s): s is AcnsSection => s !== null);

  if (acnsSections.length === 0) logger.error('guide.no-sections', { file });

  return {
    clinicalTerms: clinicalTerms.length > 0 ? clinicalTerms : MINIMUM_CLINICAL,
    acnsSections,
  };
}

/** The one sentence Rampa declines with, and the phrasings it refuses to show. */
export interface AcsCorpus {
  decline: string;
  proposalPhrases: string[];
}

export const MINIMUM_DECLINE =
  'Eso no lo decido yo. Qué objetivos y qué criterios se modifican lo decide el '
  + 'equipo docente con Orientación, a partir de la evaluación psicopedagógica.';

export const MINIMUM_PROPOSAL_PHRASES: string[] = [
  'te propongo quitar', 'te propongo eliminar', 'yo quitaría', 'yo eliminaría',
  'deberías quitar', 'deberías eliminar', 'habría que quitar', 'recomiendo eliminar',
  'se puede prescindir de', 'objetivos prescindibles',
];

export function parseAcsCorpus(raw: string, file = 'instructions/acs.md'): AcsCorpus {
  const { data } = parseFrontMatter(raw, file);

  const phrases = strings(data['proposal_phrases']);
  if (phrases.length === 0) logger.error('acs.no-proposal-phrases', { file });

  const decline = str(data['decline']);

  return {
    decline: decline || MINIMUM_DECLINE,
    proposalPhrases: phrases.length > 0 ? phrases : MINIMUM_PROPOSAL_PHRASES,
  };
}

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const strings = (v: unknown): string[] =>
  (Array.isArray(v) ? v : []).filter((x): x is string => typeof x === 'string' && x.trim() !== '')
    .map((x) => x.trim());
