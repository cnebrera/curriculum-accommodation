import { parseFrontMatter } from '../vault/parse.js';
import { logger } from '../log.js';

/**
 * A normative corpus, from the corpus (029 T006, FR-2701, FR-2709).
 *
 * ## What this file is for
 *
 * For a year Rampa said «Séneca» to everybody. Séneca is Andalucía's platform; the
 * ACNS/ACS pair and the Instrucciones de 8-3-2017 are Andalucía's framework. A teacher
 * in Galicia read sentences about a platform she does not have, and concluded —
 * correctly — that this was not built for her.
 *
 * So which documents a territory names, who signs them, what they require and where
 * they are registered is now **a Markdown file a teacher can write**, and this parses
 * it. The contract she writes against is
 * `specs/029-la-normativa-es-un-corpus/contracts/normative-corpus.md`.
 *
 * ## The absence that is the design
 *
 * **No field parsed here reaches any guard**, and that is FR-2709 before a single test
 * runs. There is no slot for a recipe, an exam rule, the draft mark, redaction, the
 * clinical base list or the ACS decline — so a corpus that *says* an exam may be made
 * easier has said something the application has no path to act on. The import scan then
 * only has to **report** the attempt, not defeat it.
 *
 * `clinical_terms_extra` is the one field that touches a guard's input, and it can only
 * **add**: a territory's own clinical words joining the base list, never removing one.
 * A field that could subtract would be a corpus deciding what may enter the vault.
 *
 * ## Repair, don't reject — with one line where it stops
 *
 * `011` FR-907's rule: a broken document type is dropped, the rest of the file loads,
 * and it is logged. But a file with no usable `id` or `label` is **not offered at all**,
 * because a corpus she cannot see in the picker and cannot name in a provenance line is
 * worse than one that is absent.
 *
 * Unknown fields are preserved so a corpus written against a newer build still runs on
 * an older one — the packet lesson from `032`, applied to the other file a teacher
 * carries between machines.
 */

export interface NormativeDocumentSection {
  id: string;
  label: string;
  /** `full`, `partial` or `none` — can Rampa source it from what it has? */
  sourceable: 'full' | 'partial' | 'none';
  /** Where it comes from, or why it cannot be sourced. Shown to her verbatim. */
  from: string;
}

export interface NormativeDocumentType {
  /** Stable within the corpus: `acns`, `acs`, whatever this territory calls them. */
  id: string;
  /** What she reads, and what the draft is titled. */
  label: string;
  /**
   * Does this document modify objectives and criteria?
   *
   * The one boolean that routes anything, and it routes **towards** a lock rather than
   * away from one: `true` sends the document to the refusal in `instructions/acs.md`.
   * A corpus can therefore add a document that must not be decided by a model; it
   * cannot mark one exempt, because nothing consults `false`.
   */
  touchesObjectives: boolean;
  /** Who authors, coordinates or advises — printed, per `017` FR-1504. */
  roles: string;
  /** What must exist first («una evaluación psicopedagógica previa»), or nothing. */
  prerequisites?: string;
  sections: NormativeDocumentSection[];
}

export interface NormativeCorpus {
  /** The selection key. Never the territory string: two files may both say «Madrid». */
  id: string;
  label: string;
  /** Informative only, and deliberately never used for matching. */
  territory?: string;
  lastChecked?: string;
  /**
   * False until somebody who works under this normativa has **disagreed** with
   * something concrete. Not read it — disagreed. `docs/axis-calibration.md`'s lesson,
   * and it weighs more here: this gets printed into a document she takes to the
   * administration.
   */
  review: { reviewed: boolean; by?: string; on?: string };
  /** The platform of record («Séneca»), used inside `phrases` and nowhere else. */
  register?: string;
  documents: NormativeDocumentType[];
  /** The printed normative sentences, by key. */
  phrases: Record<string, string>;
  /** Territory-specific **additions** to the clinical filter. Additions only. */
  clinicalTermsExtra: string[];
  /** Everything the parser did not claim, kept so a newer file survives an older build. */
  unknown: Record<string, unknown>;
  /** The whole raw file — what actually travels to the model (Principle I). */
  raw: string;
}

/** The keys this parser claims. Anything else is preserved in `unknown`. */
const KNOWN_KEYS = new Set([
  'id', 'label', 'territory', 'last_checked', 'reviewed_by_teacher', 'reviewed_by',
  'reviewed_on', 'register', 'documents', 'phrases', 'clinical_terms_extra',
]);

