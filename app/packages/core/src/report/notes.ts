import type { Block, IRDocument } from '../ir/types.js';

/**
 * The model's declarations, read out of the `.report-notes` block (T087).
 *
 * Contract in `docs/ir.md` §"The model's channel into the report" and in
 * `instructions/adapt.md` §Output. Two forms are machine-parsed and the rest is
 * carried through as prose:
 *
 *   - `[dropped:e5] why`  — a block deliberately removed
 *   - `[flag] what`       — something needing the teacher's decision
 *
 * Everything here is *claims by the model*. They are how a drop becomes
 * declared rather than silent; they are not evidence that the drop was correct.
 * The teacher decides that, which is why flags and drops lead the report.
 */
export interface ReportNotes {
  dropped: Array<{ id: string; why: string }>;
  flags: string[];
  other: string[];
}

const EMPTY: ReportNotes = { dropped: [], flags: [], other: [] };

export const reportNotesBlock = (doc: IRDocument): Block | undefined =>
  doc.blocks.find((b) => b.classes.includes('report-notes'));

export function parseReportNotes(doc: IRDocument): ReportNotes {
  const block = reportNotesBlock(doc);
  if (!block) return { ...EMPTY };

  const out: ReportNotes = { dropped: [], flags: [], other: [] };
  // One entry per bullet or line; a wrapped bullet keeps its continuation.
  const entries = block.content
    .split(/\n(?=\s*[-*]\s|\s*\[)/)
    .map((s) => s.replace(/^\s*[-*]\s*/, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  for (const entry of entries) {
    const drop = /^\[dropped:\s*([^\]\s]+)\s*\]\s*(.*)$/i.exec(entry);
    if (drop) {
      out.dropped.push({ id: drop[1]!, why: drop[2]!.trim() || 'sin motivo indicado' });
      continue;
    }
    const flag = /^\[flag\]\s*(.*)$/i.exec(entry);
    if (flag) {
      out.flags.push(flag[1]!.trim());
      continue;
    }
    out.other.push(entry);
  }
  return out;
}

/** Ids the model declared as dropped, for the completeness check. */
export const declaredDropped = (doc: IRDocument): Set<string> =>
  new Set(parseReportNotes(doc).dropped.map((d) => d.id));
