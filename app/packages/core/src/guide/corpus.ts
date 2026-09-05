import { parseFrontMatter } from '../vault/parse.js';
import { logger } from '../log.js';

/**
 * The generic guide corpus — the base layer, the one that is always sent
 * (017 T002/T005/T006/T007, FR-1517; rewritten generic by 029 T004, FR-2703).
 *
 * Four things that are judgement rather than logic, so all four are Markdown a PT
 * can correct without touching TypeScript (Principle I):
 *
 * - **which Spanish terms are clinical** — the *base* list, the one that is true
 *   everywhere. A territory's own words are added by its normative corpus's
 *   `clinical_terms_extra`, which can only add;
 * - **the sections of the generic draft** — deliberately not any regulation's
 *   section list, but what Rampa can actually source from the record. A selected
 *   corpus's document sections replace them, because which sections a document
 *   requires is exactly what varies between territories;
 * - **the printed sentences**, in territory-neutral wording («tu plataforma de
 *   registro»). Four of these used to be string literals in TypeScript naming one
 *   community's platform — a latent Principle I violation that 029 T009 carried out;
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

export interface DraftSection {
  id: string;
  label: string;
  /** `full`, `partial` or `none` — can Rampa source it from what it has? */
  sourceable: 'full' | 'partial' | 'none';
  /** Where it comes from, or why it cannot be sourced. Shown to her verbatim. */
  from: string;
}

export interface GuideCorpus {
  clinicalTerms: string[];
  draftSections: DraftSection[];
  /**
   * The generic printed sentences, by key — `not-filed`, `name-line`, the headings,
   * `generic-statement`. Read through {@link phraseOf} so a missing key is one
   * logged fallback rather than `undefined` reaching a document.
   */
  phrases: Record<string, string>;
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

  const draftSections: DraftSection[] = (Array.isArray(data['draft_sections']) ? data['draft_sections'] : [])
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
    .filter((s): s is DraftSection => s !== null);

  if (draftSections.length === 0) logger.error('guide.no-sections', { file });

  const phrases = phraseMap(data['phrases']);
  if (Object.keys(phrases).length === 0) logger.error('guide.no-phrases', { file });

  return {
    clinicalTerms: clinicalTerms.length > 0 ? clinicalTerms : MINIMUM_CLINICAL,
    draftSections,
    phrases,
  };
}

/**
 * The generic sentences, used when nothing better is available.
 *
 * Same failing-closed posture as {@link MINIMUM_CLINICAL}: a document assembled with
 * `undefined` where its «this is not filed» line should be would be a draft that
 * looks filed, which is the one thing `017` exists to prevent. So every key a
 * document prints has a built-in answer, and a missing key is logged, not silent.
 *
 * **The draft mark is not in here and cannot be in a corpus** (FR-2709). The word
 * BORRADOR, its banner and its watermark are Principle VII — a guard — and a guard a
 * corpus could word is a guard a corpus could empty. What a corpus supplies is what the
 * document is *called*, never that it is a draft.
 */
export const MINIMUM_PHRASES: Record<string, string> = {
  'draft-title': 'de documento de adaptación curricular',
  'signed-title': 'Documento de adaptación curricular',
  'not-filed': '**Esto no está presentado.** Rampa no presenta nada: esto es material '
    + 'para llevar a donde se registre en tu territorio.',
  'authorship-footer': '**Rampa no ha escrito esta adaptación**: ha ordenado lo que ya '
    + 'habías hecho para este alumno.',
  'name-line': '*lo pones tú donde lo registres — yo no lo guardo.*',
  'report-note': 'Esto no está registrado. Si esta adaptación va al expediente, se '
    + 'registra donde diga la normativa de tu territorio, y eso lo haces tú.',
  'acs-footer': '**Esto es un borrador y no está presentado.**',
  'generic-statement': 'No tienes ninguna normativa elegida, así que esto es un '
    + 'borrador genérico: qué documento exige tu territorio, quién lo firma y dónde se '
    + 'registra lo verificas tú con tu orientador u orientadora.',
};

/**
 * One reader for every printed sentence, so no caller invents its own default.
 *
 * A corpus phrase wins; the generic file's is next; the built-in minimum is last and
 * logs. Three tiers rather than two because that is exactly the precedence the layer
 * has — a territory's wording, the neutral wording, and the wording that exists so a
 * broken file cannot produce a document with a hole in it.
 */
export function phraseOf(key: string, ...sources: ReadonlyArray<Record<string, string> | undefined>): string {
  for (const source of sources) {
    const found = source?.[key];
    if (typeof found === 'string' && found.trim() !== '') return found.trim();
  }
  const fallback = MINIMUM_PHRASES[key];
  if (fallback === undefined) {
    logger.error('guide.unknown-phrase', { key });
    return '';
  }
  logger.warn('guide.phrase-missing', { key });
  return fallback;
}

const phraseMap = (v: unknown): Record<string, string> => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  const out: Record<string, string> = {};
  for (const [k, value] of Object.entries(v as Record<string, unknown>)) {
    if (typeof value === 'string' && value.trim() !== '') out[k] = value.trim();
  }
  return out;
};

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
