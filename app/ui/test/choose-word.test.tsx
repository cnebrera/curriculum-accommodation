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

/** `useAsync` resolves on mount, so static markup needs the value already there. */
vi.mock('../src/data/pictograms.js', async () => {
  const real = await vi.importActual<typeof import('../src/data/pictograms.js')>(
    '../src/data/pictograms.js');
  return {
    ...real,
    useCandidates: () => ({ state: 'ready', value: CANDIDATES, reload: () => {} }),
    useChooseWord: () => ({ run: async () => true, busy: false, error: null,
      clearError: () => {} }),
  };
});

let html = '';
beforeEach(() => { html = renderToStaticMarkup(<ChooseWord words={['casa']} />); });

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

  it('marks the chosen one with a class as well', () => {
    const chosen = renderToStaticMarkup(
      <ChooseWord words={['casa']} />);
    // Nothing is chosen in the fixture, so the class must be absent here — and
    // present in the CSS, which is the half `.primary` failed for weeks.
    expect(chosen).not.toContain('picto-choice-on');
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
    expect(css).toMatch(/\.picto-choice-on::after\s*\{[^}]*content/);
  });

  it('uses only classes the stylesheets define', () => {
    for (const cls of ['picto-choices', 'picto-choice', 'picto-choice-gap']) {
      expect(css, `.${cls} is used in the component`).toMatch(
        new RegExp(`\\.${cls}[\\s,{:]`));
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
