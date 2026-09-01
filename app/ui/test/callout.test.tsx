import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Callout } from '../src/components/Callout.js';

/**
 * A callout says what kind it is in words, exactly once (010 FR-812).
 *
 * FR-812 forbids colour as the only carrier of meaning, and a callout carries its
 * whole meaning in one: a red border means «Atención» and nothing else says so. A
 * colourblind teacher, a bad school projector and a photocopy all have to be able to
 * tell these apart.
 *
 * ## The defect this closes
 *
 * The component read `{!title && <span className="sr-only">…}` — backwards in both
 * directions at once:
 *
 * - **No title**: the `<strong>` already said «Atención», so a screen reader said it
 *   twice.
 * - **With a title** — nearly every callout in the application, including the two
 *   added for `005` FR-520 the day before this was found — the kind was announced
 *   **nowhere** and the border colour was its only carrier. The exact violation.
 *
 * Found on 2026-09-01 from a duplicated «Atención» in pasted text: `.sr-only` is
 * hidden from the eye but travels with the clipboard, so the copy showed what the
 * screen could not.
 */

const strip = (html: string): string => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const count = (haystack: string, needle: string): number => haystack.split(needle).length - 1;

describe('a callout names its own kind', () => {
  it('says «Atención» once when there is no title', () => {
    const html = renderToStaticMarkup(<Callout intent="danger">Se ha roto algo.</Callout>);
    expect(count(strip(html), 'Atención')).toBe(1);
  });

  it('says the kind as well as the title, so colour is never the only carrier', () => {
    const html = renderToStaticMarkup(
      <Callout intent="danger" title="Hay fichas hechas con la lectura de antes">
        Vuelve a adaptarlas.
      </Callout>);
    const text = strip(html);
    expect(text).toContain('Hay fichas hechas con la lectura de antes');
    expect(count(text, 'Atención')).toBe(1);
  });

  it.each([
    ['info', 'Información'],
    ['decide', 'Necesita tu decisión'],
    ['danger', 'Atención'],
    ['ok', 'Hecho'],
  ] as const)('names intent «%s» in words, titled or not', (intent, word) => {
    for (const title of [undefined, 'Un título cualquiera']) {
      const html = renderToStaticMarkup(
        <Callout intent={intent} {...(title ? { title } : {})}>cuerpo</Callout>);
      expect(count(strip(html), word), `${intent}, title=${String(title)}`).toBe(1);
    }
  });

  it('keeps the kind out of the eye when there is a title', () => {
    // Announced, not shown: the visible heading is hers, and «Atención» beside it
    // would be the component talking over her.
    const html = renderToStaticMarkup(
      <Callout intent="danger" title="Su título">cuerpo</Callout>);
    expect(html).toContain('class="sr-only"');
    expect(html).toMatch(/<span class="sr-only">Atención<\/span>/);
  });

  it('interrupts a screen reader only for danger', () => {
    expect(renderToStaticMarkup(<Callout intent="danger">x</Callout>)).toContain('role="alert"');
    for (const intent of ['info', 'decide', 'ok'] as const) {
      expect(renderToStaticMarkup(<Callout intent={intent}>x</Callout>)).toContain('role="status"');
    }
  });
});
