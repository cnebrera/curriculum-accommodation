import type { Block, IRDocument } from './types.js';
import { RampaError } from '../errors.js';

/**
 * Provenance is the audit trail, and it doubles as the injection detector.
 *
 * Every changed block declares where it came from, which recipe produced it and
 * which axis justified it. Injected content has no provenance to declare, so a
 * block that appears without any is either a bug or an attack — and either way
 * the job stops (007 FR-512).
 */
export interface ProvenanceIssue {
  blockId: string;
  line: number;
  reason: 'missing-from' | 'missing-recipe' | 'missing-axis';
  message: string;
}

const isScaffold = (b: Block) => b.classes.includes('scaffold');
/** The model's note to the teacher, not curricular content. No provenance to declare. */
const isReportNotes = (b: Block) => b.classes.includes('report-notes');
const isGeneratedBlock = (b: Block) => typeof b.attrs['data-objective'] === 'string';

export function checkProvenance(doc: IRDocument): ProvenanceIssue[] {
  const issues: ProvenanceIssue[] = [];

  for (const b of doc.blocks) {
    // Scaffolding is new by definition, and generated material is keyed to an
    // objective rather than to a source block. Neither needs `data-from`.
    if (isScaffold(b) || isGeneratedBlock(b) || isReportNotes(b)) continue;

    const from = b.attrs['data-from'];
    const recipe = b.attrs['data-recipe'];
    const axis = b.attrs['data-axis'];

    // An untouched block carries none of the three and is fine.
    if (!from && !recipe && !axis) continue;

    if (!from) issues.push({ blockId: b.id, line: b.line, reason: 'missing-from',
      message: `El bloque "${b.id}" cambió pero no dice de dónde viene.` });
    if (!recipe) issues.push({ blockId: b.id, line: b.line, reason: 'missing-recipe',
      message: `El bloque "${b.id}" cambió pero no dice qué regla lo cambió.` });
    if (!axis) issues.push({ blockId: b.id, line: b.line, reason: 'missing-axis',
      message: `El bloque "${b.id}" cambió pero no dice qué barrera lo justifica.` });
  }
  return issues;
}

/**
 * A block present in the adapted document that derives from nothing in the
 * original, and is not marked as scaffolding, is unaccounted-for content.
 *
 * ## Why `data-objective` is not an exemption here
 *
 * It used to be, mirroring `checkProvenance` — and that was a hole with the same
 * shape as the one `002` T008 closed. This function only ever runs on an
 * **adaptation**, where there is always an original. Adapting a composed sheet
 * meant a model could add a whole new exercise carrying
 * `data-objective="multiplicar con llevadas"` — an objective genuinely on her
 * list, so the objective check passed too — and it would be exempt from tracing
 * to anything.
 *
 * That exercise has no verified answer: it is not in the key, because the key was
 * computed from the exercises that passed the verifier. A sheet of checked
 * arithmetic with one unchecked exercise in it is worse than an unchecked sheet,
 * because the report says the arithmetic was computed.
 *
 * So a generated block in an adapted document traces like any other: same id, or
 * `data-from`. The exemption stays in `checkProvenance`, where it is right — a
 * composed document's own blocks key to an objective and there is no source block
 * for them to come from.
 */
export function findUnaccountedBlocks(original: IRDocument, adapted: IRDocument): Block[] {
  const known = new Set(original.blocks.map((b) => b.id));
  return adapted.blocks.filter((b) => {
    if (isScaffold(b) || isReportNotes(b)) return false;
    const from = b.attrs['data-from'];
    if (!from) return !known.has(b.id);
    return !from.split(/[,\s]+/).filter(Boolean).every((id) => known.has(id));
  });
}

/** `id@version`, so provenance does not point at a moving target. */
export function parseRecipeRef(ref: string): { id: string; version: number | null } {
  const at = ref.lastIndexOf('@');
  if (at < 0) return { id: ref, version: null };
  const v = Number(ref.slice(at + 1));
  return { id: ref.slice(0, at), version: Number.isFinite(v) ? v : null };
}

export function assertProvenance(doc: IRDocument): void {
  const issues = checkProvenance(doc);
  if (issues.length > 0) {
    throw new RampaError('ir-no-provenance',
      `${issues.length} bloque(s) cambiaron sin justificación registrada.`, issues);
  }
}
