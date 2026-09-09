import { describe, it, expect } from 'vitest';
import { parseIR } from '../src/ir/parse.js';
import { renderHTML } from '../src/render/html.js';

/**
 * The accessible face travels inside the sheet (backlog G76).
 *
 * The sheet declared `"Atkinson Hyperlegible"` and carried no `@font-face`, so the face
 * was used only where it happened to be installed. In the offscreen window that makes
 * the PDF it is not, and the first real PDF came out in **Verdana** — the face `010`
 * chose for legibility, bundled for the application's own interface, never reached the
 * one surface a child holds. `core` reads no files, so the caller hands it `data:` URIs,
 * exactly as it does for pictograms.
 */
const doc = parseIR('---\nkind: "worksheet"\n---\n\n::: {#b1 .explanation}\nHola.\n:::\n');

describe('the sheet embeds the face it names', () => {
  it('emits one @font-face per face it is given', () => {
    const html = renderHTML(doc, { fontFaces: [
      { family: 'Atkinson Hyperlegible', weight: 400, dataUri: 'data:font/woff2;base64,AAAA' },
      { family: 'Atkinson Hyperlegible', weight: 700, dataUri: 'data:font/woff2;base64,BBBB' },
    ] });
    expect(html.match(/@font-face/g)).toHaveLength(2);
    expect(html).toMatch(/font-family:"Atkinson Hyperlegible";src:url\(data:font\/woff2;base64,AAAA\) format\("woff2"\);font-weight:400/);
    expect(html).toMatch(/font-weight:700/);
    // A brief blank beats a flash of Verdana, the same call tokens.css makes.
    expect(html).toMatch(/font-display:block/);
  });

  it('emits none when given none, rather than a broken rule', () => {
    expect(renderHTML(doc)).not.toMatch(/@font-face/);
  });
});
