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
const withPicto = (picto = 'casa=1001@arasaac') => parseIR([
  '---', 'lang: es', '---', '',
  `::: {#b1 .instruction data-picto="${picto}"}`, 'Rodea la casa.', ':::',
].join('\n'));

const withoutPicto = () => parseIR([
  '---', 'lang: es', '---', '',
  '::: {#b1 .instruction}', 'Rodea la casa.', ':::',
].join('\n'));

const images = new Map([['1001', 'data:image/png;base64,iVBORw0KGgo=']]);

/** What ARASAAC's own catalogue entry says, as the corpus carries it. */
const ARASAAC = {
  author: 'Sergio Palao',
  source: 'ARASAAC (https://arasaac.org) · Gobierno de Aragón',
  licence: 'CC BY-NC-SA',
};
const credits = new Map([['arasaac', ARASAAC]]);

describe('the attribution says where the pictures actually came from', () => {
  it('appears whenever the document carries a pictogram', () => {
    const line = attributionFor(withPicto(), credits);
    expect(line).toContain('Sergio Palao');
    expect(line).toContain('ARASAAC');
    expect(line).toContain('CC BY-NC-SA');
  });

  it('is absent when the document carries none', () => {
    expect(hasPictograms(withoutPicto())).toBe(false);
    expect(attributionFor(withoutPicto(), credits)).toBeNull();
  });

  /**
   * `007` FR-509's defect, not repeated: `job:render` used to take `signedOff` from
   * the renderer, so an unmarked sheet could be produced with no sign-off. A licence
   * condition passed as an argument is one somebody passes `false`.
   */
  it('has no parameter that could turn it off', () => {
    // Signed off removes the draft mark and changes nothing about the licence.
    const html = renderHTML(withPicto(), {
      signedOff: true, pictogramImages: images, pictogramCredits: credits,
    });
    expect(html).not.toContain('BORRADOR');
    expect(html).toContain('Sergio Palao');
  });

  /**
   * Review COD-08, decision P40 — and the reason the old test of this passed while
   * production printed the opposite.
   *
   * `attributionFor(doc, attribution = ARASAAC_ATTRIBUTION)` accepted an
   * alternative credit, and **both call sites called it with no second argument**.
   * So the parameter was dead: a teacher with a set that is not ARASAAC's — the
   * case `018` FR-1604 exists to support, a folder she assembled with its own
   * LICENSE, which `readSet` reads and shows her and never passed to the render —
   * printed «Autor pictogramas: Sergio Palao · Origen: ARASAAC» on every sheet.
   * **A false attribution, legally worse than a missing one.** And the unit test
   * that «proved» the parameter worked was the only thing that ever used it.
   */
  it('is derived from the sources the document used, not from a default', () => {
    // No credit for the source this sheet names: the line says so instead of
    // inventing one. This is the branch the old code could not have.
    const unknown = attributionFor(withPicto('casa=1001@otrojuego'), credits);
    expect(unknown).toContain('otrojuego');
    expect(unknown).not.toContain('Sergio Palao');
    expect(unknown).not.toContain('ARASAAC');
  });

  it('credits every source a mixed set used, which is FR-2116', () => {
    /*
     * `023` FR-2116: «the attribution records which publisher each pictogram came
     * from, so a set built from two sources is attributed correctly». The data did
     * not exist anywhere — `PictogramEntry` was `{ id, keywords }` and `mergeSet`
     * kept no publisher — while T001/T002 were ticked citing the requirement.
     */
    const both = parseIR([
      '---', 'lang: es', '---', '',
      '::: {#b1 .instruction data-picto="casa=1001@arasaac"}', 'Rodea la casa.', ':::',
      '::: {#b2 .instruction data-picto="perro=2002@otrojuego"}', 'Rodea el perro.', ':::',
    ].join('\n'));
    const line = attributionFor(both, credits) ?? '';
    expect(line).toContain('Sergio Palao');
    expect(line).toContain('otrojuego');
    expect(line.split('\n')).toHaveLength(2);
  });

  it('says «the set you have» for a sheet made before publishers were recorded', () => {
    /*
     * Every sheet in every existing vault. Attributing it to ARASAAC would be the
     * same false claim; naming the set she has configured and pointing at its
     * LICENSE is honest and cannot be wrong.
     */
    const legacy = attributionFor(withPicto('casa=1001'), credits) ?? '';
    expect(legacy).toMatch(/juego que tienes puesto/);
    expect(legacy).toContain('LICENSE');
    expect(legacy).not.toContain('Sergio Palao');
  });

  it('uses her own set\'s credit when she has told us what it is', () => {
    // FR-1604 for real: a set she assembled, keyed as «the configured one».
    const mine = attributionFor(withPicto('casa=1001'), new Map([
      ['', { author: 'Alguien', source: 'Otro juego', licence: 'CC BY' }],
    ]));
    expect(mine).toContain('Alguien');
    expect(mine).not.toContain('ARASAAC');
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
    const html = renderHTML(withPicto(), { pictogramImages: images, pictogramCredits: credits });
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
    // Including where it came from, which is what the attribution is derived from.
    expect(html).toContain('data-picto="casa=1001@arasaac"');
  });

  it('still carries the attribution, because the document still claims a pictogram', () => {
    expect(renderHTML(withPicto(), { pictogramImages: new Map(), pictogramCredits: credits }))
      .toContain('Sergio Palao');
  });
});
