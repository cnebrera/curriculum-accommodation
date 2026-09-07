import { draftMark } from './draft.js';
import { drawFigureBlock, isDrawnFigure } from './figures/render.js';
import { attributionFor, pictogramAlt, type Attribution } from './attribution.js';
import { parsePicto } from '../pictograms/apply.js';
import { createRenderer, learnerFacing } from '../ir/parse.js';
import type { IRDocument, Block } from '../ir/types.js';
import { ANSWER_KEY_HEADING } from '../compose/sheet.js';
import { parseFrontMatter } from '../vault/parse.js';

/**
 * IR → HTML.
 *
 * Note the signature: this takes an IR document and nothing else. The profile is
 * not a parameter of any render function, so learner data cannot reach the page
 * — not because a check refuses, but because there is no argument to pass
 * (007 FR-506). It is the structural form of the rule, and the strongest one
 * available.
 *
 * ## Accessibility target: WCAG 2.2 level AA
 *
 * Carried here from the Pandoc template this replaced (ADR 0006), because it is
 * the project's stated answer to backlog G7 and deleting the file must not delete
 * the commitment. This project produces material for learners with disabilities;
 * its own output meeting a stated standard is not optional.
 *
 * Any change below must preserve:
 *
 *   - contrast >= 4.5:1 for body text at **every** profile-driven colour setting
 *   - a visible focus state
 *   - meaningful sequence when styles are stripped
 *   - text resizable to 200% without loss of content
 *
 * `checkPhotocopy()` covers the first of these for the ink/paper pair. The rest
 * are unverified, and there is still no screen-reader test. See
 * `docs/references.md`.
 */
export interface RenderOptions {
  /** Presentation knobs derived from the profile by the caller, never the profile itself. */
  presentation?: Presentation;
  /** Cleared only by the review step (007 FR-509). */
  signedOff?: boolean;
  title?: string;
  lang?: string;
  /**
   * Pictogram id → `data:` URI (018 T020).
   *
   * The renderer never reads a file: `core` is side-effect-free and the isolation
   * suite walks it. The shell reads her set — the one place that knows which paths
   * are allowed — and hands over the bytes already encoded.
   *
   * An id absent from the map renders a named gap (FR-1616), so a moved or deleted
   * set degrades the sheet rather than failing the render.
   */
  pictogramImages?: ReadonlyMap<string, string>;
  /**
   * What each pictogram source says about itself (review COD-08, decision P40).
   *
   * Publisher id → its required credit, with `''` for «the set she has
   * configured». **Which sources apply is derived from the document**; this only
   * says what each one requires, and the caller reads it from the publisher
   * catalogue and the set's own LICENSE.
   *
   * Empty or absent still prints a line: `attributionFor` names the source it
   * cannot describe rather than inventing a credit for it, which is the defect
   * this replaced — a hardcoded ARASAAC credit printed over pictograms that were
   * not ARASAAC's.
   */
  pictogramCredits?: ReadonlyMap<string, Attribution>;
}

