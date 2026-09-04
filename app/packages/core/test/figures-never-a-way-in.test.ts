import { describe, it, expect } from 'vitest';
import {
  parseIR, renderHTML, renderLinear, renderODT, presentationFor, drawFigureBlock,
} from '../src/index.js';

/**
 * A diagram cannot become a way in (022 T002, FR-2009/2010/2011, SC-2002).
 *
 * ## Why this is asserted over the rendered document and not over the validator
 *
 * `figures-refuse.test.ts` proves the wall refuses. This proves the wall is **in the
 * road**: a document that arrives with a hostile figure block — from a hand edit, an
 * injection, a vault somebody else wrote — renders to a sheet that still exists, minus
 * the diagram, with the refusal said out loud, and with nothing executable or fetchable
 * anywhere in the output string.
 *
 * The distinction matters because the compose-time check and the render-time check guard
 * different moments. The vault is hand-editable, which is the point of it; a figure block
 * read off disk is content (`007`), whatever wrote it.
 */
const PAYLOADS: ReadonlyArray<[string, string]> = [
  ['a script', '<script>fetch("http://x.test")</script>'],
  ['an event handler', '<rect width="8" height="8" onload="fetch(1)"/>'],
  ['an href', '<a href="http://x.test"><rect width="8"/></a>'],
  ['an xlink:href', '<use xlink:href="http://x.test#g"/>'],
  ['an image', '<image href="http://x.test/a.png" width="8" height="8"/>'],
  ['a url() paint server', '<rect width="8" height="8" fill="url(http://x.test/a)"/>'],
  ['a data: scheme', '<rect width="8" height="8" fill="data:image/svg+xml,PHN2Zz4="/>'],
  ['a style element', '<style>@import url(http://x.test/a.css)</style>'],
  ['a foreignObject', '<foreignObject><iframe src="http://x.test"/></foreignObject>'],
  ['an animate', '<rect width="8"><animate attributeName="x" to="9"/></rect>'],
];

const sheetWith = (glyph: string): string => `---
generated: true
kind: worksheet
---

::: {#g1-e1 .exercise data-objective="Multiplicar con llevadas"}
1. 4 × 3 =
:::

::: {#g1-e1-fig .figure data-figure="grid" data-of="g1-e1" data-rows="4" data-cols="3" data-description="Una rejilla de 4 filas por 3 columnas: 12 casillas."}
\`\`\`svg
${glyph}
\`\`\`
:::
`;

const LINEAR = {
  modality: 'audio' as const,
  spatialPhrases: [] as string[],
  answerSpace: 'Aquí hay un hueco para contestar.',
};

/**
 * Every rendering of a document, as one string each — **with the refusal sentences
 * removed**.
 *
 * That removal is not a loosening, and it took a failing test to see why. A refusal
 * quotes the offending token («lleva «url(», que apunta a algo de fuera»), because
 * Principle IX says quoted and never paraphrased — so the refused document legitimately
 * contains the string `url(` as escaped text in a paragraph. What FR-2010 forbids is a
 * *reference*, and a quotation is not one. The quoting itself is asserted separately
 * below, so nothing is taken on trust.
 */
const withoutRefusals = (out: string): string => out
  .replace(/<p class="figure-refused">[\s\S]*?<\/p>/g, '')
  .replace(/<text:p text:style-name="Apoyo">[\s\S]*?<\/text:p>/g, '')
  .replace(/No he dibujado este diagrama[^\n]*/g, '');

const renderings = (markdown: string): Array<[string, string]> => {
  const doc = parseIR(markdown);
  return [
    ['HTML', renderHTML(doc, { presentation: presentationFor({}) })],
    ['ODT', new TextDecoder().decode(renderODT(doc))],
    ['linear', renderLinear(doc, LINEAR).blocks
      .map((b) => `${b.text} ${b.because ?? ''}`).join('\n')],
  ];
};

