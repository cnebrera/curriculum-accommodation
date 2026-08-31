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
  /** Sent to the model verbatim, alongside the hard rules, which outrank it. */
  rule: string;
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
    out.push({ id, label, forbids: list(e['forbids']), rule });
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
