import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { PICTOGRAM_PROGRESS_STAGE } from '../../packages/core/src/pictograms/fetch.js';
import { Counted } from '../src/components/Progress.js';
import { PICTOGRAM_PROGRESS_STAGE as RENDERER_STAGE } from '../src/data/pictograms.js';

/**
 * The bar exists, and it says a true number (024 T012, 025 FR-2309).
 *
 * ## Why this file replaced a guard
 *
 * `ui/test/props-are-read.test.ts` used to try to prove the download's progress was read
 * by searching the UI for the field names. Two versions of that heuristic both **passed**
 * with the subscription deleted — the exact defect it was written for. A text search
 * cannot tell a read of this payload from a read of any other `done`.
 *
 * This asserts the behaviour instead: the component that renders progress, and the one
 * string both sides of the IPC boundary compare on.
 */

describe('the bar carries the number, not just the width', () => {
  it('states the fraction in text and in the accessibility tree', () => {
    const html = renderToStaticMarkup(
      <Counted done={3140} total={13802} one="Dibujo" many="dibujos" />);

    // In the tree, for a screen reader.
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="3140"');
    expect(html).toContain('aria-valuemax="13802"');
    /*
     * «3140», not «3.140» — and that is `toLocaleString('es-ES')` being right rather
     * than inconsistent: Spanish writes four-digit numbers without a thousands
     * separator, and five-digit ones with. My first expectation here asserted «3.140»
     * and this test caught me, not the code.
     */
    expect(html).toContain('aria-label="Dibujo 3140 de 13.802"');
    // And in words, because a width alone carries meaning the way colour does.
    expect(html).toMatch(/3140 de 13\.802 dibujos/);
    expect(html).toMatch(/23%/);
  });

  it('never claims completion it has not reached', () => {
    expect(renderToStaticMarkup(<Counted done={0} total={100} one="Dibujo" />))
      .toContain('0%');
    expect(renderToStaticMarkup(<Counted done={200} total={100} one="Dibujo" />))
      .toContain('100%');
  });

  it('survives a total of zero without dividing by it', () => {
    expect(renderToStaticMarkup(<Counted done={0} total={0} one="Dibujo" />))
      .toContain('0%');
  });
});

describe('both sides of the boundary compare the same string', () => {
  it('the screen filters progress on the exported stage, not a literal', async () => {
    /*
     * It was the literal `'Trayendo pictogramas'` written twice in the shell and once in
     * the renderer. A typo in any of the three silently kills the bar — which is how the
     * thirteenth unread field happened.
     */
    const { readFileSync } = await import('node:fs');
    const screen = readFileSync(
      new URL('../src/pictograms/PictogramSetSection.tsx', import.meta.url), 'utf8');
    expect(screen, 'the screen must compare the shared constant')
      .toContain('PICTOGRAM_PROGRESS_STAGE');
    expect(screen, 'and must not hardcode the stage')
      .not.toContain(`'${PICTOGRAM_PROGRESS_STAGE}'`);
    // The renderer cannot import `@rampa/core`, so the constant is mirrored — and the
    // two copies are checked against each other rather than trusted.
    expect(RENDERER_STAGE).toBe(PICTOGRAM_PROGRESS_STAGE);
  });

  it('and the screen subscribes at all', () => {
    const screen = readFileSync(
      new URL('../src/pictograms/PictogramSetSection.tsx', import.meta.url), 'utf8');
    /*
     * Blunt, and the only assertion that catches the original defect: the screen has to
     * subscribe *and* render the bar. Deleting either fails this.
     */
    expect(screen).toMatch(/useJobProgress\(/);
    expect(screen).toMatch(/<Counted\b/);
  });
});

