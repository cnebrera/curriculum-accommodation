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
  | 'report-notes'
  /**
   * Structure material (`028`): one moment of a day, one step of a routine.
   *
   * They are block classes rather than a document type because everything downstream —
   * the renderer, the photocopy check, the pictogram cells, the attribution — walks
   * blocks. A parallel document type would need every one of those written again.
   *
   * A social story has no class of its own: it is ordinary `explanation` paragraphs, and
   * that is the point — what makes it a story is the corpus that drafted it, not a tag.
   */
  | 'agenda-moment' | 'secuencia-step';

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

/**
 * Anything with front matter, which is all these three predicates ever read.
 *
 * Widened on 2026-09-04 for the ACNS document (P46): it is a document with front
 * matter and no IR blocks, and it needs the same answer to «is this signed?» as a
 * worksheet. The alternative was a second `isSignedOff` reading the same key from the
 * same block — two implementations of the one fact that stands between an unreviewed
 * document and a child's hands.
 */
export type HasFrontMatter = { frontMatter: Record<string, unknown> };

export const isVerified = (d: HasFrontMatter): boolean =>
  (d.frontMatter['extraction'] as Record<string, unknown> | undefined)?.['verified'] === true;

/**
 * Composed by Rampa rather than read from something (002, corrected for FR-126).
 *
 * Reads `generated: true`, **not** `kind`. It read `kind === 'generated'` until
 * 2026-08-31, which meant a composed sheet's `kind` field said «generated» — so
 * `materialKind()` resolved it to `null` and the sheet reached adaptation with no
 * kind rule governing it. Two different facts were sharing one field, and the one
 * that lost is the one `012` exists for.
 *
 * The old spelling is still accepted, because a vault written before this change has
 * documents in it and a teacher's material must not stop being recognised.
 */
export const isGenerated = (d: HasFrontMatter): boolean =>
  d.frontMatter['generated'] === true
  || d.frontMatter['kind'] === 'generated'
  || d.frontMatter['source'] === 'composed'
  /*
   * Structure material (`028` FR-2604): an agenda, a sequence, a social story.
   *
   * Widened by one disjunct rather than given a path of its own, so `resolveDocument`
   * serves it, the draft mark derives from it, sign-off signs it and the record lists
   * it — all of that already exists and none of it needed to learn a new shape.
   *
   * **An ingested reading is still not this.** `source: photos` or `source: pegado` is a
   * document somebody else wrote that Rampa read, and printing one would be handing a
   * teacher back her own scan with Rampa's marks on it. What these three sources have in
   * common is that Rampa produced the page.
   */
  || d.frontMatter['source'] === 'structure';

/**
 * Whether a teacher has signed this document off (007 FR-509).
 *
 * In the core, and read from the document, so the print path and the sign-off
 * handler cannot disagree. Before this existed, `job:render` took `signedOff` as
 * a **parameter from the renderer** — so an unmarked worksheet could be produced
 * without sign-off having happened at all, while `signoff.ts` carried a comment
 * asserting the opposite.
 */
export const isSignedOff = (d: HasFrontMatter): boolean => {
  const review = d.frontMatter['review'];
  if (review && typeof review === 'object') {
    return (review as Record<string, unknown>)['signed_off'] === true;
  }
  return false;
};

