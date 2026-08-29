import { describe, it, expect } from 'vitest';
import {
  ExtractedPageSchema, EXTRACTION_JSON_SCHEMA, BLOCK_CLASSES, FIGURE_ROLES,
  type ExtractedPage,
} from '../src/ingest/schema.js';
import { validatePage } from '../src/ingest/validate.js';
import { pagesToIR, irToMarkdown } from '../src/ingest/to-ir.js';
import { planDownscale, tooSmallToRead } from '../src/ingest/downscale.js';
import { parseIR } from '../src/ir/parse.js';

/**
 * Extraction, validation and conversion (008 T008, quickstart §1).
 *
 * This is the stage where a wrong result reads perfectly plausibly: an extraction
 * that renumbered exercise 4 produces a worksheet that is internally consistent,
 * prints beautifully, and confuses one child in a classroom three days later.
 * Nothing downstream can detect it. So the properties that matter are all about
 * things surviving verbatim, and about a bad answer being *distinguishable* from
 * a flagged one.
 */
const goodPage = (over: Partial<ExtractedPage> = {}): ExtractedPage => ({
  page: 1,
  quality: 'good',
  sheets: 1,
  notes: [],
  blocks: [
    { id: 'b1', class: 'heading', text: 'Los ecosistemas' },
    { id: 'b2', class: 'instruction', text: 'Lee el texto y responde.' },
    { id: 'b3', class: 'exercise', number: '3', text: '¿Qué come el búho?' },
    { id: 'b4', class: 'figure', role: 'informative',
      short: 'Un búho en una rama.', long: 'Un búho posado en una rama seca, de noche.' },
  ],
  ...over,
});

describe('the schema', () => {
  it('accepts a well-formed page', () => {
    expect(ExtractedPageSchema.safeParse(goodPage()).success).toBe(true);
  });

  it('defaults sheets and notes, so an older model answer still parses', () => {
    const p = ExtractedPageSchema.parse({ page: 1, quality: 'good', blocks: [] });
    expect(p.sheets).toBe(1);
    expect(p.notes).toEqual([]);
  });

  it('keeps a printed number as a string', () => {
    /*
     * The reason this is a string and not a number: `"3.a"` and `"b)"` are both
     * real printed labels, and coercing them to integers is how numbering gets
     * quietly rewritten — the exact failure Principle III forbids.
     */
    for (const number of ['3', '3.a', 'b)', 'IV', '10 bis']) {
      const p = ExtractedPageSchema.parse({
        page: 1, quality: 'good',
        blocks: [{ id: 'x', class: 'exercise', number, text: 'q' }],
      });
      expect(p.blocks[0]!.number).toBe(number);
    }
  });

  it('rejects a number that arrived as an integer rather than as printed', () => {
    expect(ExtractedPageSchema.safeParse({
      page: 1, quality: 'good',
      blocks: [{ id: 'x', class: 'exercise', number: 3, text: 'q' }],
    }).success).toBe(false);
  });

  it('rejects an unknown block class rather than mapping it to something', () => {
    expect(ExtractedPageSchema.safeParse({
      page: 1, quality: 'good',
      blocks: [{ id: 'x', class: 'sidebar', text: 'q' }],
    }).success).toBe(false);
  });

  it('agrees with the JSON Schema the provider call declares', () => {
    /*
     * Two hand-written copies of one truth, which is where every defect in this
     * project has lived. They are checked against each other rather than trusted.
     */
    const props = EXTRACTION_JSON_SCHEMA.properties;
    expect(props.quality.enum).toEqual([...['good', 'poor', 'unusable']]);
    expect(props.blocks.items.properties.class.enum).toEqual([...BLOCK_CLASSES]);
    expect(props.blocks.items.properties.role.enum).toEqual([...FIGURE_ROLES]);
    expect(props.blocks.items.properties.number.type).toBe('string');
    expect(EXTRACTION_JSON_SCHEMA.required).toEqual(['page', 'quality', 'blocks']);
  });
});

