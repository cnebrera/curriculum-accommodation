import { parseFrontMatter } from '../vault/parse.js';
import { logger } from '../log.js';

/**
 * Which normativa this vault works under, and what was activated (029 T008, R2/R4).
 *
 * ## Why in the vault and not in application settings
 *
 * `vault-settings.ts` holds absolute paths and a personal licence acceptance precisely
 * because those must **not** travel. Which normativa her school works under is the
 * opposite kind of fact: professional context, and a vault restored onto a new laptop
 * must keep it. Same reasoning that put her pictogram vocabulary in the vault.
 *
 * ## The activation log, and the one stored derivative
 *
 * Activating an imported corpus is a decision with consequences she should be able to
 * find again: what she activated, when, what the scan showed her, and whether she went
 * ahead anyway. The content hash is the **only** derived value stored, and it earns its
 * place — without it, «modificado por ti» would need a second copy of the file (the
 * two-copies defect) or would be undetectable.
 *
 * ## Refuse, don't repair — the one state that is treated as «not activated»
 *
 * An entry with findings and no recorded override is corrupt: either the override was
 * lost or the entry was written by something that skipped the decision. Treating it as
 * activated would activate a scanned-and-flagged policy file on the strength of a
 * malformed line. So it is read as not activated, and logged.
 */

export interface NormativeActivation {
  corpus: string;
  on: string;
  /** SHA-256 of what was activated. A later mismatch is «modificado por ti». */
  contentSha256: string;
  /** How many things the scan showed her. Zero is the ordinary case. */
  findings: number;
  /** Whether she activated it despite findings. Required when `findings > 0`. */
  overridden: boolean;
}

export interface NormativeSelection {
  /** A corpus id, or undefined for generic. */
  selected?: string;
  activations: NormativeActivation[];
  /** Her own annotations. The body is hers; only the front matter is ours. */
  body: string;
}

export const SELECTION_PATH = 'normative/selection.md';

export const emptySelection = (): NormativeSelection => ({ activations: [], body: '' });

export function parseSelection(raw: string, file = SELECTION_PATH): NormativeSelection {
  const { data, body } = parseFrontMatter(raw, file);
  const selected = typeof data['selected'] === 'string' && data['selected'].trim() !== ''
    ? data['selected'].trim() : undefined;

  const activations: NormativeActivation[] = [];
  for (const entry of Array.isArray(data['activations']) ? data['activations'] : []) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    const corpus = str(e['corpus']);
    const sha = str(e['content_sha256']);
    if (!corpus || !sha) {
      logger.warn('normative.activation.skipped', { file, reason: 'no corpus or hash' });
      continue;
    }
    const findings = typeof e['findings'] === 'number' && e['findings'] > 0
      ? Math.round(e['findings']) : 0;
    const overridden = e['overridden'] === true;
    if (findings > 0 && !overridden) {
      // Refuse-don't-repair: not treated as an activation at all.
      logger.error('normative.activation.findings-without-override', { file, corpus });
      continue;
    }
    activations.push({
      corpus, on: str(e['on']) ?? dateish(e['on']) ?? '', contentSha256: sha,
      findings, overridden,
    });
  }

  return { ...(selected ? { selected } : {}), activations, body: body.trim() };
}

/** What goes back to disk. Her body is preserved verbatim. */
export function selectionFrontMatter(s: NormativeSelection): Record<string, unknown> {
  return {
    ...(s.selected ? { selected: s.selected } : {}),
    activations: s.activations.map((a) => ({
      corpus: a.corpus, on: a.on, content_sha256: a.contentSha256,
      findings: a.findings, overridden: a.overridden,
    })),
  };
}

/**
 * The activation a corpus is currently running under, or nothing.
 *
 * The **last** entry for that corpus, because re-activating after an edit is the
 * ordinary way a corpus changes and the newest decision is the one in force.
 */
export function activationOf(s: NormativeSelection, corpusId: string): NormativeActivation | undefined {
  for (let i = s.activations.length - 1; i >= 0; i -= 1) {
    if (s.activations[i]!.corpus === corpusId) return s.activations[i];
  }
  return undefined;
}

const str = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;

function dateish(v: unknown): string | undefined {
  return v instanceof Date && !Number.isNaN(v.getTime())
    ? v.toISOString().slice(0, 10) : undefined;
}
