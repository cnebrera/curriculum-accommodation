import { describe, it, expect } from 'vitest';
import {
  buildStructure, renderHTML, renderLinear, assertNoLearnerData, attributionFor,
  type StructureItem, type PictogramSet,
} from '../src/index.js';
import { renderODT } from '../src/render/odt.js';

/**
 * What leaves the school in a backpack (028 T001, FR-2607/2608, SC-2603, quickstart §1).
 *
 * ## Why this file is written before any of it exists
 *
 * An adapted worksheet is used in a classroom and filed. **An agenda goes home**: it is
 * taped to a fridge, carried between the school and a therapist, photographed by a family
 * member and sent to whoever asks. Every rule this project has about learner data leaving
 * the building applies to it more sharply than to anything else it produces, and the way
 * to make sure of that is to write the assertion before the render path a mistake would
 * hide in.
 *
 * Two halves, and both are about what is on the **page**:
 *
 * 1. **No learner fact reaches any rendering** — HTML, ODT, linear. The document carries
 *    `for_learner` in its front matter, because that is the one fact linking the file to
 *    a child and the vault is where it belongs; the renderers take an IR and no profile,
 *    so the code has no path onto the page. Asserted anyway, in all three formats,
 *    including accented names — this project's one recorded blind spot.
 * 2. **Every rendering with a drawing carries the set's real attribution**, derived from
 *    the document rather than passed in. A pictogram on a page with no credit is the
 *    infringing page, and it is hers.
 */

/** A set with three words, one of them ambiguous. Enough to exercise both halves. */
const SET: PictogramSet = {
  root: '/fixture',
  byLanguage: new Map([['es', new Map([
    ['desayuno', ['1001']],
    ['patio', ['2001']],
    ['casa', ['3001', '3002']],
  ])]]),
  images: new Set(['1001', '2001', '3001', '3002']),
  from: new Map([['1001', 'arasaac'], ['2001', 'arasaac'], ['3001', 'arasaac']]),
  popularity: new Map(),
};

/** What the set says about itself. Required, with no default — see `attributionFor`. */
const CREDITS = new Map([['arasaac', {
  author: 'Sergio Palao',
  source: 'ARASAAC · Gobierno de Aragón',
  licence: 'CC BY-NC-SA 4.0',
}]]);

/**
 * The learner facts that must not appear, including the shapes that have caught this
 * project before: an accented name, and the same name folded.
 */
const CODE = 'AL-07';
const NAMES = ['Lucía', 'Lucia', 'Mateo', 'Iván'];
const FACTS = ['CEIP Ejemplo', 'TEA', '2015-04-12'];

const build = (items: StructureItem[], kind: 'agenda' | 'secuencia' = 'agenda') =>
  buildStructure({
    kind, title: 'Mañana del lunes', items, language: 'es', set: SET,
    forLearner: CODE, created: '2026-09-07',
  });

/**
 * A corpus of structure documents, not one — the point is that the property holds over
 * every shape the builder can produce, including the ones with gaps in them.
 */
const CORPUS = [
  build([{ word: 'desayuno' }, { word: 'patio' }]),
  build([{ word: 'casa' }]),                                    // ambiguous ⇒ gap
  build([{ word: 'asamblea' }]),                                // unknown ⇒ gap
  build([{ word: 'desayuno' }, { word: 'casa' }, { word: 'asamblea' }]),
  build([{ word: 'lavarse las manos', label: 'Lavarse las manos con jabón' }], 'secuencia'),
  build([], 'secuencia'),
];

describe('no learner fact reaches any rendering (FR-2608)', () => {
  for (const [i, built] of CORPUS.entries()) {
    it(`document ${i + 1}: HTML, linear and ODT are all clean`, () => {
      const html = renderHTML(built.doc);
      expect(() => assertNoLearnerData(html, [CODE], NAMES, FACTS)).not.toThrow();

      const linear = renderLinear(built.doc, {
        modality: 'audio', spatialPhrases: [], answerSpace: '',
      });
      const asText = linear.blocks.map((b) => b.text).join('\n');
      expect(() => assertNoLearnerData(asText, [CODE], NAMES, FACTS)).not.toThrow();

      /*
       * ODT too, and not because a different renderer might leak differently — because
       * this is the format that gets emailed. It is a ZIP, so the bytes are decoded as
       * text and searched: the XML inside is stored uncompressed by `zip()`, which is
       * what makes this a real check rather than a search of a compressed blob.
       */
      const odt = new TextDecoder().decode(renderODT(built.doc));
      expect(odt).toContain('office:document-content');
      expect(() => assertNoLearnerData(odt, [CODE], NAMES, FACTS)).not.toThrow();
    });
  }

  it('and the code is in the front matter, where the vault needs it', () => {
    /*
     * The counterpart, asserted so the first half cannot be satisfied by losing the link
     * between the file and the child. `for_learner` is what `startedFor` reads: without
     * it the record cannot list the agenda and erasure cannot remove it.
     */
    expect(CORPUS[0]!.doc.frontMatter['for_learner']).toBe(CODE);
    expect(renderHTML(CORPUS[0]!.doc)).not.toContain(CODE);
  });
});

describe('every drawing carries the set\'s real credit (FR-2607)', () => {
  it('the credit is derived from the document, never passed as a decision', () => {
    const withPicto = build([{ word: 'desayuno' }, { word: 'patio' }]);
    const line = attributionFor(withPicto.doc, CREDITS);
    expect(line).toContain('ARASAAC');
    expect(line).toContain('Sergio Palao');
    expect(line).toContain('CC BY-NC-SA');
  });

  it('and a document with no drawing at all needs none', () => {
    // Not «emits an empty credit»: a page with no pictogram has nothing to attribute,
    // and a dangling credit line is its own kind of false claim.
    const noPicto = build([{ word: 'asamblea' }]);
    expect(attributionFor(noPicto.doc, CREDITS)).toBeNull();
  });

  it('a page that carries a drawing and no credit is the infringing page', () => {
    /*
     * The claim stated as the failure it prevents. The licence is CC BY-NC-SA: the
     * attribution is the condition of use, and the page that omits it is hers, in a
     * child's backpack, with a school's name near it.
     */
    for (const built of CORPUS) {
      const hasPicto = built.doc.blocks.some((b) => typeof b.attrs['data-picto'] === 'string'
        && b.attrs['data-picto'] !== '');
      if (!hasPicto) continue;
      expect(attributionFor(built.doc, CREDITS), 'a drawing without its credit')
        .not.toBeNull();
    }
  });
});
