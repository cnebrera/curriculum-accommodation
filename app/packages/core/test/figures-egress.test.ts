import { describe, it, expect } from 'vitest';
import {
  parseIR, renderHTML, renderLinear, presentationFor, checkOutput, checkPhotocopy,
  drawFigure, type Figure,
} from '../src/index.js';

/**
 * Nothing about the child rides out on a diagram (022 T015/T021,
 * FR-2013/2014, `011` FR-910, `015` FR-1306).
 *
 * ## The three places a fact could hide
 *
 * A diagram is the newest surface in the application, and it has three slots a model
 * fills: the **theme** («cartas»), a **label** inside the drawing, and the **glyph**'s own
 * text content. Each of them reaches the page, so each of them is a place a learner's
 * code, name or school could arrive — and `011`'s own task says adding a field without
 * extending the egress check is how the next one reaches a sheet.
 *
 * `checkOutput` strips tags, so SVG `<text>` content is visible text to it. That is why
 * this works at all, and why it is asserted rather than assumed.
 */
const CODE = 'E38';
const NAME = 'Lucía';
const SCHOOL = 'CEIP Miguel Hernández';

const sheet = (theme: string, glyph: string, description: string): string => `---
generated: true
kind: worksheet
---

::: {#e1 .exercise}
1. 4 × 3 =
:::

::: {#e1-fig .figure data-figure="grid" data-of="e1" data-rows="4" data-cols="3" data-theme="${theme}" data-description="${description}"}
\`\`\`svg
${glyph}
\`\`\`
:::
`;

const PLAIN = '<rect width="8" height="8" fill="none" stroke="black"/>';

const PLANTED: ReadonlyArray<[string, string, string]> = [
  ['the theme', sheet(NAME, PLAIN, 'Una rejilla de 4 por 3.'), NAME],
  ['a label inside the glyph',
    sheet('cartas', `<text x="4" y="9" font-size="6">${CODE}</text>`, 'Una rejilla de 4 por 3.'),
    CODE],
  ['the description', sheet('cartas', PLAIN, `La rejilla de ${NAME}.`), NAME],
  ['the school, in the theme', sheet(SCHOOL, PLAIN, 'Una rejilla de 4 por 3.'), SCHOOL],
];

/**
 * The property, stated exactly.
 *
 * FR-2014 says a diagram must not **contain** a learner fact. So for each planted fact
 * and each modality there are only two acceptable outcomes: the egress check finds it, or
 * it is not in the output at all. What is not acceptable is the third state — present in
 * the file and invisible to the check — and that third state is what the first draft of
 * this test found: `data-theme` is a model-written string, and an attribute value is
 * invisible to `checkOutput`, which strips tags because it models what the child reads.
 *
 * A name arriving as a theme sat in the rendered HTML, neither caught nor absent, in a
 * file she emails to a colleague. The renderer now emits only the two attributes the code
 * wrote; the theme still reaches the page through the drawing and the caption, which are
 * the two places the check can see.
 */
const caughtOrAbsent = (out: string, fact: string, where: string): void => {
  const found = checkOutput(out, [CODE], [NAME], [SCHOOL]);
  if (found.ok) {
    expect(out, `${where}: «${fact}» is in the output and the check did not see it`)
      .not.toContain(fact);
  }
};

describe('a learner fact planted in a diagram is caught or absent, in every modality', () => {
  for (const [where, markdown, fact] of PLANTED) {
    it(`in the HTML, for ${where}`, () => {
      const html = renderHTML(parseIR(markdown), { presentation: presentationFor({}) });
      caughtOrAbsent(html, fact, `${where} · HTML`);
    });

    it(`in the linear reading, for ${where}`, () => {
      // `019`'s modalities are where a rule like this gets quietly lost: the linear
      // renderer walks the document differently, and a check that only ever looked at
      // HTML would say nothing about the file a transcriber receives.
      const text = renderLinear(parseIR(markdown), {
        modality: 'audio', spatialPhrases: [], answerSpace: 'x',
      }).blocks.map((b) => b.text).join('\n');
      caughtOrAbsent(text, fact, `${where} · linear`);
    });
  }

  it('and a fact in the description is genuinely caught, not merely absent', () => {
    // Otherwise «caught or absent» could pass on a renderer that dropped everything.
    // The caption is visible text, so this one has to be a finding.
    const html = renderHTML(parseIR(sheet('cartas',
      '<rect width="8" height="8" fill="none" stroke="black"/>', `La rejilla de ${NAME}.`)),
      { presentation: presentationFor({}) });
    expect(checkOutput(html, [CODE], [NAME], [SCHOOL]).ok).toBe(false);
  });

  it('and a code inside the glyph’s own text is caught, because tags are stripped', () => {
    const html = renderHTML(parseIR(sheet('cartas',
      `<text x="4" y="9" font-size="6">${CODE}</text>`, 'Una rejilla de 4 por 3.')),
      { presentation: presentationFor({}) });
    expect(checkOutput(html, [CODE], [NAME], [SCHOOL]).ok).toBe(false);
  });

  it('and an ordinary themed sheet passes, so the check is not just «no»', () => {
    const html = renderHTML(parseIR(sheet('cartas',
      '<rect width="8" height="8" fill="none" stroke="black"/>',
      'Una rejilla de 4 filas por 3 columnas: 12 casillas de cartas.')),
      { presentation: presentationFor({}) });
    const found = checkOutput(html, [CODE], [NAME], [SCHOOL]);
    expect(found.ok, found.findings.join(' · ')).toBe(true);
  });
});

/**
 * And the photocopy, both halves (FR-2013, `010` FR-812).
 *
 * The delivery format for this application is a black-and-white photocopy (`006`
 * FR-427), not an edge case. So a diagram must survive one — and «survive» means two
 * different things that are both asserted: the page's colours must not collapse into
 * each other, and **the count must not be carried by colour at all**.
 */
describe('a diagram survives the photocopier', () => {
  const themed = renderHTML(parseIR(sheet('cartas',
    '<rect width="10" height="14" rx="2" fill="#fff" stroke="#333"/>',
    'Una rejilla de 4 filas por 3 columnas: 12 casillas de cartas.')),
    { presentation: presentationFor({}) });

  it('the figure’s colours do not collapse into the page’s', () => {
    const issues = checkPhotocopy(themed);
    expect(issues.map((i) => i.message).join(' · ')).not.toContain('rejilla');
    expect(issues.filter((i) => i.what === 'contrast')).toEqual([]);
  });

  it('and the count survives being flattened to black on white', () => {
    /*
     * The greyscale-blindness half. Strip every fill and stroke to black on white — what
     * a photocopier does — and the twelve cells are still twelve, because every counted
     * thing is a discrete outlined shape rather than a colour.
     */
    const fig: Figure = {
      of: 'e1', quantities: { kind: 'grid', rows: 4, cols: 3 },
      glyph: '<rect width="10" height="14" rx="2" fill="#fff" stroke="#333"/>',
      description: 'x',
    };
    const svg = drawFigure(fig);
    const flat = svg.replace(/fill="[^"]*"/g, 'fill="none"')
      .replace(/stroke="[^"]*"/g, 'stroke="black"');
    const count = (s: string) => (s.match(/<g transform="translate\(/g) ?? []).length;
    expect(count(flat)).toBe(12);
    expect(count(flat)).toBe(count(svg));
  });
});
