import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { PICTOGRAM_PROGRESS_STAGE } from '../../packages/core/src/pictograms/fetch.js';
import { Counted } from '../src/components/Progress.js';
import { PICTOGRAM_PROGRESS_STAGE as RENDERER_STAGE, downloadShown } from '../src/data/pictograms.js';

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

/**
 * A download in progress survives navigation (025 T009, FR-2309).
 *
 * ## What was already there, and what was not
 *
 * The main process has had the answer for a while: `lastProgress` lives beside the
 * `AbortController`, and `pictograms:bringing` reports both. The screen asks on mount.
 * So the requirement was **built** and its task still said «Not done» — which is its own
 * small lesson: a note that records a defect has to be revisited when the defect is
 * fixed, or it becomes a claim the repository makes about itself and nobody checks.
 *
 * What was missing is this: the derivation lived as four lines inside a component that
 * **this suite cannot mount**. The test environment is `node`, so a static render sees
 * the first frame of a `useAsync` and never the resolved one — the exact frame in which
 * a mount-time read has not happened yet. A derivation nothing can check is where the
 * requirement quietly stops being true.
 *
 * ## What this still does not prove
 *
 * That a real 157 MB download survives a real navigation. That needs the network and
 * ARASAAC's servers, and it is `025` T019's «look at it with a download in progress» —
 * a person, by hand. Said out loud rather than left to look covered.
 */
describe('walking into a download that was already running', () => {
  it('shows the bar from what the main process reports, not from events it missed', () => {
    // She has just arrived: no event has been received by this screen at all.
    const { running, at } = downloadShown(
      null, { running: true, done: 40_000, total: 157_000 }, false);

    expect(running).toBe(true);
    expect(at).toEqual({ done: 40_000, total: 157_000 });
  });

  it('offers nothing when nothing is running', () => {
    expect(downloadShown(null, { running: false, done: 0, total: 0 }, false))
      .toEqual({ running: false, at: null });
  });

  /**
   * A finished download's last numbers are **not** a bar.
   *
   * `bringing()` keeps `lastProgress` beside the controller, and it is only cleared when
   * a run ends — so `done`/`total` can be the tail of a completed download. Reading them
   * without `running` would leave a full bar frozen on the screen of somebody who is not
   * downloading anything, which reads as «stuck».
   */
  it('ignores the numbers of a download that has stopped', () => {
    expect(downloadShown(null, { running: false, done: 157_000, total: 157_000 }, false).at)
      .toBe(null);
  });

  /** The live event is newer than the snapshot she arrived with, so it wins. */
  it('prefers what is happening now to what was reported on arrival', () => {
    expect(downloadShown(
      { done: 41_200, total: 157_000 }, { running: true, done: 40_000, total: 157_000 }, false).at)
      .toEqual({ done: 41_200, total: 157_000 });
  });

  /**
   * And she pressed the button a moment ago, before any event or answer.
   *
   * `running` has to be true on that frame: it is what disables the button, and a button
   * that stays enabled for the first second of a 157 MB download is how a second
   * concurrent run became reachable without malice.
   */
  it('counts as running the moment she presses, before anything has answered', () => {
    expect(downloadShown(null, null, true).running).toBe(true);
    expect(downloadShown(null, null, false).running).toBe(false);
  });
});
