import type { Block, IRDocument, Notice } from '../ir/types.js';
import { detectInjection } from '../ir/injection.js';
import { detectHidden, detectInvisible } from '../ir/hidden.js';
import { RampaError } from '../errors.js';

/**
 * The anchor: what content composition rests on (002 T017-T019, FR-102).
 *
 * ## Why there is no composing without one
 *
 * A model asked for curricular facts produces plausible ones. Adapting has a
 * source that says what is true; composing does not, and a generated worksheet
 * that teaches something wrong is worse than a dense one that teaches it right.
 *
 * So the anchor is a **refusal**, not a warning. A warning on a screen she is
 * moving quickly through is a warning she passes, and the cost of passing it is
 * a page of confident falsehoods with Rampa's name on it.
 *
 * ## The anchor is material, and material is data
 *
 * She pastes it from a web page, a PDF, a colleague's document. Principle IX
 * applies with no exception: the injection detector and the invisible-character
 * detector run over every passage, and what they find reaches her. Nothing is
 * stripped and nothing is obeyed.
 *
 * ## Passages have ids because provenance needs a target
 *
 * `data-from` traces an adapted block to a source block. A composed content block
 * has no source block — it has a passage of the anchor it rests on, so it carries
 * `data-anchor="a3"` and the check is the same check: a block that traces to
 * nothing does not ship (`007` FR-512).
 */

export interface AnchorPassage {
  /** `a1`, `a2`… Assigned by us, never by the model. */
  id: string;
  text: string;
}

export interface AnchorReading {
  passages: AnchorPassage[];
  /** Everything she must see about her own anchor. Never blocking (FR-514). */
  notices: Array<{ passage: string; notice: Notice }>;
  /** Characters cut by the bound. Reported, never silent. */
  charsCut: number;
  /** Passages dropped by the bound. */
  passagesCut: number;
}

export interface AnchorLimits {
  maxChars: number;
  maxPassages: number;
}

export const DEFAULT_ANCHOR_LIMITS: AnchorLimits = { maxChars: 20_000, maxPassages: 40 };

/**
 * Split her anchor into passages, and look at each one.
 *
 * Blank-line separated, because that is what a paste looks like. A single
 * unbroken paragraph is one passage and that is fine — the point of the ids is
 * that a generated block can name what it rests on, not that the anchor be finely
 * divided.
 */
export function readAnchor(raw: string, limits: AnchorLimits = DEFAULT_ANCHOR_LIMITS): AnchorReading {
  const trimmed = raw.trim();
  const charsCut = Math.max(0, trimmed.length - limits.maxChars);
  const bounded = trimmed.slice(0, limits.maxChars);

  const all = bounded.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const passagesCut = Math.max(0, all.length - limits.maxPassages);
  const passages = all.slice(0, limits.maxPassages)
    .map((text, i) => ({ id: `a${i + 1}`, text }));

  const notices: AnchorReading['notices'] = [];
  for (const p of passages) {
    // A passage, shaped as a block, so the detector that runs over ingested
    // material runs over this too — one detector, not a second one that drifts.
    const asBlock: Block = {
      id: p.id, classes: ['reference'], attrs: {}, content: p.text, line: 1, notices: [],
    };
    for (const notice of detectInjection(asBlock)) notices.push({ passage: p.id, notice });
    for (const notice of detectHidden(detectInvisible(p.text))) {
      notices.push({ passage: p.id, notice });
    }
  }

  return { passages, notices, charsCut, passagesCut };
}

/**
 * No anchor, no content composition (FR-102).
 *
 * The message asks for **the least she can give** rather than for a source. A
 * teacher who has nothing to hand will abandon a screen that demands a document;
 * she will type three sentences.
 */
export function assertAnchor(raw: string | undefined): string {
  const anchor = (raw ?? '').trim();
  if (!anchor) {
    throw new RampaError('compose-needs-anchor',
      'No puedo generar contenido sin algo en lo que apoyarlo. Dame la página del '
      + 'libro que sustituye, tus apuntes, o las tres frases que dirías en clase.');
  }
  return anchor;
}

/** The anchor as the model sees it: passages with their ids, and nothing else. */
export function renderAnchorForPrompt(passages: readonly AnchorPassage[]): string {
  return passages.map((p) => `[${p.id}] ${p.text}`).join('\n\n');
}

export interface AnchorIssue {
  blockId: string;
  line: number;
  reason: 'no-anchor' | 'unknown-anchor';
  message: string;
}

/**
 * Every generated content block rests on a passage that exists (T019).
 *
 * Scaffolding is exempt for the same reason it is exempt from provenance: a
 * worked example, a step list or a word bank is new by definition and marked as
 * such. Everything else claims something, and a claim resting on nothing is the
 * failure this feature was designed around.
 */
export function checkAnchored(
  doc: IRDocument, passages: readonly AnchorPassage[],
): AnchorIssue[] {
  const known = new Set(passages.map((p) => p.id));
  const issues: AnchorIssue[] = [];

  for (const b of doc.blocks) {
    if (b.classes.includes('scaffold') || b.classes.includes('report-notes')) continue;
    // Exercises are checked by the verifier, not by the anchor: `47 × 8` asserts
    // nothing that could be false.
    if (b.classes.includes('exercise')) continue;

    const anchor = b.attrs['data-anchor'];
    if (!anchor) {
      issues.push({
        blockId: b.id, line: b.line, reason: 'no-anchor',
        message: `El bloque "${b.id}" no dice en qué parte de lo que me diste se apoya.`,
      });
      continue;
    }
    for (const id of anchor.split(/[,\s]+/).filter(Boolean)) {
      if (!known.has(id)) {
        issues.push({
          blockId: b.id, line: b.line, reason: 'unknown-anchor',
          message: `El bloque "${b.id}" dice apoyarse en «${id}», y eso no está en lo`
            + ' que me diste.',
        });
      }
    }
  }

  return issues;
}

export function assertAnchored(doc: IRDocument, passages: readonly AnchorPassage[]): void {
  const issues = checkAnchored(doc, passages);
  if (issues.length > 0) {
    throw new RampaError('ir-no-provenance',
      `${issues.length} bloque(s) no se apoyan en nada de lo que me diste.`, issues);
  }
}
