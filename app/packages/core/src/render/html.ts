import { createRenderer } from '../ir/parse.js';
import type { IRDocument, Block } from '../ir/types.js';

/**
 * IR → HTML.
 *
 * Note the signature: this takes an IR document and nothing else. The profile is
 * not a parameter of any render function, so learner data cannot reach the page
 * — not because a check refuses, but because there is no argument to pass
 * (007 FR-506). It is the structural form of the rule, and the strongest one
 * available.
 */
export interface RenderOptions {
  /** Presentation knobs derived from the profile by the caller, never the profile itself. */
  presentation?: Presentation;
  /** Cleared only by the review step (007 FR-509). */
  signedOff?: boolean;
  title?: string;
  lang?: string;
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

function styles(p: Presentation): string {
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
${p.oneTaskPerPage ? '.exercise,.assessment{break-after:page;page-break-after:always}' : ''}
.draft-banner{position:sticky;top:0;z-index:10;background:#8a2f2c;color:#fff;
  padding:.7em 1.2em;font-weight:700;font-size:.9rem;letter-spacing:.04em;text-align:center}
@media print{.draft-banner{position:static}}
a{color:var(--accent)}
:focus-visible{outline:3px solid var(--accent);outline-offset:2px}`;
}

export function renderBlock(md: ReturnType<typeof createRenderer>, b: Block): string {
  const cls = b.classes.join(' ');
  const data = Object.entries(b.attrs)
    .filter(([k]) => k.startsWith('data-'))
    .map(([k, v]) => ` ${k}="${esc(v)}"`).join('');
  const number = b.attrs['data-number'];
  const label = number ? `<span class="n">${esc(number)}.</span> ` : '';
  return `<section id="${esc(b.id)}" class="${esc(cls)}"${data}>${label}${md.render(b.content)}</section>`;
}

export function renderHTML(doc: IRDocument, opts: RenderOptions = {}): string {
  const md = createRenderer();
  const lang = opts.lang ?? (typeof doc.frontMatter['lang'] === 'string' ? doc.frontMatter['lang'] : 'es');
  const presentation = opts.presentation ?? {};
  const signedOff = opts.signedOff === true;
  const body = doc.blocks.map((b) => renderBlock(md, b)).join('\n');

  const banner = signedOff ? '' :
    `<div class="draft-banner" role="status">BORRADOR — pendiente de revisión docente · no entregar al alumnado</div>`;

  return `<!DOCTYPE html>
<html lang="${esc(lang)}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(opts.title ?? 'Material adaptado')}</title>
<style>${styles(presentation)}</style></head>
<body>
${banner}
<main>
${body}
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