describe('the validator decides, and the three outcomes are distinct', () => {
  it('accepts a good page', () => {
    const v = validatePage(goodPage(), 1);
    expect(v.outcome).toBe('accept');
  });

  it('retries a malformed answer', () => {
    expect(validatePage({ nonsense: true }).outcome).toBe('retry');
    expect(validatePage('not even an object').outcome).toBe('retry');
    expect(validatePage(null).outcome).toBe('retry');
  });

  it('retries duplicate block ids', () => {
    const v = validatePage(goodPage({
      blocks: [
        { id: 'b1', class: 'paragraph', text: 'uno' },
        { id: 'b1', class: 'paragraph', text: 'dos' },
      ],
    }));
    expect(v.outcome).toBe('retry');
    if (v.outcome === 'retry') expect(v.problems.join(' ')).toContain('b1');
  });

  it('retries a figure with no description, because that is the failure we exist to prevent', () => {
    const v = validatePage(goodPage({
      blocks: [{ id: 'f1', class: 'figure', role: 'essential', short: 'Un mapa.' }],
    }));
    expect(v.outcome).toBe('retry');
    if (v.outcome === 'retry') expect(v.problems.join(' ')).toMatch(/descripción larga/);
  });

  it('retries a figure with no role at all', () => {
    expect(validatePage(goodPage({
      blocks: [{ id: 'f1', class: 'figure', short: 'x', long: 'y' }],
    })).outcome).toBe('retry');
  });

  it('accepts a decorative figure with no description', () => {
    // Decorative is the one role that legitimately needs none.
    expect(validatePage(goodPage({
      blocks: [{ id: 'f1', class: 'figure', role: 'decorative' }],
    })).outcome).toBe('accept');
  });

  /**
   * The distinction that costs money if it is collapsed.
   *
   * `stop` and `retry` are cheaper to write as one thing, and writing them as one
   * thing charges a teacher twice for a photograph she has to retake either way.
   */
  it('STOPS on an unusable photo rather than retrying it', () => {
    const v = validatePage(goodPage({ quality: 'unusable' }));
    expect(v.outcome).toBe('stop');
    if (v.outcome === 'stop') {
      expect(v.advice).toMatch(/más luz/);
      // Her next action is physical, so the advice must be physical.
      expect(v.advice).not.toMatch(/reintenta|vuelve a probar$/i);
    }
  });

  it('STOPS on two worksheets in one photo, and never splits them itself', () => {
    const v = validatePage(goodPage({ sheets: 2 }));
    expect(v.outcome).toBe('stop');
    if (v.outcome === 'stop') expect(v.advice).toMatch(/cada hoja por separado/);
  });

  it('accepts a poor-but-readable page', () => {
    expect(validatePage(goodPage({ quality: 'poor' })).outcome).toBe('accept');
  });

  it('retries a page that answered about a different page', () => {
    expect(validatePage(goodPage({ page: 7 }), 1).outcome).toBe('retry');
  });
});

describe('flagging is rewarded, never punished', () => {
  it('accepts an unreadable marker and puts it first', () => {
    /*
     * `instructions/ingest.md` tells the model to flag rather than guess, and
     * calls guessing "the most dangerous thing you can do in this pipeline". An
     * instruction like that is only credible if the pipeline accepts the flag.
     */
    const v = validatePage(goodPage({
      blocks: [{ id: 'b1', class: 'paragraph', text: 'Recuerda: [UNREADABLE: palabra borrosa]' }],
    }));
    expect(v.outcome).toBe('accept');
    if (v.outcome === 'accept') {
      expect(v.flags[0]!.kind).toBe('unreadable');
      expect(v.flags[0]!.message).toMatch(/escríbelo tú/i);
    }
  });

  it('flags an unreadable inside a figure description too', () => {
    const v = validatePage(goodPage({
      blocks: [{ id: 'f1', class: 'figure', role: 'essential',
                 short: 'Un gráfico.', long: 'Un gráfico de [UNREADABLE]' }],
    }));
    expect(v.outcome).toBe('accept');
    if (v.outcome === 'accept') expect(v.flags.some((f) => f.kind === 'unreadable')).toBe(true);
  });

  it('orders the flags as FR-608 requires: unreadable, then essential figures, then notes', () => {
    const v = validatePage(goodPage({
      notes: ['Había un menú de la plataforma alrededor; lo he ignorado.'],
      blocks: [
        { id: 'f1', class: 'figure', role: 'essential', short: 'Un mapa.', long: 'Un mapa de Europa.' },
        { id: 'b1', class: 'paragraph', text: '[UNREADABLE: línea cortada]' },
      ],
    }));
    expect(v.outcome).toBe('accept');
    if (v.outcome === 'accept') {
      expect(v.flags.map((f) => f.kind)).toEqual(['unreadable', 'essential-figure', 'note']);
    }
  });

  it('flags non-monotone numbering without rejecting it', () => {
    // A worksheet may genuinely restart numbering per section. Rejecting that
    // throws away a good extraction; not mentioning it hides a renumbering.
    const v = validatePage(goodPage({
      blocks: [
        { id: 'b1', class: 'exercise', number: '5', text: 'a' },
        { id: 'b2', class: 'exercise', number: '2', text: 'b' },
      ],
    }));
    expect(v.outcome).toBe('accept');
    if (v.outcome === 'accept') expect(v.flags.some((f) => f.kind === 'numbering')).toBe(true);
  });

  it('does not flag numbering it cannot read as numbers', () => {
    const v = validatePage(goodPage({
      blocks: [
        { id: 'b1', class: 'exercise', number: 'a)', text: 'a' },
        { id: 'b2', class: 'exercise', number: 'b)', text: 'b' },
      ],
    }));
    expect(v.outcome).toBe('accept');
    if (v.outcome === 'accept') expect(v.flags.filter((f) => f.kind === 'numbering')).toEqual([]);
  });
});

