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
