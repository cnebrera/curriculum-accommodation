import { describe, it, expect } from 'vitest';
import { renderHTML, attributionFor, hasPictograms, parseIR } from '../src/index.js';

/**
 * Printing a pictogram, and printing it legally (018 T019-T021, US4).
 *
 * The one that cannot be waived is the attribution. A sheet with a pictogram on it
 * is a derivative work under CC BY-NC-SA, so a rendering pipeline that dropped the
 * credit would make **her** sheet the infringing document rather than ours — and it
 * is exactly the kind of line a pipeline drops silently.
 */
const withPicto = () => parseIR([
  '---', 'lang: es', '---', '',
  '::: {#b1 .instruction data-picto="casa=1001"}', 'Rodea la casa.', ':::',
].join('\n'));

const withoutPicto = () => parseIR([
  '---', 'lang: es', '---', '',
  '::: {#b1 .instruction}', 'Rodea la casa.', ':::',
].join('\n'));

const images = new Map([['1001', 'data:image/png;base64,iVBORw0KGgo=']]);

describe('the attribution is derived, not passed', () => {
  it('appears whenever the document carries a pictogram', () => {
    const line = attributionFor(withPicto());
    expect(line).toContain('Sergio Palao');
    expect(line).toContain('ARASAAC');
    expect(line).toContain('CC BY-NC-SA');
  });

  it('is absent when the document carries none', () => {
    expect(hasPictograms(withoutPicto())).toBe(false);
    expect(attributionFor(withoutPicto())).toBeNull();
  });

  /**
   * `007` FR-509's defect, not repeated: `job:render` used to take `signedOff` from
   * the renderer, so an unmarked sheet could be produced with no sign-off. A licence
   * condition passed as an argument is one somebody passes `false`.
   */
  it('has no parameter that could turn it off', () => {
    // Signed off removes the draft mark and changes nothing about the licence.
    const html = renderHTML(withPicto(), { signedOff: true, pictogramImages: images });
    expect(html).not.toContain('BORRADOR');
    expect(html).toContain('Sergio Palao');
  });

  it('is a different set\'s credit when a different set is used', () => {
    // FR-1604: nothing depends on ARASAAC.
    const line = attributionFor(withPicto(), {
      author: 'Alguien', source: 'Otro juego', licence: 'CC BY',
    });
    expect(line).toContain('Alguien');
    expect(line).not.toContain('ARASAAC');
  });
});

describe('what the sheet actually shows', () => {
  it('embeds the image, so it survives being emailed without the set', () => {
    const html = renderHTML(withPicto(), { pictogramImages: images });
    expect(html).toContain('data:image/png;base64,iVBORw0KGgo=');
    expect(html).not.toContain('file://');
  });

  it('carries a text alternative, because a screen reader may read this too', () => {
    const html = renderHTML(withPicto(), { pictogramImages: images });
    expect(html).toContain('alt="pictograma de «casa»"');
  });

  it('prints the word beside the picture, always', () => {
    // Colour alone carries nothing on a greyscale photocopy, which is the delivery
    // format and not an edge case (`006` FR-427).
    const html = renderHTML(withPicto(), { pictogramImages: images });
    expect(html).toContain('picto-word');
  });

  it('states a minimum print size in millimetres', () => {
    // At 12mm and 200 DPI a greyscale pictogram is a smudge, and contrast does not
    // fix it: the drawing has interior detail.
    expect(renderHTML(withPicto(), { pictogramImages: images })).toContain('20mm');
  });

  it('puts the credit at the foot, after the exercises', () => {
    const html = renderHTML(withPicto(), { pictogramImages: images });
    expect(html.indexOf('Rodea la casa')).toBeLessThan(html.indexOf('Sergio Palao'));
    // And the draft mark stays at the head, because its job is different.
    expect(html.indexOf('BORRADOR')).toBeLessThan(html.indexOf('Rodea la casa'));
  });
});

describe('a missing image is a named gap, never a failed render', () => {
  /** FR-1616. Her set moved, or the set was updated and renumbered. */
  it('renders the sheet with the word and a marked gap', () => {
    const html = renderHTML(withPicto(), { pictogramImages: new Map() });

    expect(html).toContain('Rodea la casa');
    expect(html).toContain('picto-missing');
    expect(html).toContain('falta la imagen');
  });

  it('keeps the id it wanted, so the gap is diagnosable', () => {
    // Provenance survives the missing file: a gap traces to a decision rather than
    // to a mystery (Principle VI).
    const html = renderHTML(withPicto(), { pictogramImages: new Map() });
    expect(html).toContain('data-picto="casa=1001"');
  });

  it('still carries the attribution, because the document still claims a pictogram', () => {
    expect(renderHTML(withPicto(), { pictogramImages: new Map() })).toContain('Sergio Palao');
  });
});
