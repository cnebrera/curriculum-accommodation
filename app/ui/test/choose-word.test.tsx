import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { ChooseWord } from '../src/pictograms/ChooseWord.js';

/**
 * The word with four pictures (024 T018/T029).
 *
 * ## The two defects this is written against
 *
 * Both have already happened in this project, three days apart:
 *
 * 1. **A selected state that lived only in the accessibility tree.** `aria-pressed`
 *    with no class, so the control worked and never said so. Carlos: «no me deja
 *    seleccionar». It did.
 * 2. **A class name that no stylesheet had.** `.primary` survived the v2 rename in
 *    fifteen components and rendered as unstyled browser default for weeks.
 *
 * So: the state is asserted in the markup **and** the class is asserted against the
 * real CSS. Plus the thing this screen is actually for — FR-2217, pictures rather than
 * ids, because nobody can choose between `6964` and `29847`.
 */

const uiRoot = join(dirname(new URL(import.meta.url).pathname), '..');
const walk = (dir: string, ext: string): string[] => readdirSync(dir).flatMap((name) => {
  const full = join(dir, name);
  return statSync(full).isDirectory() ? walk(full, ext) : full.endsWith(ext) ? [full] : [];
});
const css = walk(join(uiRoot, 'src', 'styles'), '.css')
  .map((f) => readFileSync(f, 'utf8')).join('\n');

const CANDIDATES = [{
  word: 'casa',
  candidates: [
    { id: '6964', image: 'data:image/png;base64,AAAA' },
    { id: '2317', image: 'data:image/png;base64,BBBB' },
    { id: '36465', image: null },
  ],
}];

/**
 * The same word with one already chosen.
 *
 * There was no such fixture, so `current` was always `undefined` and **the selected
 * state was never rendered**. A review deleted the class, the `aria-pressed` and the
 * «elegido» badge from the component and all eleven tests passed — from a file whose own
 * docblock names «a selected state that lived only in the accessibility tree» as the
 * first defect it was written against.
 */
const WITH_CHOICE = [{ ...CANDIDATES[0]!, chosen: '2317' }];

let fixture = CANDIDATES;

/** `useAsync` resolves on mount, so static markup needs the value already there. */
vi.mock('../src/data/pictograms.js', async () => {
  const real = await vi.importActual<typeof import('../src/data/pictograms.js')>(
    '../src/data/pictograms.js');
  return {
    ...real,
    useCandidates: () => ({ state: 'ready', value: fixture, reload: () => {} }),
    useChooseWord: () => ({ run: async () => true, busy: false, error: null,
      clearError: () => {} }),
  };
});

let html = '';
const render = (which = CANDIDATES) => {
  fixture = which;
  return renderToStaticMarkup(<ChooseWord words={['casa']} />);
};
beforeEach(() => { html = render(CANDIDATES); });

describe('she chooses by looking (FR-2217)', () => {
  it('shows the pictures', () => {
    expect(html).toContain('data:image/png;base64,AAAA');
    expect(html).toContain('data:image/png;base64,BBBB');
  });

  it('gives every picture a text alternative naming the word', () => {
    // The same rule `018` FR-1614 applies to a worksheet: an image with no alt is a
    // hole in the document, and here it is also the only way a screen-reader user can
    // tell the four candidates apart.
    expect(html).toMatch(/alt="dibujo 6964 para «casa»"/);
  });

  it('names the word she is choosing for', () => {
    expect(html).toContain('«casa»');
  });

  it('degrades to a named gap where the image has not arrived', () => {
    // `018` FR-1616's rule, here rather than on a worksheet: a download in progress
    // has metadata before images, so this is the ordinary mid-download state.
    expect(html).toContain('picto-choice-gap');
    expect(html).toContain('36465');
  });

  it('says out loud that not choosing is allowed (FR-2216)', () => {
    expect(html).toMatch(/Si no eliges/);
    expect(html).toMatch(/peor que ninguno/);
  });

  it('says the choice is made once for everybody (FR-2214)', () => {
    expect(html).toMatch(/una vez y vale para todos/);
  });
});