describe('a hostile figure block, rendered', () => {
  for (const [what, glyph] of PAYLOADS) {
    it(`refuses ${what} and keeps the sheet`, () => {
      for (const [modality, out] of renderings(sheetWith(glyph))) {
        // (a) The sheet still exists, minus the diagram (FR-2011).
        expect(out, `${modality} lost the exercise`).toContain('4 × 3');

        // (b) Nothing executable and nothing fetchable, anywhere in the output.
        const withoutNamespace = withoutRefusals(out)
          .replace(/xmlns[^\s>"]*="[^"]*"/g, '');
        for (const token of ['<script', 'onload=', 'href', 'url(', 'http', 'data:image']) {
          expect(withoutNamespace, `${what} · ${token} survived into the ${modality}`)
            .not.toContain(token);
        }
      }
    });
  }

  it('and says why, in her language, with the token quoted', () => {
    const html = renderHTML(parseIR(sheetWith('<rect width="8" onload="x()"/>')),
      { presentation: presentationFor({}) });
    expect(html).toContain('No he dibujado este diagrama');
    expect(html).toContain('onload');
  });

  /**
   * The one that would make everything else pointless.
   *
   * If raw SVG in an **ordinary** block's content were drawn, the fenced-figure branch
   * would not be the only road from model markup to a drawing — and every check in this
   * feature would be guarding one of two doors. `markdown-it` runs `html: false`, so this
   * is escaped text, and the failure mode of a forgetful renderer is ugly, visible and
   * safe.
   */
  it('raw markup in an ordinary block stays escaped text', () => {
    const doc = parseIR(`---
generated: true
---

::: {#b1 .explanation}
<script>alert(1)</script><rect width="8" onload="x()"/>
:::
`);
    const html = renderHTML(doc, { presentation: presentationFor({}) });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain(' onload="x()"');
  });

  it('and a figure block with no `data-figure` is `001`’s ingested image, untouched', () => {
    // The two figure paths coexist and neither touches the other. An ingested figure has
    // a description and no `data-figure`; drawing it would be inventing a diagram for a
    // photograph.
    const doc = parseIR(`---
extraction:
  verified: true
---

::: {#f1 .figure data-description="Un dibujo de una casa."}
casa
:::
`);
    const html = renderHTML(doc, { presentation: presentationFor({}) });
    expect(html).toContain('data-description');
    expect(html).not.toContain('<svg');
  });
});

describe('a good figure block, rendered', () => {
  const GOOD = sheetWith('<rect width="10" height="14" rx="2" fill="#fff" stroke="#333"/>');

  it('draws twelve cells, because the exercise says twelve', () => {
    const html = renderHTML(parseIR(GOOD), { presentation: presentationFor({}) });
    expect((html.match(/<g transform="translate\(/g) ?? []).length).toBe(12);
  });

  it('carries its description as the caption and as the label', () => {
    const html = renderHTML(parseIR(GOOD), { presentation: presentationFor({}) });
    expect(html).toContain('aria-label="Una rejilla de 4 filas por 3 columnas: 12 casillas."');
    expect(html).toContain('class="figure-caption"');
  });

  it('and references nothing, even when it drew successfully', () => {
    const html = renderHTML(parseIR(GOOD), { presentation: presentationFor({}) })
      .replace(/xmlns="[^"]*"/g, '');
    for (const token of ['href', 'url(', 'http', '<use', '<image']) {
      expect(html, token).not.toContain(token);
    }
  });
});

describe('the quantities are cross-checked against the exercise (FR-2016)', () => {
  it('a diagram whose exercise was edited is refused, not drawn', () => {
    /*
     * The second net. Correcting a composition re-runs `runCompose`, so figures are
     * rebuilt with the sheet — but a document edited by hand in the vault has no such
     * path, and a stale diagram is a wrong picture beside a right exercise.
     */
    const edited = sheetWith('<rect width="8" height="8" fill="none" stroke="black"/>')
      .replace('1. 4 × 3 =', '1. 5 × 3 =');
    const html = renderHTML(parseIR(edited), { presentation: presentationFor({}) });
    expect(html).toContain('sus cantidades ya no son las del ejercicio');
    expect(html).not.toContain('<svg');
    // And the exercise itself survives.
    expect(html).toContain('5 × 3');
  });

  it('but a renamed exercise loses nothing, because ids move and numbers do not', () => {
    // A recipe that renumbers a page would otherwise delete every diagram for a change
    // that broke nothing. This check is about numbers that moved, not ids that did.
    const renamed = sheetWith('<rect width="8" height="8" fill="none" stroke="black"/>')
      .replace('{#g1-e1 .exercise', '{#b7 .exercise');
    const html = renderHTML(parseIR(renamed), { presentation: presentationFor({}) });
    expect(html).toContain('<svg');
  });

  it('and a block with no quantities at all is refused rather than drawn empty', () => {
    const doc = parseIR(`---
generated: true
---

::: {#f1 .figure data-figure="grid" data-of="g1-e1" data-description="Algo."}
:::
`);
    const out = drawFigureBlock(doc.blocks[0]!, doc.blocks);
    expect(out.svg).toBeNull();
    expect(out.refusal).toContain('no dice qué cantidades');
  });
});

/**
 * Pictograms and diagrams do not interfere (022 T026, and `023` T023's deferred half).
 *
 * `023` T023 ticked «`019`'s linear renderings and `022`'s diagrams are unaffected» when
 * `022` had a spec and no code — so the second half asserted nothing, and its correction
 * says «re-assert when `022` actually builds its diagrams». This is that moment.
 *
 * The two are separate surfaces that meet on one page: a pictogram is a raster the
 * teacher's set supplies, a diagram is SVG the code draws, and each has its own gap
 * behaviour. What must not happen is either one swallowing the other.
 */
describe('a sheet with both a pictogram and a diagram', () => {
  const both = parseIR(`---
generated: true
---

::: {#g1-instruction .instruction data-picto="casa=1001@arasaac"}
Rodea la casa.
:::

::: {#g1-e1 .exercise}
1. 4 × 3 =
:::

::: {#g1-e1-fig .figure data-figure="grid" data-of="g1-e1" data-rows="4" data-cols="3" data-description="Una rejilla de 4 filas por 3 columnas: 12 casillas."}
\`\`\`svg
<rect width="8" height="8" fill="none" stroke="black"/>
\`\`\`
:::
`);

  const images = new Map([['1001', 'data:image/png;base64,iVBORw0KGgo=']]);
  const credits = new Map([['arasaac', {
    author: 'Sergio Palao', source: 'ARASAAC · Gobierno de Aragón', licence: 'CC BY-NC-SA',
  }]]);

  it('renders both, in HTML', () => {
    const html = renderHTML(both, {
      presentation: presentationFor({}), pictogramImages: images, pictogramCredits: credits,
    });
    // The pictogram, with its word beside it (`018`'s photocopy rule).
    expect(html).toContain('class="picto"');
    expect(html).toContain('casa');
    // And the diagram, drawn.
    expect((html.match(/<g transform="translate\(/g) ?? []).length).toBe(12);
  });

  it('and the pictogram’s attribution still reaches the page', () => {
    // The figure branch returns early, so a bug there could have skipped the credit that
    // `018` FR-1615 makes unremovable. Different block, same page, both asserted.
    const html = renderHTML(both, {
      presentation: presentationFor({}), pictogramImages: images, pictogramCredits: credits,
    });
    expect(html).toContain('Sergio Palao');
  });

  it('a missing pictogram leaves a named gap and the diagram intact', () => {
    // `018` FR-1616: a moved set degrades the sheet rather than failing it. A diagram in
    // the same document must not change that, in either direction.
    const html = renderHTML(both, {
      presentation: presentationFor({}), pictogramImages: new Map(), pictogramCredits: credits,
    });
    expect(html).toContain('picto-missing');
    expect((html.match(/<g transform="translate\(/g) ?? []).length).toBe(12);
  });

  it('a refused diagram leaves the pictogram intact', () => {
    const hostile = parseIR(`---
generated: true
---

::: {#g1-instruction .instruction data-picto="casa=1001@arasaac"}
Rodea la casa.
:::

::: {#g1-e1-fig .figure data-figure="grid" data-of="g1-e1" data-rows="4" data-cols="3" data-description="d"}
\`\`\`svg
<rect width="8" onload="x()"/>
\`\`\`
:::
`);
    const html = renderHTML(hostile, {
      presentation: presentationFor({}), pictogramImages: images, pictogramCredits: credits,
    });
    expect(html).toContain('No he dibujado este diagrama');
    expect(html).toContain('class="picto"');
  });

  it('and both reach the linear reading as words', () => {
    const text = renderLinear(both, {
      ...LINEAR, pictogramCredits: credits,
    }).blocks.map((b) => b.text).join('\n');
    // The pictogram as its word (`018` FR-1614), the diagram as its description (FR-2012).
    expect(text).toContain('casa');
    expect(text).toContain('Una rejilla de 4 filas por 3 columnas');
  });
});