describe('conversion to IR', () => {
  it('carries the printed number through verbatim', () => {
    for (const number of ['3', '3.a', 'b)', '10 bis']) {
      const doc = pagesToIR([goodPage({
        blocks: [{ id: 'x', class: 'exercise', number, text: 'q' }],
      })], { source: 'photos' });
      expect(doc.blocks[0]!.attrs['data-number']).toBe(number);
    }
  });

  it('keeps the unreadable marker in the text AND raises a notice', () => {
    // Both, not either: the text keeps it so nothing downstream renders a gap as
    // prose, and the notice is what puts it at the top of verification.
    const doc = pagesToIR([goodPage({
      blocks: [{ id: 'b1', class: 'paragraph', text: 'Recuerda: [UNREADABLE: palabra borrosa]' }],
    })], { source: 'photos' });
    expect(doc.blocks[0]!.content).toContain('[UNREADABLE: palabra borrosa]');
    expect(doc.blocks[0]!.notices[0]!.kind).toBe('unreadable');
    expect(doc.blocks[0]!.notices[0]!.quote).toBe('palabra borrosa');
  });

  it('never marks a fresh extraction as verified', () => {
    // FR-608 gates adaptation on this. A field written at conversion time is a
    // field something will eventually write for convenience.
    const doc = pagesToIR([goodPage()], { source: 'photos' });
    expect((doc.frontMatter['extraction'] as Record<string, unknown>)['verified']).toBe(false);
  });

  it('qualifies block ids by page, so two pages using b1 do not collide', () => {
    const doc = pagesToIR([
      goodPage({ page: 1, blocks: [{ id: 'b1', class: 'paragraph', text: 'uno' }] }),
      goodPage({ page: 2, blocks: [{ id: 'b1', class: 'paragraph', text: 'dos' }] }),
    ], { source: 'photos' });
    expect(doc.blocks.map((b) => b.id)).toEqual(['p1-b1', 'p2-b1']);
  });

  it('records the page and the source block, so a notice can be located on paper', () => {
    const doc = pagesToIR([goodPage({ page: 4 })], { source: 'photos' });
    expect(doc.blocks[0]!.attrs['data-page']).toBe('4');
    expect(doc.blocks[0]!.attrs['data-source-id']).toBe('b1');
  });

  it('orders pages as she counts them, whatever order they arrived in', () => {
    const doc = pagesToIR([
      goodPage({ page: 3, blocks: [{ id: 'a', class: 'paragraph', text: 'tres' }] }),
      goodPage({ page: 1, blocks: [{ id: 'a', class: 'paragraph', text: 'uno' }] }),
    ], { source: 'photos' });
    expect(doc.blocks.map((b) => b.content)).toEqual(['uno', 'tres']);
  });

  it('carries a figure role and both descriptions', () => {
    const doc = pagesToIR([goodPage()], { source: 'photos' });
    const fig = doc.blocks.find((b) => b.classes.includes('figure'))!;
    expect(fig.attrs['data-role']).toBe('informative');
    expect(fig.attrs['data-alt']).toBe('Un búho en una rama.');
    expect(fig.attrs['data-longdesc']).toContain('rama seca');
  });

  it('round-trips through the existing IR parser', () => {
    /*
     * The IR on disk is the interchange format and a teacher may hand-edit it,
     * so what this writes has to be exactly what `parseIR` reads. A converter
     * whose output its own parser cannot read is two formats, not one.
     */
    const doc = pagesToIR([goodPage()], { source: 'photos', frontMatter: { lang: 'es' } });
    const reparsed = parseIR(irToMarkdown(doc));
    expect(reparsed.blocks.map((b) => b.id)).toEqual(doc.blocks.map((b) => b.id));
    expect(reparsed.blocks.map((b) => b.content)).toEqual(doc.blocks.map((b) => b.content));
    expect(reparsed.blocks[2]!.attrs['data-number']).toBe('3');
    expect(reparsed.frontMatter['lang']).toBe('es');
  });

  it('survives a page with no blocks at all', () => {
    const doc = pagesToIR([goodPage({ blocks: [] })], { source: 'photos' });
    expect(doc.blocks).toEqual([]);
    expect(doc.frontMatter['source']).toBe('photos');
  });

  /**
   * The assertion the whole two-path design rests on (quickstart §1).
   *
   * "Both produce the same IR; nothing downstream knows which path ran" is a
   * claim, and a claim with no check on it drifts the first time someone adds a
   * field on one side.
   */
  it('produces byte-identical IR from the vision path and the digital path', () => {
    const content = goodPage().blocks;
    const fromVision = pagesToIR([{ page: 1, quality: 'good', sheets: 1, notes: [], blocks: content }],
      { source: 'photos' });
    const fromDigital = pagesToIR([{ page: 1, quality: 'good', sheets: 1, notes: [], blocks: content }],
      { source: 'pdf-digital' });

    // Only the declared source may differ. Everything a downstream stage reads
    // must be identical.
    expect(irToMarkdown({ ...fromDigital, frontMatter: { ...fromDigital.frontMatter, source: 'photos' } }))
      .toBe(irToMarkdown(fromVision));
    expect(fromVision.frontMatter['source']).toBe('photos');
    expect(fromDigital.frontMatter['source']).toBe('pdf-digital');
  });
});

