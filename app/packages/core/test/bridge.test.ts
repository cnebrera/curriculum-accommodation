import { describe, it, expect } from 'vitest';
import { bridgeWords, explainAbsence, type PictogramSet } from '../src/index.js';

/**
 * A bridge word comes from the set or it does not come at all (033 T015, FR-3106).
 *
 * ## The failure that shapes every case here
 *
 * A model asked for «denominador en árabe» answers. It answers confidently, in a script
 * this teacher very likely cannot read, and the answer goes onto a child's worksheet
 * where nobody in the room can check it. She would be handing him a word she cannot
 * verify, in a document with her name on it.
 *
 * So the join is a pictogram id — two languages' keywords for the same published drawing
 * — and every case below is about what happens when that join is not available. The
 * honest answer is always the same: no gloss, named.
 */
const SET: PictogramSet = {
  root: '/fixture',
  byLanguage: new Map([
    ['es', new Map([
      ['denominador', ['1001']],
      ['numerador', ['1002']],
      ['banco', ['3001', '3002']],   // bench and bank: two meanings, two drawings
      ['fotosintesis', ['1003']],
    ])],
    ['ar', new Map([
      ['مقام', ['1001']],
      ['بسط', ['1002']],
      /*
       * An entry for one of «banco»'s two drawings, and this is deliberate.
       *
       * Without it the ambiguity case passed for the wrong reason: the lookup took the
       * first id, found nothing for it in Arabic, and produced an absence anyway — so
       * loosening «exactly one id» to «at least one» changed nothing and the test stayed
       * green. Mutation found it. With this entry, the only thing standing between
       * «banco» and a gloss is the refusal itself.
       */
      ['مقعد', ['3001']],
      // No entry for 1003: the word exists in Spanish and not here.
    ])],
    ['ro', new Map([['numitor', ['1001']]])],
  ]),
  images: new Set(['1001', '1002', '1003', '3001', '3002']),
  from: new Map(),
  popularity: new Map(),
};

describe('a gloss is resolved through the shared id', () => {
  it('the same drawing in two languages is the bridge', () => {
    const { glosses, absences } = bridgeWords({
      words: ['denominador', 'numerador'], from: 'es', to: ['ar'], set: SET,
    });
    expect(glosses).toEqual([
      { word: 'denominador', gloss: 'مقام', pictogramId: '1001', language: 'ar' },
      { word: 'numerador', gloss: 'بسط', pictogramId: '1002', language: 'ar' },
    ]);
    expect(absences).toEqual([]);
  });

  it('and two languages produce two bridges for the same word', () => {
    // She recorded both, which happens: the family speaks one and he was schooled in
    // another. Nothing here picks between them.
    const { glosses } = bridgeWords({
      words: ['denominador'], from: 'es', to: ['ar', 'ro'], set: SET,
    });
    expect(glosses.map((g) => g.language)).toEqual(['ar', 'ro']);
    expect(glosses.map((g) => g.gloss)).toEqual(['مقام', 'numitor']);
  });

  it('and the word is normalised the way the set is indexed', () => {
    /*
     * «Denominador» capitalised, as it would appear at the start of a sentence, against
     * an index that folds case and accents. It must still bridge.
     *
     * The first version of this used a word the target language does not have, so it
     * asserted «no gloss» — which is what happens with **or** without normalisation, and
     * deleting `normalise` left it green. Mutation found that too.
     */
    const { glosses } = bridgeWords({
      words: ['Denominador'], from: 'es', to: ['ar'], set: SET,
    });
    expect(glosses).toEqual([
      { word: 'Denominador', gloss: 'مقام', pictogramId: '1001', language: 'ar' },
    ]);
  });

  it('and an absence names the word as she wrote it, not as the index folds it', () => {
    const { absences } = bridgeWords({
      words: ['Fotosíntesis'], from: 'es', to: ['ro'], set: SET,
    });
    expect(absences).toEqual([
      { kind: 'word-has-no-entry', word: 'Fotosíntesis', language: 'ro' },
    ]);
  });
});

describe('what happens when there is no bridge', () => {
  it('no set at all: one absence, and no glosses', () => {
    const { glosses, absences } = bridgeWords({
      words: ['denominador'], from: 'es', to: ['ar'], set: null,
    });
    expect(glosses).toEqual([]);
    expect(absences).toEqual([{ kind: 'no-set' }]);
  });

  it('the language is not in the set: one absence for the language, not one per word', () => {
    /*
     * She needs to know that Wolof is not there — a fact about her setup with one
     * remedy. Nine «word-has-no-entry» lines would bury that under noise about words,
     * none of which is the thing to fix.
     */
    const { glosses, absences } = bridgeWords({
      words: ['denominador', 'numerador', 'fotosintesis'], from: 'es', to: ['wo'], set: SET,
    });
    expect(glosses).toEqual([]);
    expect(absences).toEqual([{ kind: 'language-not-in-set', language: 'wo' }]);
  });

  it('the word has no entry in that language: named, and the rest still bridge', () => {
    const { glosses, absences } = bridgeWords({
      words: ['denominador', 'fotosintesis'], from: 'es', to: ['ar'], set: SET,
    });
    expect(glosses.map((g) => g.word)).toEqual(['denominador']);
    expect(absences).toEqual([
      { kind: 'word-has-no-entry', word: 'fotosintesis', language: 'ar' },
    ]);
  });

  it('an ambiguous word gets nothing, because the wrong meaning is worse than none', () => {
    /*
     * «Banco» is a bench and a bank, and the two have different drawings. Picking one
     * would put a false word on the page in a language nobody in the room reads — and
     * unlike a picture, she cannot glance at it and see that it is wrong.
     *
     * The same refusal `matchWord` makes for the same reason, and there is deliberately
     * no chooser: choosing between words in a script she may not read is not a decision
     * this application can ask her to make.
     */
    const { glosses, absences } = bridgeWords({
      words: ['banco'], from: 'es', to: ['ar'], set: SET,
    });
    expect(glosses).toEqual([]);
    expect(absences).toEqual([{ kind: 'word-has-no-entry', word: 'banco', language: 'ar' }]);
  });

  it('and no recorded language means the lookup returns nothing at all', () => {
    // Not «all words fail»: she recorded no language, so there is nothing to bridge to
    // and nothing to report about it either.
    const { glosses, absences } = bridgeWords({
      words: ['denominador'], from: 'es', to: [], set: SET,
    });
    expect(glosses).toEqual([]);
    expect(absences).toEqual([]);
  });
});

describe('every absence has a sentence she can act on', () => {
  it('each says what is missing and where to fix it', () => {
    expect(explainAbsence({ kind: 'no-set' })).toContain('Configuración');
    expect(explainAbsence({ kind: 'language-not-in-set', language: 'árabe' }))
      .toContain('árabe');
    // And it says the visual support still happened: the sheet is not «nothing».
    expect(explainAbsence({ kind: 'language-not-in-set', language: 'árabe' }))
      .toContain('apoyo visual');
    expect(explainAbsence({ kind: 'word-has-no-entry', word: 'banco', language: 'árabe' }))
      .toContain('varios');
  });

  it('and the three are three different sentences', () => {
    // Collapsed into one, she would have a fact with no remedy — the `SetProblem`
    // argument, which is why the type is a union rather than a boolean.
    const said = new Set([
      explainAbsence({ kind: 'no-set' }),
      explainAbsence({ kind: 'language-not-in-set', language: 'x' }),
      explainAbsence({ kind: 'word-has-no-entry', word: 'y', language: 'x' }),
    ]);
    expect(said.size).toBe(3);
  });
});
