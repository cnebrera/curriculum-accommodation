import type { IRDocument, Block } from '../ir/types.js';
import { RampaError } from '../errors.js';

/**
 * Generated material, and what has to be true of it (002 T007/T008, FR-103/104).
 *
 * ## The hole this closes
 *
 * `checkProvenance` exempts any block carrying `data-objective` — because
 * generated material keys to an objective rather than to a source block, which is
 * correct. But it exempts it on the strength of the attribute **existing**, so a
 * block with `data-objective="algo"` passes every check in the pipeline.
 *
 * That is the composing equivalent of an unaccounted block, and it is worse:
 * adapted material has a source to compare against, and this does not. A
 * generated block whose objective is not one she asked for is content nobody
 * requested, on a sheet that claims every block traces to something.
 *
 * So: the objectives are checked against **her list**, and a mismatch fails the
 * render exactly as an unaccounted block does (`007` FR-512).
 */

/** `kind: generated` and the anchor, in the document's front matter (FR-103). */
export interface GeneratedFrontMatter {
  kind: 'generated';
  /**
   * What the content rests on (FR-102). Free text: the teacher's own notes, the
   * textbook page, an official criterion.
   *
   * Absent is a **refusal**, not a warning — see `assertAnchor` for the input gate
   * and `assertAnchorRecorded` for the document one.
   */
  anchor?: string;
  /** The objectives she asked for, verbatim, in her order. */
  objectives: string[];
}

const isGenerated = (b: Block): boolean => typeof b.attrs['data-objective'] === 'string';
const isScaffold = (b: Block): boolean => b.classes.includes('scaffold');
const isReportNotes = (b: Block): boolean => b.classes.includes('report-notes');

export interface ObjectiveIssue {
  blockId: string;
  line: number;
  reason: 'unknown-objective' | 'no-objective' | 'no-blocks';
  message: string;
}

/**
 * Every generated block traces to an objective she actually wrote (FR-104).
 *
 * `objectives` is the list from her, not from the document — passing the
 * document's own front matter would let a model add an objective and then satisfy
 * it, which is the check marking its own homework.
 */
export function checkObjectives(
  doc: IRDocument, objectives: readonly string[],
): ObjectiveIssue[] {
  const asked = new Set(objectives.map(norm));
  const issues: ObjectiveIssue[] = [];
  let generatedBlocks = 0;

  for (const b of doc.blocks) {
    if (isReportNotes(b)) continue;

    if (isGenerated(b)) {
      generatedBlocks += 1;
      const objective = b.attrs['data-objective']!;
      if (!asked.has(norm(objective))) {
        issues.push({
          blockId: b.id, line: b.line, reason: 'unknown-objective',
          message: `El bloque "${b.id}" dice que practica «${objective}», y eso no es`
            + ' nada de lo que pediste.',
        });
      }
      continue;
    }

    /*
     * A block in generated material that names no objective, and is not
     * scaffolding, came from nowhere.
     *
     * Scaffolding is exempt because that is what scaffolding is — a worked
     * example, a word bank, a step list. It is new by definition and marked as
     * such.
     */
    if (!isScaffold(b)) {
      issues.push({
        blockId: b.id, line: b.line, reason: 'no-objective',
        message: `El bloque "${b.id}" no dice qué objetivo practica y no está marcado`
          + ' como apoyo.',
      });
    }
  }

  if (generatedBlocks === 0) {
    issues.push({
      blockId: '', line: 0, reason: 'no-blocks',
      message: 'No hay ni un bloque que diga qué objetivo practica.',
    });
  }

  return issues;
}

/**
 * Fail the render, exactly as unaccounted content does.
 *
 * A throw rather than a report entry: `007` FR-512's reasoning is that content
 * nobody can account for must not reach a document a teacher signs, and a
 * generated block tracing to no objective is that with the source removed.
 */
export function assertObjectives(doc: IRDocument, objectives: readonly string[]): void {
  const issues = checkObjectives(doc, objectives);
  if (issues.length > 0) {
    throw new RampaError('ir-no-provenance',
      `${issues.length} problema(s) con los objetivos del material generado.`, issues);
  }
}

/**
 * No anchor, no composition (FR-102).
 *
 * The failure this specification was designed around: a model asked for
 * curricular facts produces plausible ones, and a generated worksheet that
 * teaches something wrong is worse than a dense one that teaches it right.
 *
 * A refusal rather than a warning, because a warning on a screen she is moving
 * quickly through is a warning she will pass.
 */
/*
 * Renamed from `assertAnchored` when `compose/anchor.ts` arrived: that module owns
 * the gate on **her input**, and this one asserts the **document** recorded what
 * it rested on. Two different moments, and a single name for both is a name
 * somebody reads as the other.
 */
export function assertAnchorRecorded(fm: Record<string, unknown>): void {
  const anchor = typeof fm['anchor'] === 'string' ? fm['anchor'].trim() : '';
  if (!anchor) {
    throw new RampaError('ir-no-provenance',
      'No puedo generar contenido sin algo en lo que apoyarlo. Dame la página del '
      + 'libro que sustituye, tus apuntes, o las tres frases que dirías en clase.');
  }
}

/**
 * Compare objectives as she might retype them.
 *
 * Accent- and case-insensitive, whitespace-collapsed. A model echoing
 * «Multiplicar con llevadas» where she wrote «multiplicar con llevadas» has
 * traced to her objective, and rejecting it for the capital would fail a render
 * over nothing — the failure mode where a strict check makes the feature unusable
 * and gets loosened wholesale instead of precisely.
 */
const norm = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
