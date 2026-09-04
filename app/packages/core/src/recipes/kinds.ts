import { parseFrontMatter } from '../vault/parse.js';
import { logger } from '../log.js';

/**
 * What the material is (012 T003, FR-1001).
 *
 * Corpus, not code. A kind is defined by **what it forbids**, and a prohibition
 * about how to adapt is pedagogical judgement — «no cambies las cantidades ni las
 * operaciones que se practican» has to be readable and correctable by a teacher
 * without touching TypeScript (Principle I). Adding the fifth kind is a Markdown
 * edit and no code change.
 *
 * See `instructions/material-kinds.md` and
 * `specs/012-que-material-examen/contracts/material-kinds.md`.
 */

export interface MaterialKind {
  id: string;
  /** Her words, not a category: «Una hoja de problemas». */
  label: string;
  /** Machine-readable, for the report: which of the prohibitions govern. */
  forbids: string[];
  /**
   * What she is told **before** it runs (`016` FR-1405).
   *
   * `rule` is for the model and `forbids` is for the report; this is the one of
   * the three she reads while deciding whether to spend. In the corpus rather than
   * in the interface for the same reason as `rule`: it is a promise about what will
   * and will not be touched, and that is judgement (Principle I).
   *
   * Optional, so a corpus written before this field still loads — and a kind
   * without one simply says nothing rather than having a sentence invented for it.
   */
  before?: string;
  /**
   * What happens when Rampa **writes** this kind rather than adapting one (`021` US2).
   *
   * Adapting an exam and writing one are different acts: the first has a demand to
   * respect, the second is proposing it. `on_document` goes **on the printed page** and
   * not only on the screen — a sheet outlives the screen it was made on, and whoever
   * picks it up next did not see the warning she saw.
   *
   * Optional, and absent for every kind that needs nothing extra. Corpus rather than
   * code because which sentence a PT needs printed on a generated exam is a judgement she
   * can correct without a release (Principle I).
   */
  /**
   * What to ask about **how much** material to make (`021` FR-1925).
   *
   * Corpus, so changing a kind's question is a Markdown edit — the same reason
   * `composing` lives there. `of: 'none'` is explicit rather than the block being
   * absent: absence would mean nobody decided, and a study text having nothing to count
   * is a decision.
   *
   * What replaces it for such a kind is not here, because it is asked for **every** kind:
   * how many sessions, and how long they are.
   */
  quantity?: {
    of: 'exercises' | 'questions' | 'problems' | 'none';
    label?: string;
    help?: string;
    default?: number;
  };
  composing?: {
    /** Said to her before it runs. */
    before?: string;
    /** Printed on the document itself. */
    onDocument: string[];
    /**
     * The refusal when the request would compose this kind **below his course**
     * (`027` FR-2509, decision P12).
     *
     * Corpus and not code, because it is the sentence a teacher reads when Rampa says
     * no — and the argument in it («lo decide el equipo docente con una evaluación
     * psicopedagógica») is a judgement about Spanish special education that a PT must be
     * able to correct. The **gate** is code: which request is below which course is
     * arithmetic over the education corpus.
     *
     * Present only for `exam`. For the other three the answer is not a refusal:
     * composing support material at a lower level is exactly what they are for.
     */
    belowLevel?: string;
  };
  /** Sent to the model verbatim, alongside the hard rules, which outrank it. */
  rule: string;
}

/**
 * `quantity:` from a kind entry, or nothing.
 *
 * An unrecognised unit yields nothing rather than being coerced to `exercises` — the
 * same rule the rest of this file follows for a kind id. Coercing would ask «cuántos
 * ejercicios» about a study text, which is the defect this field exists to fix.
 */