export interface Presentation {
  fontSize?: string; lineHeight?: string; measure?: string;
  letterSpacing?: string; wordSpacing?: string; paraGap?: string;
  ink?: string; paper?: string; accent?: string;
  oneTaskPerPage?: boolean; font?: string;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

const DEFAULTS: Required<Omit<Presentation, 'font' | 'oneTaskPerPage'>> = {
  fontSize: '14pt', lineHeight: '1.7', measure: '60ch',
  letterSpacing: '0.01em', wordSpacing: '0.05em', paraGap: '1.4em',
  ink: '#111', paper: '#fff', accent: '#0b5f5b',
};

function styles(p: Presentation, watermark: string | null): string {
  const v = { ...DEFAULTS, ...p };
  return `
:root{
  --font-size:${v.fontSize}; --line-height:${v.lineHeight}; --measure:${v.measure};
  --letter-spacing:${v.letterSpacing}; --word-spacing:${v.wordSpacing};
  --para-gap:${v.paraGap}; --ink:${v.ink}; --paper:${v.paper}; --accent:${v.accent};
  --rule:#c9d2d1;
}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);
  font-family:${p.font ? `"${p.font}",` : ''}"Atkinson Hyperlegible","Verdana",ui-sans-serif,sans-serif;
  font-size:var(--font-size);line-height:var(--line-height);
  letter-spacing:var(--letter-spacing);word-spacing:var(--word-spacing)}
main{max-width:var(--measure);margin:0 auto;padding:2.5rem 1.5rem 4rem}
p{margin:0 0 var(--para-gap)}
h1,h2,h3{line-height:1.25;margin:2em 0 .6em;font-weight:700}
.explanation{margin-bottom:var(--para-gap)}
.example{border-left:4px solid var(--rule);padding-left:1em;margin:1.5em 0}
.instruction{font-weight:700;margin:1.8em 0 .8em}
.exercise,.assessment{border:2px solid var(--rule);border-radius:10px;padding:1.4em 1.5em;margin:1.6em 0}
/* Somewhere to write (027 FR-2503). Two ruled lines, because one is never enough
   for a child's handwriting and three make a ten-question exam four pages. */
/* A drawn diagram (022). Centred, bounded, and its caption beneath it — the caption is
   what she can correct by hand and what audio and braille say. */
figure.figure{margin:1.6em 0;text-align:center}
figure.figure svg{max-width:100%;height:auto}
.figure-caption{font-size:.9em;margin:.5em 0 0}
/* A refused diagram reads as a sentence, not as a broken image: the sheet survives. */
.figure-refused{border:2px dashed var(--rule);padding:.8em 1em;margin:0;font-size:.9em}
.answer-space{margin-top:1em}
.answer-label{display:block;font-size:.85em;letter-spacing:.03em;margin-bottom:.5em}
.answer-space .rule{display:block;border-bottom:1px solid var(--rule);height:1.9em}
.assessment{border-color:var(--accent)}
.scaffold{background:#f4f7f7;border-radius:10px;padding:1.2em 1.4em;margin:1.4em 0}
.unsupported{border:2px dashed #8a2f2c;padding:1em 1.2em;margin:1.4em 0}
.figure{margin:1.6em 0}.figure img{max-width:100%;height:auto}
.figure blockquote{border-left:4px solid var(--accent);margin:.8em 0 0;padding:.2em 0 .2em 1em;font-size:.95em}
.note{font-size:.95em;border-left:4px solid var(--rule);padding-left:1em}
/* Pictograms (018). Never the picture alone: on a greyscale photocopy — which is
   the delivery format, not an edge case — a pictogram loses the colour
   distinctions its design uses, and the word is what still works. The minimum
   size comes from instructions/pictograms.md and is stated here in mm because
   this stylesheet is for paper. */
.pictos{display:flex;flex-wrap:wrap;gap:1em;margin:.8em 0}
.picto{display:flex;flex-direction:column;align-items:center;gap:.2em;
  min-width:20mm}
.picto img{width:20mm;height:20mm;object-fit:contain}
.picto-word{font-size:.85em}
.picto-missing .picto-gap{display:flex;align-items:center;justify-content:center;
  width:20mm;height:20mm;border:2px dashed var(--rule);border-radius:6px;
  font-weight:700;color:var(--rule)}
/* Structure material («028»): the day on a strip, a routine in steps.

   Block classes and CSS, not a second renderer (Principle IV, research R3). The
   pictogram cells, the named gaps, the alt text and the credit line are the ones
   «renderHTML» already produces — a strip renderer would reimplement all four and
   drift on the first change to any of them.

   35mm rather than the 20mm inline minimum: an agenda is read from across a room,
   pinned to a wall or taped inside a desk, not inside a sentence.

   «column-reverse» puts the drawing above and **her word beneath it**, which is the
   one rule that survives a greyscale photocopy (FR-2607, «010» FR-812). The cell's
   own «.picto-word» is hidden in these blocks and only in these: the block's text is
   already the word, sitting directly under the drawing, and printing it twice reads
   as a fault rather than as emphasis. */
.agenda-moment,.secuencia-step{display:flex;gap:.3em;padding:.6em;
  border:2px solid var(--rule);border-radius:8px;break-inside:avoid;
  font-size:1.05em;font-weight:600}
.agenda-moment{flex-direction:column-reverse;align-items:center;text-align:center;
  min-width:40mm}
/* A sequence is a **row**, not a card: number, drawing, label, read left to right in
   the order the steps happen. Stacked like the agenda's cells it lost exactly the thing
   that distinguishes it — a sequence is one thing after another, and a grid of squares
   says «choose one» rather than «then this». */
.secuencia-step{flex-direction:row;align-items:center;width:100%}
.secuencia-step .pictos{order:2}
.secuencia-step .n{order:1;min-width:2em;text-align:right}
.secuencia-step p{order:3;text-align:left;flex:1}
.agenda-moment .pictos,.secuencia-step .pictos{margin:0}
.agenda-moment .picto img,.secuencia-step .picto img{width:35mm;height:35mm}
.agenda-moment .picto-missing .picto-gap,
.secuencia-step .picto-missing .picto-gap{width:35mm;height:35mm}
.agenda-moment p,.secuencia-step p{margin:0}
/* A step's number is the content, not decoration: «primero el jabón» is the step. */
.secuencia-step .n{font-size:1.4em;font-weight:800}
/* The strip. «wrap» because a day with nine moments has to fit on one sheet, and a
   row that runs off the page is a row she cannot photocopy. */
main:has(.agenda-moment){display:flex;flex-wrap:wrap;gap:.8em;align-items:stretch}
main:has(.secuencia-step){display:flex;flex-direction:column;gap:.5em}
/* The licence line. Small, at the foot, and there is no setting for it. */
.picto-credit{margin-top:2.5em;padding-top:.8em;border-top:1px solid var(--rule);
  font-size:.75em;color:var(--ink)}
${p.oneTaskPerPage ? '.exercise,.assessment{break-after:page;page-break-after:always}' : ''}
.draft-banner{position:sticky;top:0;z-index:10;background:#8a2f2c;color:#fff;
  padding:.7em 1.2em;font-weight:700;font-size:.9rem;letter-spacing:.04em;text-align:center}
@media print{
  .draft-banner{position:static}
  /* On paper the banner is one line on page one, and pages two onward would
     carry nothing saying they are unreviewed. The watermark is per-page, so a
     sheet that got separated from the first one still announces itself. */
  ${watermark === null ? '' : `main::before{content:"${watermark}";
    position:fixed;top:45%;left:0;right:0;text-align:center;font-size:3rem;
    color:rgba(138,47,44,.13);transform:rotate(-24deg);pointer-events:none;z-index:-1}`}
}
a{color:var(--accent)}
:focus-visible{outline:3px solid var(--accent);outline-offset:2px}`;
}

export function renderBlock(
  md: ReturnType<typeof createRenderer>, b: Block,
  /**
   * Pictogram id → a `data:` URI (018 T020).
   *
   * Passed in, and embedded rather than linked: a sheet emailed to a colleague who
   * does not have the set must still show the pictures (FR-1615), and a `file://`
   * path would leak where her set lives into a document she sends.
   *
   * An id with no image renders a **named gap** (FR-1616): the word, marked as a
   * missing picture, with the id it wanted still in `data-picto`.
   */
  images?: ReadonlyMap<string, string>,
  /**
   * The document's other blocks, for the figure branch's quantity cross-check
   * (`022` T009, FR-2016).
   *
   * Optional so every existing caller is unchanged. A figure block rendered without them
   * still validates its glyph and still draws — what it cannot do is notice that the
   * exercise beside it was edited, which is the second net rather than the first.
   */
  blocks?: readonly Block[],
): string {
  /*
   * A **drawn** figure is drawn, and its fence is never markdown-rendered
   * (`022` T009, contract §4 rule 2).
   *
   * Before anything else in this function, because the fence is inert input and not body
   * text — and because `001`'s ingested-image figures must keep taking the ordinary path.
   * `data-figure` is the difference between the two, and neither touches the other.
   */
  if (isDrawnFigure(b)) return renderDrawnFigure(b, blocks ?? []);

  const cls = b.classes.join(' ');
  const data = Object.entries(b.attrs)
    .filter(([k]) => k.startsWith('data-'))
    .map(([k, v]) => ` ${k}="${esc(v)}"`).join('');
  const number = b.attrs['data-number'];
  const label = number ? `<span class="n">${esc(number)}.</span> ` : '';
  const pictos = renderPictos(b, images);
  /*
   * A heading on the original worksheet is a heading on the adapted one (`037` FR-3501).
   *
   * ## The sixteenth field nobody read, and this one reached the paper
   *
   * `ingest/to-ir.ts` has written `data-heading="true"` since it was written, and nothing
   * here ever looked at it — so «Los ecosistemas» came out as a paragraph and **the sheet
   * had no headings at all**. Measured, not assumed: a conformance check found zero WCAG
   * A/AA violations on that sheet, because valid HTML that says something else is still
   * valid HTML.
   *
   * It is not cosmetic. For a learner with an executive-function barrier headings are how
   * a page becomes navigable — and `recipes/core/signpost-the-page.md` is a core recipe
   * firing on `EJE>=2` that promises exactly that, so the corpus promised signposting and
   * this function flattened it. For a learner using a screen reader they are the primary
   * way of moving through a document.
   *
   * ## Inside the section, not instead of it
   *
   * The section carries the id, the classes and the whole `data-*` set — the recipe and
   * the axis that justify each change (Principle VI). A bare `<h2>` here would drop all of
   * it, turning «a change that states which recipe justifies it» into one that used to.
   *
   * ## `h2`, and every heading at the same level
   *
   * The IR marks *that* a block is a heading and carries **no level**. Deriving one from
   * order — first is the title, the rest are inside it — would assert that «Parte 2» is
   * contained in «Parte 1», which the source never said: adapting the *how* does not
   * include inventing a structure the *what* never had (Principle III, FR-3502).
   *
   * And no `<h1>`: there is no document title to be one (`opts.title` is never passed and
   * defaults to a constant), and inventing one is FR-3503. A best-practice checker will
   * keep asking for a level-one heading and keep not getting one — the honest answer,
   * with the content question behind it recorded as BACKLOG G59.
   *
   * ## Its text is text
   *
   * `esc`, not `md.render` (Principle IX, FR-3505). A heading's text comes from a
   * document, and a document is never an instruction — nor a link, nor a style. Rendering
   * it as markdown would make a heading a second parsing surface, where a `[link](…)` or
   * a stray `#` in the source talks its way into structure.
   */
  const inner = b.attrs['data-heading'] === 'true'
    ? `<h2>${esc(b.content.trim())}</h2>`
    : md.render(b.content);
  return `<section id="${esc(b.id)}" class="${esc(cls)}"${data}>${label}`
    + `${inner}${pictos}${answerSpace(b)}</section>`;
}

/**
 * A figure the code drew, or the sentence saying why it did not (`022` FR-2011/2012).
 *
 * The refusal renders **as text on the page**, and the sheet survives: a refusal that
 * lost the whole page would punish her for something the model did. And the description
 * ships either way — as the `aria-label` on the drawing, and as the visible caption
 * beneath it, because a picture nobody described is a picture the learner who most needs
 * it cannot have.
 */
function renderDrawnFigure(b: Block, blocks: readonly Block[]): string {
  const drawn = drawFigureBlock(b, blocks);
  /*
   * **Only the two attributes the code wrote reach the page** (FR-2014).
   *
   * Every other block passes its whole `data-*` set through, and for a drawn figure that
   * was a hole: `data-theme` is a **model-written string**, and an attribute value is
   * invisible to `checkOutput`, which strips tags because it models what the child reads.
   * So a learner's name arriving as a theme would have sat in the rendered file, neither
   * caught by the egress check nor absent from the document she emails.
   *
   * Found by planting a name in each of the three slots a model fills. The theme still
   * reaches the page — through the drawing and through the caption, which are exactly the
   * two places the check *can* see.
   */
  const data = ['data-figure', 'data-of']
    .filter((k) => b.attrs[k] !== undefined)
    .map((k) => ` ${k}="${esc(b.attrs[k]!)}"`).join('');
  const body = drawn.svg === null
    ? `<p class="figure-refused">${esc(drawn.refusal ?? '')}</p>`
    : `${drawn.svg}<p class="figure-caption">${esc(drawn.description)}</p>`;
  return `<figure id="${esc(b.id)}" class="figure"${data}>${body}</figure>`;
}

/**
 * Somewhere to write, for a block that asked for one (027 T014, FR-2503).
 *
 * Ruled lines and a label, and **no answer** — which is the whole point of an exam
 * question. `aria-hidden` on the rules because empty lines read aloud are noise; the
 * label is not hidden, because «Respuesta» is information.
 *
 * Keyed on `data-answer-space` and not on the `assessment` class: an ingested exam
 * already has its own space on the page it came from, and a second one under every
 * question would be this renderer inventing paper.
 */
function answerSpace(b: Block): string {
  if (!b.attrs['data-answer-space']) return '';
  return '<div class="answer-space"><span class="answer-label">Respuesta:</span>'
    + '<span class="rule" aria-hidden="true"></span>'
    + '<span class="rule" aria-hidden="true"></span></div>';
}

/**
 * The pictograms for one block, each **with its word beside it**.
 *
 * Never the picture alone: on a black-and-white photocopy — which is the delivery
 * format and not an edge case (`006` FR-427) — a pictogram loses the colour
 * distinctions its design uses, and the word is what still works.
 */
function renderPictos(b: Block, images?: ReadonlyMap<string, string>): string {
  const pairs = parsePicto(b.attrs['data-picto']);
  const onAStripEarly = b.classes.includes('agenda-moment') || b.classes.includes('secuencia-step');
  if (pairs.length === 0) {
    /*
     * On a strip, a cell with no drawing says so (`028` FR-2606).
     *
     * Everywhere else an absent `data-picto` means «this text has no pictogram», which is
     * the ordinary state of most sentences and needs no mark. On an agenda every cell is
     * meant to have one, so the same absence printed a large empty box — and an empty box
     * reads as something that failed to load, not as «this one has no drawing». Looking
     * at the printed strip is what showed it.
     *
     * Inferred from the class rather than stamped by the builder, because on these blocks
     * «no pair» and «gap» are the same fact: a flag beside it would be a second way to
     * say one thing, and the two would eventually disagree.
     */
    return onAStripEarly
      ? '<div class="pictos"><span class="picto picto-missing" role="img"'
        + ' aria-label="sin dibujo"><span class="picto-gap" aria-hidden="true">—</span>'
        + '</span></div>'
      : '';
  }

  /*
   * On a strip the block's own text **is** the word (`028` T007).
   *
   * A pictogram cell normally carries its word underneath, because inside a sentence the
   * picture arrives without one. An `agenda-moment` is different: the whole block is that
   * word, sitting directly beneath the drawing, so emitting the cell's copy printed
   * «desayuno desayuno» on every moment of the strip.
   *
   * Suppressed in the **markup** and not with CSS, which was the first attempt: the ODT
   * and the audio rendering never see this stylesheet, so a `display:none` would have
   * fixed the page and left a screen reader saying the word twice. The alt text still
   * carries it, which is what a screen reader reads, and FR-2607's rule — the word beside
   * the drawing, surviving a greyscale photocopy — is satisfied by the block's own text.
   */
  const onAStrip = b.classes.includes('agenda-moment') || b.classes.includes('secuencia-step');

  const items = pairs.map(({ word, id }) => {
    const src = images?.get(id);
    if (!src) {
      // A named gap, not a broken image and not a silent omission.
      return `<span class="picto picto-missing" role="img"`
        + ` aria-label="${esc(pictogramAlt(word))} (falta la imagen)">`
        + `<span class="picto-gap" aria-hidden="true">?</span>`
        + (onAStrip ? '' : `<span class="picto-word">${esc(word)}</span>`) + `</span>`;
    }
    return `<span class="picto">`
      + `<img src="${esc(src)}" alt="${esc(pictogramAlt(word))}">`
      + (onAStrip ? '' : `<span class="picto-word">${esc(word)}</span>`) + `</span>`;
  }).join('');

  return `<div class="pictos">${items}</div>`;
}

export function renderHTML(doc: IRDocument, opts: RenderOptions = {}): string {
  const md = createRenderer();
  const lang = opts.lang ?? (typeof doc.frontMatter['lang'] === 'string' ? doc.frontMatter['lang'] : 'es');
  const presentation = opts.presentation ?? {};
  /*
   * The mark is derived from the document (002 T016). Composed material says
   * more, because there its content — not merely its adaptation — is unreviewed,
   * and a teacher who reads the ordinary banner performs the ordinary review.
   */
  const mark = draftMark(doc, opts.signedOff);
  // learnerFacing excludes the model's report notes: structural, not a check the
  // model is asked to respect (007 FR-506's shape applied to T087).
  const body = doc.blocks.filter(learnerFacing)
    /*
     * The whole block list reaches `renderBlock` since `022`, for the figure branch's
     * quantity cross-check: a diagram has to be able to look at the exercise it claims
     * to draw (FR-2016).
     */
    .map((b) => renderBlock(md, b, opts.pictogramImages, doc.blocks)).join('\n');

  const banner = mark === null ? '' :
    `<div class="draft-banner" role="status">${esc(mark.banner)}</div>`;

  /*
   * The attribution (018 FR-1603), derived from the document and with no option to
   * remove it. At the foot: the draft mark has to stop her handing the sheet out,
   * and this is a legal line about a document that is otherwise fine.
   *
   * If it were dropped, **her** sheet would be the infringing document, not ours.
   */
  const attribution = attributionFor(doc, opts.pictogramCredits ?? new Map());
  const credit = attribution === null ? '' :
    `<footer class="picto-credit">${esc(attribution)}</footer>`;

  return `<!DOCTYPE html>
<html lang="${esc(lang)}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(opts.title ?? 'Material adaptado')}</title>
<style>${styles(presentation, mark?.watermark ?? null)}</style></head>
<body>
${banner}
<main>
${body}
${credit}
</main>
</body>
</html>`;
}

/**
 * Presentation derived from axis levels. Takes levels, not a profile, so no
 * caller can accidentally hand the profile to the renderer.
 */
export function presentationFor(levels: Partial<Record<string, number | null>>): Presentation {
  const at = (a: string, n: number) => (levels[a] ?? -1) >= n;
  const p: Presentation = {};
  if (at('PER-V', 1)) { p.fontSize = '18pt'; p.measure = '52ch'; }
  if (at('PER-V', 2)) { p.fontSize = '24pt'; p.ink = '#000'; p.paper = '#fff'; p.measure = '44ch'; }
  if (at('DEC', 1)) { p.lineHeight = '2'; p.letterSpacing = '0.05em'; p.wordSpacing = '0.16em'; }
  if (at('COG', 2) || at('ATE', 2)) p.oneTaskPerPage = true;
  if (at('REG', 2)) p.accent = '#4a5a5d';
  return p;
}

/**
 * The teacher's copy, as a page (021 T013, FR-1921/FR-1922).
 *
 * ## Why this is not `renderHTML`
 *
 * `renderHTML` renders a **learner's document**: it applies her presentation, checks for
 * undescribed figures, and carries the draft mark. None of that is right for the answer
 * key — it is a page for an adult, it needs no accommodations, and it is not a draft of
 * anything. Running it through the learner renderer would also mean one wrong call away
 * from a sheet of answers that looks exactly like a worksheet.
 *
 * ## The heading, and why it is shouted
 *
 * `ANSWER_KEY_HEADING` is the one string standing between this page and the photocopy
 * pile. Since `021` the key is printable, which is useful — she takes it to class — and is
 * precisely what makes the marking load-bearing.
 *
 * It goes **first**, before any answer: she stops reading when she has found what she came
 * for, and a warning below the answers is one she reads after printing them.
 *
 * Markdown in, HTML out, and the markdown is ours: `renderAnswerKey` wrote it from
 * computed answers, so there is no untrusted content on this path.
 */
export function renderAnswerKeyHTML(markdown: string): string {
  const md = createRenderer();
  const body = md.render(markdown);
  return [
    '<!doctype html>',
    '<html lang="es"><head><meta charset="utf-8">',
    '<title>Soluciones · no repartir</title>',
    '<style>',
    // Deliberately plain and deliberately unlike a learner's sheet: this page must not
    // be mistakable for one at arm's length, in a stack, in a hurry.
    'body{font:16px/1.5 system-ui,sans-serif;max-width:34em;margin:2rem auto;padding:0 1rem}',
    '.key-warn{border:3px solid #8a1c00;background:#fff2ee;color:#8a1c00;',
    'font-weight:700;padding:.8rem 1rem;margin:0 0 1.5rem;text-transform:uppercase;',
    'letter-spacing:.02em}',
    '@media print{.key-warn{border-width:4px}}',
    '</style></head><body>',
    `<p class="key-warn">${ANSWER_KEY_HEADING}</p>`,
    body,
    '</body></html>',
  ].join('\n');
}

/**
 * The ACNS, as a page she can print (017 FR-1516, decision P46).
 *
 * ## Why not `renderHTML`
 *
 * Same argument as the answer key, for the opposite reason: `renderHTML` renders a
 * **learner's** document — her presentation, her axes, her pictograms, the
 * undescribed-figure check. An ACNS is a document for adults, going to Séneca. Running
 * it through the learner renderer would apply a child's accommodations to an
 * administrative form, and put it one wrong call away from looking like a worksheet.
 *
 * ## The mark, and where it comes from
 *
 * The banner and the watermark come from `draftMark`, which reads the **document's**
 * front matter. There is no `signedOff` parameter and there must not be: that exact
 * parameter is how `job:render` could once produce an unmarked sheet with no sign-off
 * having happened (007 FR-509). The watermark matters more here than anywhere: an
 * unsigned ACNS reaches Séneca by being read off paper, and page two of a stapled
 * draft carries nothing otherwise.
 *
 * The front matter is not printed — it is machinery, and «kind: acns» on a page bound
 * for a tutor's desk is noise.
 */
export function renderAcnsHTML(raw: string): string {
  const { data, body: markdown } = parseFrontMatter(raw);
  const mark = draftMark({ frontMatter: data });
  const md = createRenderer();
  return [
    '<!doctype html>',
    '<html lang="es"><head><meta charset="utf-8">',
    /*
     * The tab title, and it stays territory-neutral on purpose (`029` FR-2704): what
     * the document is called comes from her normativa and is in the document's own
     * heading, which is where she reads it. A title bar is not worth threading a corpus
     * through, and «ACNS» there was one community's word in every teacher's window.
     */
    `<title>${mark ? 'BORRADOR — adaptación curricular' : 'Adaptación curricular'}</title>`,
    '<style>',
    'body{font:16px/1.5 system-ui,sans-serif;max-width:40em;margin:2rem auto;padding:0 1rem}',
    'blockquote{border-left:4px solid #8a2f2c;margin:1.2rem 0;padding:.2rem 0 .2rem 1rem;',
    'color:#4a3a39}',
    'h1{font-size:1.5rem;line-height:1.25}h2{font-size:1.15rem;margin-top:2rem}',
    'table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:.3rem .6rem}',
    // Both only when there is a mark: a signed page carrying the rule for a banner it
    // does not have is dead weight in a document that goes to somebody's desk — and it
    // makes «is this page marked?» unanswerable by looking at it.
    mark === null ? '' : '.draft-banner{background:#8a2f2c;color:#fff;padding:.7em 1.2em;'
      + 'font-weight:700;font-size:.9rem;letter-spacing:.04em;text-align:center;'
      + 'margin:0 0 1.5rem}',
    mark === null ? '' : `@media print{main::before{content:"${mark.watermark}";
      position:fixed;top:45%;left:0;right:0;text-align:center;font-size:3rem;
      color:rgba(138,47,44,.13);transform:rotate(-24deg);pointer-events:none;z-index:-1}}`,
    '</style></head><body>',
    mark === null ? '' : `<p class="draft-banner">${esc(mark.banner)}</p>`,
    '<main>',
    md.render(markdown),
    '</main>',
    '</body></html>',
  ].join('\n');
}