describe('how large an image is sent', () => {
  it('shrinks a phone photograph to the bound, keeping its shape', () => {
    const p = planDownscale({ width: 4032, height: 3024 }, 1600);
    expect(p.needed).toBe(true);
    expect(p.target.width).toBe(1600);
    expect(p.target.height).toBe(1200);   // 4:3 preserved
  });

  it('works on a portrait page, where the long edge is the height', () => {
    const p = planDownscale({ width: 3024, height: 4032 }, 1600);
    expect(p.target.height).toBe(1600);
    expect(p.target.width).toBe(1200);
  });

  it('never upscales', () => {
    // Enlarging invents detail that is not there — the one thing this pipeline
    // must never do — and it costs more.
    const p = planDownscale({ width: 900, height: 600 }, 1600);
    expect(p.needed).toBe(false);
    expect(p.target).toEqual({ width: 900, height: 600 });
    expect(p.scale).toBe(1);
  });

  it('never produces a zero dimension from an extreme aspect ratio', () => {
    const p = planDownscale({ width: 8000, height: 3 }, 1600);
    expect(p.target.height).toBeGreaterThanOrEqual(1);
  });

  it('returns a harmless plan for a broken decode', () => {
    for (const size of [{ width: 0, height: 0 }, { width: -1, height: 10 }, { width: NaN, height: 10 }]) {
      const p = planDownscale(size, 1600);
      expect(p.needed).toBe(false);
    }
  });

  it('says when a photo is too small to be worth a call', () => {
    // Below this, 11pt print is illegible and the extraction flags or guesses
    // everything — either of which costs a call for nothing.
    expect(tooSmallToRead({ width: 640, height: 480 })).toBe(true);
    expect(tooSmallToRead({ width: 1024, height: 768 })).toBe(false);
  });
});