export function parseNormativeCorpus(raw: string, path: string): NormativeCorpus | null {
  const { data } = parseFrontMatter(raw, path);

  const id = str(data['id']);
  const label = str(data['label']);
  if (!id || !label) {
    // Not offered at all. The malformed-education-system rule: a corpus with no name
    // cannot be picked, cannot be deselected, and cannot say what it is in a document.
    logger.warn('normative.corpus.skipped', { path, reason: 'no id or label' });
    return null;
  }

  const documents: NormativeDocumentType[] = [];
  for (const d of Array.isArray(data['documents']) ? data['documents'] : []) {
    const parsed = parseDocumentType(d, path);
    if (parsed) documents.push(parsed);
  }
  if (documents.length === 0) {
    // Not fatal. A corpus that only carries phrases and clinical terms is still a
    // corpus — it just draws its section list from the generic scaffold.
    logger.warn('normative.corpus.no-documents', { path, id });
  }

  const reviewed = data['reviewed_by_teacher'] === true;
  const unknown: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) if (!KNOWN_KEYS.has(k)) unknown[k] = v;

  return {
    id,
    label,
    territory: str(data['territory']),
    lastChecked: str(data['last_checked']) ?? dateish(data['last_checked']),
    review: {
      reviewed,
      // Only meaningful when reviewed. Carried anyway rather than dropped — a file
      // that names a reviewer and says `false` is a state a human should be able to
      // see, not one the parser should tidy away.
      by: str(data['reviewed_by']),
      on: str(data['reviewed_on']) ?? dateish(data['reviewed_on']),
    },
    register: str(data['register']),
    documents,
    phrases: phraseMap(data['phrases'], path),
    clinicalTermsExtra: strings(data['clinical_terms_extra']),
    unknown,
    raw,
  };
}

function parseDocumentType(entry: unknown, path: string): NormativeDocumentType | null {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
  const d = entry as Record<string, unknown>;
  const id = str(d['id']);
  const label = str(d['label']);
  if (!id || !label) {
    logger.warn('normative.document.skipped', { path, reason: 'no id or label' });
    return null;
  }

  const sections: NormativeDocumentSection[] = [];
  for (const s of Array.isArray(d['sections']) ? d['sections'] : []) {
    if (!s || typeof s !== 'object') continue;
    const sec = s as Record<string, unknown>;
    const sid = str(sec['id']);
    const slabel = str(sec['label']);
    if (!sid || !slabel) {
      logger.warn('normative.section.skipped', { path, document: id });
      continue;
    }
    const sourceable = str(sec['sourceable']);
    if (sourceable !== 'full' && sourceable !== 'partial' && sourceable !== 'none') {
      /*
       * Unreadable sourceability is **none**, the same call `guide/corpus.ts` makes.
       * The section gets named as missing rather than assembled from a guess, which is
       * the safe direction: a draft that says «esto falta» costs her a sentence, and a
       * draft that invents the desfase curricular costs a child a document nobody
       * checked.
       */
      logger.warn('normative.section-sourceable-unreadable', { path, document: id, id: sid });
      sections.push({ id: sid, label: slabel, sourceable: 'none', from: str(sec['from']) ?? '' });
      continue;
    }
    sections.push({ id: sid, label: slabel, sourceable, from: str(sec['from']) ?? '' });
  }

  return {
    id,
    label,
    touchesObjectives: d['touches_objectives'] === true,
    roles: str(d['roles']) ?? '',
    prerequisites: str(d['prerequisites']),
    sections,
  };
}

const str = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;

const strings = (v: unknown): string[] =>
  (Array.isArray(v) ? v : []).filter((x): x is string => typeof x === 'string' && x.trim() !== '')
    .map((x) => x.trim());

const phraseMap = (v: unknown, path: string): Record<string, string> => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  const out: Record<string, string> = {};
  for (const [k, value] of Object.entries(v as Record<string, unknown>)) {
    if (typeof value === 'string' && value.trim() !== '') out[k] = value.trim();
    else logger.warn('normative.phrase-unusable', { path, key: k });
  }
  return out;
};

/** YAML hands back a Date for an unquoted date — the defect found twice already. */
function dateish(v: unknown): string | undefined {
  return v instanceof Date && !Number.isNaN(v.getTime())
    ? v.toISOString().slice(0, 10) : undefined;
}

/** Every corpus in a directory, malformed ones dropped rather than fatal. */
export function loadNormativeCorpora(
  files: ReadonlyArray<{ path: string; raw: string }>,
): NormativeCorpus[] {
  const out: NormativeCorpus[] = [];
  const seen = new Set<string>();
  for (const f of files) {
    const parsed = parseNormativeCorpus(f.raw, f.path);
    if (!parsed) continue;
    if (seen.has(parsed.id)) {
      /*
       * First wins, and the loader's caller decides the order — bundled before vault,
       * so a downloaded file claiming `es-an` cannot shadow the shipped one. Refusing
       * both would let one hostile file remove a working corpus; taking the last would
       * let it replace it.
       */
      logger.warn('normative.corpus.duplicate-id', { path: f.path, id: parsed.id });
      continue;
    }
    seen.add(parsed.id);
    out.push(parsed);
  }
  return out;
}