describe('the state is visible, not only announced', () => {
  it('carries aria-pressed on every candidate', () => {
    // Three candidates, three buttons, each stating its own state.
    expect([...html.matchAll(/aria-pressed="false"/g)]).toHaveLength(3);
  });

  it('marks the chosen one, in the DOM and in the accessibility tree', () => {
    const chosen = render(WITH_CHOICE);
    /*
     * Both, on the chosen one only. This is what the file was written for and what it
     * did not test: the class, the `aria-pressed="true"`, and exactly one of each.
     */
    expect(chosen).toContain('picto-choice-on');
    expect([...chosen.matchAll(/picto-choice-on/g)],
      'exactly one candidate is the chosen one').toHaveLength(1);
    expect([...chosen.matchAll(/aria-pressed="true"/g)]).toHaveLength(1);
    expect([...chosen.matchAll(/aria-pressed="false"/g)]).toHaveLength(2);
    // And it says so in words too, not only in a border.
    expect(chosen).toContain('elegido');
  });

  it('marks nothing when she has not chosen', () => {
    expect(html).not.toContain('picto-choice-on');
    expect(html).not.toContain('aria-pressed="true"');
    expect(html).not.toContain('elegido');
  });

  it('and the class exists in a stylesheet', () => {
    // The half `.primary` failed for weeks: a class name no stylesheet has.
    expect(css, 'the selected class must exist in a stylesheet')
      .toMatch(/\.picto-choice-on\s*\{/);
  });

  it('marks it with more than colour (010 FR-812)', () => {
    /*
     * A photocopy and a colour-blind reader see the same page. `.picto-choice-on` sets
     * a heavier border and a check mark, not just a background.
     */
    const rule = /\.picto-choice-on\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(rule).toMatch(/border-width/);
    /*
     * The check is an `<Icon name="check">` the component places when chosen (`041`
     * FR-3918) — it was a `content: '✓'` pseudo-element, a glyph that differed per
     * operating system. Same property: a mark, not a colour.
     */
    const source = readFileSync(join(uiRoot, 'src', 'pictograms', 'ChooseWord.tsx'), 'utf8');
    expect(source).toMatch(/c\.id === current \? <Icon name="check" className="door-check"/);
    expect(css).toMatch(/\.picto-choice-on \.door-check\s*\{/);
  });

  it('uses only classes the stylesheets define', () => {
    /*
     * Read out of the component rather than from a hardcoded list of three — a review
     * pointed out that a fourth class added to `ChooseWord.tsx` was unchecked, which is
     * the `.primary` defect with one more step.
     */
    const src = readFileSync(
      new URL('../src/pictograms/ChooseWord.tsx', import.meta.url), 'utf8');
    // Both quote styles: `className="picto-choices"` and the ternary's `'picto-choice
    // picto-choice-on'`. Matching only one of them found two classes and missed two.
    const used = new Set([...src.matchAll(/['"]([\w -]*picto-[\w -]*)['"]/g)]
      .flatMap((m) => m[1]!.split(' ')).filter(Boolean));
    expect([...used].sort(), 'every picto- class the component uses')
      .toEqual(['picto-choice', 'picto-choice-gap', 'picto-choice-on', 'picto-choices']);
    for (const cls of used) {
      expect(css, `.${cls} is used by the component and defined nowhere`)
        .toMatch(new RegExp(`\\.${cls}[\\s,{:]`));
    }
  });
});

describe('one primary control per screen (013 FR-1105, closing G31 for this screen)', () => {
  it('has no primary button at all — the choice is not a call to action', () => {
    /*
     * This renders inside the report, which already has its own primary. Four equally
     * weighted pictures are the point: the screen is not urging her to pick a
     * particular one, and popularity order is a fact about downloads rather than a
     * recommendation.
     */
    expect(html).not.toContain('btn-primary');
  });
});