function parseQuantity(v: unknown): MaterialKind['quantity'] {
  if (!v || typeof v !== 'object') return undefined;
  const e = v as Record<string, unknown>;
  const of = str(e['of']);
  if (of !== 'exercises' && of !== 'questions' && of !== 'problems' && of !== 'none') {
    return undefined;
  }
  const n = typeof e['default'] === 'number' ? e['default'] : undefined;
  return {
    of,
    ...(str(e['label']) ? { label: str(e['label'])! } : {}),
    ...(str(e['help']) ? { help: str(e['help'])! } : {}),
    ...(n && n > 0 ? { default: Math.round(n) } : {}),
  };
}

/**
 * `composing:` from a kind entry, or nothing.
 *
 * Fails **open** — a malformed block yields no limits rather than throwing — for the
 * reason `002` chose the opposite for clinical terms: there, an empty list meant a
 * diagnosis reached the vault, so it failed closed. Here an absent block means a kind
 * carries no extra sentence, which is the normal case for three of the four. What must
 * not happen is the whole corpus refusing to load because somebody mis-indented a line
 * on the exam entry, taking adapting down with it.
 *
 * The limits that actually matter — no mark scheme, no marking a learner's answers — are
 * **not** here. They are asserted as absences over the output (`021` T023), because a
 * rule that lives only in a prompt shares its context window with a document that may
 * contradict it (`007`).
 */
function parseComposing(
  v: unknown,
): { before?: string; onDocument: string[]; belowLevel?: string } | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const e = v as Record<string, unknown>;
  const onDocument = list(e['on_document']);
  const before = str(e['before']);
  const belowLevel = str(e['below_level']);
  if (onDocument.length === 0 && !before && !belowLevel) return undefined;
  return {
    onDocument,
    ...(before ? { before } : {}),
    ...(belowLevel ? { belowLevel } : {}),
  };
}

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const list = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').map((x) => x.trim()) : [];

/**
 * Repair, do not reject — the same rule as the education corpus (`011` FR-907).
 *
 * A malformed entry is dropped and logged; the rest of the file still ships. One
 * bad kind must not take the other three down, because the consequence of no
 * kinds at all is an application that cannot ask what the material is and
 * therefore adapts an exam as a worksheet.
 *
 * A kind with **no `rule`** is dropped rather than kept: the rule is the entire
 * point. A label with nothing behind it would put an option in front of her that
 * changes nothing, which is worse than not offering it.
 */
export function parseMaterialKinds(raw: string, path = 'material-kinds.md'): MaterialKind[] {
  const { data } = parseFrontMatter(raw, path);
  const entries = Array.isArray(data['kinds']) ? (data['kinds'] as unknown[]) : [];

  const out: MaterialKind[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    const id = str(e['id']);
    const label = str(e['label']);
    const rule = str(e['rule']);

    if (!id || !label || !rule) {
      logger.warn('kinds.incomplete', { path, id: id || '(sin id)', hasLabel: !!label, hasRule: !!rule });
      continue;
    }
    if (seen.has(id)) {
      // Two kinds with one id is a corpus edit gone wrong, and silently keeping
      // the last would make which one wins depend on file order.
      logger.warn('kinds.duplicate', { path, id });
      continue;
    }
    seen.add(id);
    const before = str(e['before']);
    const composing = parseComposing(e['composing']);
    const quantity = parseQuantity(e['quantity']);
    out.push({
      id, label, forbids: list(e['forbids']), rule,
      // Absent is silence, not a default sentence: an invented promise about what
      // will not be touched is worse than none.
      ...(before ? { before } : {}),
      ...(composing ? { composing } : {}),
      ...(quantity ? { quantity } : {}),
    });
  }

  if (out.length === 0) logger.error('kinds.empty', { path, entriesFound: entries.length });
  return out;
}

/** The one she chose, or `null`. Never a fallback to `worksheet` — see FR-1003. */
export const findKind = (kinds: readonly MaterialKind[], id: string | undefined): MaterialKind | null =>
  (id ? kinds.find((k) => k.id === id) ?? null : null);

/** True when this kind forbids a named thing, for the report. */
export const forbids = (kind: MaterialKind | null, what: string): boolean =>
  Boolean(kind?.forbids.includes(what));
