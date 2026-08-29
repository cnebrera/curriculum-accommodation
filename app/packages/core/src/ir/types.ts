/**
 * Block classes from docs/ir.md.
 *
 * `report-notes` is the model's channel INTO the report (T087). The hard rules
 * tell it "if content must be dropped, say so in the report" — and the model
 * does not write the report; `buildReport()` does, from attributes. Without this
 * block, everything it needed to declare had nowhere to go. Never learner-facing.
 */
export type BlockClass =
  | 'explanation' | 'example' | 'instruction' | 'exercise'
  | 'assessment' | 'note' | 'reference' | 'figure' | 'scaffold' | 'unsupported'
  | 'report-notes';

export interface Block {
  id: string;
  classes: BlockClass[];
  attrs: Record<string, string>;
  content: string;
  /** 1-based line in the source document, for locating a notice. */
  line: number;
  /** Notices raised against this block: injection, hidden text, unreadable. */
  notices: Notice[];
}

export interface Notice {
  kind: 'instruction-shaped' | 'hidden-text' | 'unreadable' | 'input-bound' | 'incomplete';
  /** Quoted verbatim so the teacher can judge whether it belongs on the page. */
  quote: string;
  message: string;
}

export interface IRDocument {
  frontMatter: Record<string, unknown>;
  blocks: Block[];
  /** Notices not attached to a specific block. */
  notices: Notice[];
}

export const isVerified = (d: IRDocument): boolean =>
  (d.frontMatter['extraction'] as Record<string, unknown> | undefined)?.['verified'] === true;

export const isGenerated = (d: IRDocument): boolean =>
  d.frontMatter['kind'] === 'generated';

/**
 * Whether a teacher has signed this document off (007 FR-509).
 *
 * In the core, and read from the document, so the print path and the sign-off
 * handler cannot disagree. Before this existed, `job:render` took `signedOff` as
 * a **parameter from the renderer** — so an unmarked worksheet could be produced
 * without sign-off having happened at all, while `signoff.ts` carried a comment
 * asserting the opposite.
 */
export const isSignedOff = (d: IRDocument): boolean => {
  const review = d.frontMatter['review'];
  if (review && typeof review === 'object') {
    return (review as Record<string, unknown>)['signed_off'] === true;
  }
  return false;
};

