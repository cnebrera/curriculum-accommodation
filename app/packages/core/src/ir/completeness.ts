import type { IRDocument, Notice } from './types.js';
import { learnerFacing } from './parse.js';
import { declaredDropped } from '../report/notes.js';
import { RampaError } from '../errors.js';

/**
 * Omissions, caught as deterministically as additions (007 FR-516, FR-517).
 *
 * `findUnaccountedBlocks` catches what an injection *adds*. This catches what a
 * failure *removes*, which is the project's oldest threat wearing a new coat:
 * curricular content quietly gone from a worksheet that reads perfectly well.
 * Nothing about it is visible in the finished PDF, which is exactly why it needs
 * arithmetic rather than a reviewer's eye.
 *
 * The rule: every source block is present, derived from via `data-from`, or
 * declared dropped in `.report-notes`. Anything else fails the job.
 */
export interface CompletenessIssue {
  kind: 'missing' | 'truncated';
  blockId?: string;
  message: string;
}

/** Ids the adapted document accounts for, whether kept or derived. */
function accountedFor(adapted: IRDocument): Set<string> {
  const ids = new Set<string>();
  for (const b of adapted.blocks) {
    ids.add(b.id);
    const from = b.attrs['data-from'];
    if (from) for (const id of from.split(/[,\s]+/).filter(Boolean)) ids.add(id);
  }
  return ids;
}

export function checkCompleteness(original: IRDocument, adapted: IRDocument): CompletenessIssue[] {
  const issues: CompletenessIssue[] = [];
  const accounted = accountedFor(adapted);
  const dropped = declaredDropped(adapted);

  for (const b of original.blocks) {
    // Only content a learner was meant to read is curricular content.
    if (!learnerFacing(b)) continue;
    if (accounted.has(b.id) || dropped.has(b.id)) continue;
    issues.push({
      kind: 'missing',
      blockId: b.id,
      message: `El bloque "${b.id}" del material original no aparece en la adaptación ` +
        `y tampoco se declara como eliminado.`,
    });
  }
  return issues;
}

/**
 * A truncated model response is not a hand-edit (007 FR-517).
 *
 * The vault parser repairs rather than rejects, because a teacher editing her own
 * files must never be told she broke something. Applied to model output that same
 * rule turns a cut-off response into a silently shorter document — so the two
 * inputs must not share the behaviour. An unclosed fence fails the job.
 */
export function checkStructurallyComplete(raw: string): CompletenessIssue[] {
  const issues: CompletenessIssue[] = [];
  const opens = (raw.match(/^:::+\s*\{[^}]*\}\s*$/gm) ?? []).length;
  const closes = (raw.match(/^:::+\s*$/gm) ?? []).length;
  if (opens > closes) {
    issues.push({
      kind: 'truncated',
      message: `La respuesta se ha cortado: ${opens} bloques abiertos y ${closes} cerrados.`,
    });
  }
  if (raw.trim().length === 0) {
    issues.push({ kind: 'truncated', message: 'La respuesta ha llegado vacía.' });
  }
  return issues;
}

/** For the teacher: what was wrong, in her language, without a stack trace. */
export function completenessNotice(issues: CompletenessIssue[]): Notice {
  const truncated = issues.some((i) => i.kind === 'truncated');
  const missing = issues.filter((i) => i.kind === 'missing');
  return {
    kind: 'incomplete',
    quote: truncated
      ? 'respuesta incompleta'
      : missing.map((m) => m.blockId).filter(Boolean).join(', '),
    message: truncated
      ? 'La adaptación ha llegado a medias, así que no te la enseño. Vuelve a intentarlo.'
      : `Faltaban ${missing.length} trozo(s) del material original sin que se dijera por qué. ` +
        'No te enseño una ficha a la que le falte contenido sin avisar.',
  };
}

export function assertComplete(original: IRDocument, adapted: IRDocument, raw: string): void {
  const issues = [...checkStructurallyComplete(raw), ...checkCompleteness(original, adapted)];
  if (issues.length) {
    throw new RampaError('output-incomplete', completenessNotice(issues).message, issues);
  }
}
