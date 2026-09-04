import { draftMark } from './draft.js';
import { attributionFor, pictogramAlt, type Attribution } from './attribution.js';
import { parsePicto } from '../pictograms/apply.js';
import { createRenderer, learnerFacing } from '../ir/parse.js';
import type { IRDocument, Block } from '../ir/types.js';
import { ANSWER_KEY_HEADING } from '../compose/sheet.js';

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
): string {
  const cls = b.classes.join(' ');
  const data = Object.entries(b.attrs)
    .filter(([k]) => k.startsWith('data-'))
    .map(([k, v]) => ` ${k}="${esc(v)}"`).join('');
  const number = b.attrs['data-number'];
  const label = number ? `<span class="n">${esc(number)}.</span> ` : '';
  const pictos = renderPictos(b, images);
  return `<section id="${esc(b.id)}" class="${esc(cls)}"${data}>${label}`
    + `${md.render(b.content)}${pictos}</section>`;
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
  if (pairs.length === 0) return '';

  const items = pairs.map(({ word, id }) => {
    const src = images?.get(id);
    if (!src) {
      // A named gap, not a broken image and not a silent omission.
      return `<span class="picto picto-missing" role="img"`
        + ` aria-label="${esc(pictogramAlt(word))} (falta la imagen)">`
        + `<span class="picto-gap" aria-hidden="true">?</span>`
        + `<span class="picto-word">${esc(word)}</span></span>`;
    }
    return `<span class="picto">`
      + `<img src="${esc(src)}" alt="${esc(pictogramAlt(word))}">`
      + `<span class="picto-word">${esc(word)}</span></span>`;
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
    .map((b) => renderBlock(md, b, opts.pictogramImages)).join('\n');

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
