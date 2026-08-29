import { z } from 'zod';

/**
 * What one extraction call returns (008 T003, FR-615, contracts/extraction.md).
 *
 * JSON rather than IR, and that is the load-bearing decision of this feature.
 * FR-602 requires each page validated **in code** before acceptance; asking the
 * model for Pandoc-flavoured markdown would mean writing a parser that has to
 * tell "the model wrote a malformed fenced div" apart from "the model wrote prose
 * containing a colon" — and a parser whose failures look like model failures is a
 * parser that hides them. JSON has one failure mode and this file reports it.
 *
 * The IR is still the interchange format. It is just not what crosses the wire:
 * `to-ir.ts` builds it deterministically, in the core, from what is validated
 * here.
 */
export const BLOCK_CLASSES = [
  'heading', 'paragraph', 'instruction', 'exercise',
  'aside', 'figure', 'table', 'caption',
] as const;

export const FIGURE_ROLES = ['decorative', 'informative', 'essential'] as const;
export const PAGE_QUALITIES = ['good', 'poor', 'unusable'] as const;

export type ExtractedBlockClass = typeof BLOCK_CLASSES[number];
export type FigureRole = typeof FIGURE_ROLES[number];
export type PageQuality = typeof PAGE_QUALITIES[number];

export const ExtractedBlockSchema = z.object({
  id: z.string().min(1),
  class: z.enum(BLOCK_CLASSES),
  /**
   * The printed number, verbatim. A string and never a number: `"3.a"` and
   * `"b)"` are both real, and coercing them to integers is how numbering gets
   * quietly rewritten — which Principle III forbids and a teacher would only
   * notice when a child asked about exercise 4.
   */
  number: z.string().min(1).optional(),
  text: z.string().optional(),
  role: z.enum(FIGURE_ROLES).optional(),
  short: z.string().optional(),
  long: z.string().optional(),
});

export const ExtractedPageSchema = z.object({
  page: z.number().int().positive(),
  quality: z.enum(PAGE_QUALITIES),
  /** More than one means two worksheets in one photo. The model flags; it never splits. */
  sheets: z.number().int().positive().default(1),
  blocks: z.array(ExtractedBlockSchema),
  /** What it chose to ignore or could not decide. Surfaced, never silent. */
  notes: z.array(z.string()).default([]),
});

export type ExtractedBlock = z.infer<typeof ExtractedBlockSchema>;
export type ExtractedPage = z.infer<typeof ExtractedPageSchema>;

/**
 * The same shape as a JSON Schema, for the provider call to declare.
 *
 * Hand-written rather than generated, because a generator would emit `zod`'s
 * internal encoding of `.default()` and `.optional()` and the two schemas would
 * drift. `test/extraction.test.ts` asserts they agree — which is the check that
 * makes one hand-written copy safe.
 */
export const EXTRACTION_JSON_SCHEMA = {
  type: 'object',
  required: ['page', 'quality', 'blocks'],
  additionalProperties: false,
  properties: {
    page: { type: 'integer', minimum: 1 },
    quality: { type: 'string', enum: [...PAGE_QUALITIES] },
    sheets: { type: 'integer', minimum: 1 },
    notes: { type: 'array', items: { type: 'string' } },
    blocks: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'class'],
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          class: { type: 'string', enum: [...BLOCK_CLASSES] },
          number: { type: 'string' },
          text: { type: 'string' },
          role: { type: 'string', enum: [...FIGURE_ROLES] },
          short: { type: 'string' },
          long: { type: 'string' },
        },
      },
    },
  },
} as const;

/** The marker the instructions require instead of a guess. */
export const UNREADABLE = '[UNREADABLE';

export const hasUnreadable = (page: ExtractedPage): boolean =>
  page.blocks.some((b) => (b.text ?? '').includes(UNREADABLE)
    || (b.short ?? '').includes(UNREADABLE) || (b.long ?? '').includes(UNREADABLE));
