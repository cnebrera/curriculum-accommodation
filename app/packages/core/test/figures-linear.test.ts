import { describe, it, expect } from 'vitest';
import { parseIR, renderLinear } from '../src/index.js';

/**
 * A diagram reaches audio and braille as its description (022 T020, FR-2012).
 *
 * ## Why this is asserted here rather than left to `019`
 *
 * Because the review's finding about this feature was that a picture existing only on
 * paper is a picture the learner who needs it most cannot have — and `019`'s renderer
 * treats a `.figure` block with a `data-description` as *being* its description, which
 * happens to be exactly right. «Happens to be right» is the state that decays silently:
 * a future change to either side breaks it and neither side's tests notice.
 *
 * So the four kinds are walked here, in both non-visual modalities, and what is asserted
 * is the whole claim: the description is there, the markup is not, and nothing was
 * dropped.
 */
const FIGURES = [
  ['grid', 'data-rows="4" data-cols="3"',
    'Una rejilla de 4 filas por 3 columnas: 12 casillas de cartas.'],
  ['groups', 'data-groups="4" data-per-group="3"',
    '4 grupos de 3 de cartas: 12 en total.'],
  ['number-line', 'data-start="3" data-jumps="5" data-end="8"',
    'Una recta numérica del 0 al 8. Se empieza en 3 y se dan 5 saltos de uno hasta 8.'],
  ['part-whole', 'data-parts="7,5" data-whole="12"',
    'Una barra de 12 partida en 7 y 5.'],
] as const;

const doc = parseIR(`---
generated: true
---

${FIGURES.map(([kind, attrs, description], i) => `::: {#e${i} .exercise}
${i + 1}. 4 × 3 =
:::

::: {#e${i}-fig .figure data-figure="${kind}" data-of="e${i}" ${attrs} data-description="${description}"}
\`\`\`svg
<rect width="8" height="8" fill="none" stroke="black"/>
\`\`\`
:::`).join('\n\n')}
`);

const OPTS = {
  spatialPhrases: [] as string[],
  answerSpace: 'Aquí hay un hueco para contestar.',
};

describe('every non-visual modality gets every diagram, as words', () => {
  for (const modality of ['audio', 'braille'] as const) {
    it(`${modality}: each of the four kinds appears as its description`, () => {
      const out = renderLinear(doc, { ...OPTS, modality });
      const text = out.blocks.map((b) => b.text).join('\n');
      for (const [kind, , description] of FIGURES) {
        expect(text, `${modality} lost the ${kind}`).toContain(description);
      }
    });

    it(`${modality}: no glyph markup reaches the text`, () => {
      const out = renderLinear(doc, { ...OPTS, modality });
      const text = out.blocks.map((b) => b.text).join('\n');
      // The fence is inert input, not body text. A transcriber receiving `<rect …>` in a
      // braille-ready file is receiving noise where a picture should have been described.
      for (const token of ['<rect', '```', 'svg', 'stroke=']) {
        expect(text, `${modality} · ${token}`).not.toContain(token);
      }
    });

    it(`${modality}: nothing is silently dropped`, () => {
      /*
       * The trap: «contains the descriptions» passes on a rendering that also lost the
       * exercises, and «no markup» passes on an empty file. So the count is asserted —
       * four exercises and four figures, all present.
       */
      const out = renderLinear(doc, { ...OPTS, modality });
      const text = out.blocks.map((b) => b.text).join('\n');
      expect((text.match(/4 × 3/g) ?? []).length).toBe(4);
      expect(out.blocks.length).toBeGreaterThanOrEqual(8);
    });
  }

  it('and a refused diagram says so rather than vanishing', () => {
    // The modalities must not disagree about whether a diagram exists (FR-2011): if HTML
    // prints a refusal and the audio file simply has a gap, the person listening is the
    // one who does not know something is missing.
    const hostile = parseIR(`---
generated: true
---

::: {#e1 .exercise}
1. 4 × 3 =
:::

::: {#e1-fig .figure data-figure="grid" data-of="e1" data-rows="4" data-cols="3" data-description="Una rejilla de 4 por 3."}
\`\`\`svg
<rect width="8" onload="x()"/>
\`\`\`
:::
`);
    const text = renderLinear(hostile, { ...OPTS, modality: 'audio' })
      .blocks.map((b) => b.text).join('\n');
    /*
     * The description **is** the rendering here — which for a refused figure means she
     * hears what the picture was supposed to be, and the refusal itself is on the page
     * and in the report. That is a deliberate difference from HTML, where the refusal
     * replaces the drawing: read aloud, «no he dibujado este diagrama» in the middle of
     * a worksheet is noise for the child, and the person who needs to act on it is the
     * teacher, who has the page and the report.
     */
    expect(text).toContain('Una rejilla de 4 por 3.');
    expect(text).not.toContain('onload');
  });
});
