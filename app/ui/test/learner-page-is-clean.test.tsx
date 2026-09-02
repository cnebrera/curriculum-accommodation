import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { LearnerPictograms } from '../src/pictograms/LearnerPictograms.js';

/**
 * The learner's page is about the learner (025 T013, FR-2301, SC-2301/2303).
 *
 * Carlos: «sería mucho más limpio que ensuciar con tantas cosas la hoja del alumno.»
 *
 * «Mucho más limpio» has to mean something, so it is measured. Before `025` this block
 * carried a licence, four bullets of terms, a licence URL, an acceptance, a withdrawal,
 * a 157 MB download, a progress bar, a stop button, a folder picker and an update
 * check. None of it is about a child.
 */

/** Flipped per test, because the two states are what this file is about. */
let installed = false;

vi.mock('../src/data/pictograms.js', async () => {
  const real = await vi.importActual<typeof import('../src/data/pictograms.js')>(
    '../src/data/pictograms.js');
  return {
    ...real,
    useCurrentSet: () => ({
      state: 'ready',
      value: installed
        ? { root: '/set', configuredOn: '2026-09-02', missing: false, summary: '13.802' }
        : null,
      reload: () => {},
    }),
  };
});

const render = (enabled: boolean, hasSet = false) => {
  installed = hasSet;
  return renderToStaticMarkup(
    <LearnerPictograms enabled={enabled} scope="vocabulary"
                       onEnabled={() => {}} onScope={() => {}} onConfigure={() => {}} />);
};

describe('what is not on it any more', () => {
  /*
   * **Both states** (from a review, 2026-09-02). These ran against `render(true)` only,
   * which leaves the set *missing* — so a reviewer added every banned phrase inside the
   * `!missing` branch and all eleven tests passed. The page a teacher sees every day was
   * the one nobody looked at.
   */
  const html = `${render(true, false)}\n${render(true, true)}\n${render(false, true)}`;

  it('carries no licence text', () => {
    for (const phrase of ['CC BY-NC-SA', 'Sergio Palao', 'Gobierno de Aragón',
                          'creativecommons.org', 'licencia', 'Acepto']) {
      expect(html, `«${phrase}» is not about a child`).not.toContain(phrase);
    }
  });

  it('carries no download, no megabytes and no folder picker', () => {
    for (const phrase of ['MB', 'Decirme dónde están', 'progressbar', 'Aceptada el',
                          'Retirar mi aceptación', '¿Hay pictogramas nuevos?']) {
      expect(html).not.toContain(phrase);
    }
  });

  it('what looks like a download button is a pointer', () => {
    const html = render(true, false);
    /*
     * «Traer los pictogramas →» **is** on the page, and that is FR-2303: it says what
     * she will get rather than «Configuración», which would make her guess. The arrow
     * is what distinguishes it from the control that actually downloads — and the test
     * that matters is the next one: there is exactly one button, and no progress bar
     * can appear here because nothing here can start a download.
     */
    expect(html).toContain('Traer los pictogramas →');
    expect(html).not.toMatch(/Trayéndolos/);
  });

  it('does not name the publisher at all', () => {
    // `018` FR-1604: nothing in code assumes ARASAAC. A learner's page naming it would
    // be that assumption in the least replaceable place.
    expect(html).not.toMatch(/arasaac/i);
  });
});

describe('what is on it', () => {
  it('keeps the switch and, once on, the scope', () => {
    expect(render(false)).toContain('Usa pictogramas');
    expect(render(true)).toContain('pictos-scope');
    // Off means off: the scope is not a control she has to ignore.
    expect(render(false)).not.toContain('pictos-scope');
  });

  it('explains what a pictogram is, on screen (FR-2302)', () => {
    /*
     * A PT knows. A tutor covering the class in March may not, and this is a switch
     * with a consequence for a child. `024`'s cost badge learned this the hard way:
     * «tu propia cuenta de IA» lived in a `title` attribute and Carlos read the bare
     * figure as a commercial plan.
     */
    const html = render(true, true);
    expect(html).toMatch(/significado fijo/);
    expect(html).toMatch(/ya los usa/);
    /*
     * The hint is in the body, not in a `title` attribute — `024`'s cost badge learned
     * that one the hard way. Asserted as «the text is in the body», not as «no `title`
     * anywhere», which a review noted would fail on an innocent `<abbr title>`.
     */
    expect(html).toMatch(/<p[^>]*>[^<]*Son dibujos/);
  });

  it('offers exactly one way to fix a missing set (FR-2303)', () => {
    const html = render(true, false);
    expect(html).toContain('No tienes el juego de pictogramas');
    expect([...html.matchAll(/<button/g)]).toHaveLength(1);
    expect(html).toContain('Traer los pictogramas →');
  });

  it('says nothing about the set when nothing is wrong', () => {
    // One more line about something that is fine is one more line, and the point of
    // this component is that there are three and not thirty.
    expect(render(true, true)).not.toContain('No tienes el juego');
    // Nor when the family is off: she has not asked for pictograms at all.
    expect(render(false, false)).not.toContain('No tienes el juego');
  });
});

const sentencesIn = (html: string): string[] => html
  .replace(/<[^>]+>/g, ' ')
  .replace(/&[a-z]+;/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .split(/(?<=[.:])\s+/)
  .filter((x) => x.length > 12);

describe('and it is short (SC-2303)', () => {
  /*
   * ## The bound is on the ordinary state, and that is the point
   *
   * My first version measured the missing-set state and failed at eight against six,
   * and the honest reading is that the bound was on the wrong thing: when the set is
   * missing, those extra lines **are** the feature — `018`'s «turning it on and getting
   * nothing, with no idea why» is what they prevent.
   *
   * What «mucho más limpio» has to mean is that the page she sees **every other day**
   * is short. So: six in the ordinary state, and the exception is allowed to explain
   * itself.
   */
  it('is under six sentences in the ordinary state', () => {
    // The set installed, pictograms on: the page she sees every other day.
    const sentences = sentencesIn(render(true, true));
    expect(sentences.length, `too much on a child's page:\n${sentences.join('\n')}`)
      .toBeLessThanOrEqual(6);
    // And it really is rendering the block, not an empty string.
    expect(sentences.length).toBeGreaterThan(1);
  });

  it('adds at most three sentences when the set is missing', () => {
    /*
     * The exception explains itself and then stops. Three: what will happen to his
     * sheets, that it is a one-off for everybody, and the way to fix it.
     *
     * The bound was `<= 5` while the title and this comment said three — a review
     * pointed out the test read as tighter than it enforced. Measured delta is 3.
     */
    const missing = sentencesIn(render(true, false));
    const ordinary = sentencesIn(render(true, true));
    expect(missing.length - ordinary.length,
      `the exception is too talkative:\n${missing.join('\n')}`).toBe(3);
  });

  /*
   * Deleted: «and the whole component is smaller than what it replaced».
   *
   * It compared this file's line count to `PictogramSetSection.tsx`'s — a different,
   * still-shipping file — so it asserted nothing about behaviour and could not fail
   * short of a deliberate rewrite. A review called it what it was, and this repository
   * has thirteen recorded cases of exactly that shape. The sentence-count bounds above
   * are the measurement that means something.
   */
});
