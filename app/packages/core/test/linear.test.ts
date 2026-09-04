import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import {
  renderLinear, renderBrailleReady, spatialReason, parseAudioCorpus, DEFAULT_AUDIO,
  BRAILLE_HEADER, parseIR,
} from '../src/index.js';

/**
 * Audio-ready and braille-ready (019 Phase 3 and 4, T011's answer applied).
 *
 * **The one that matters is the third case.** A matching exercise read as pairs has
 * been *answered aloud* — the linearisation is the answer key — and it sounds
 * complete, so nobody finds out. So every test here that could produce a guessed
 * order asserts that it produces an announcement instead.
 *
 * The second most important is the silent skip. A learner who finishes an exercise
 * of eleven questions believing it had ten has been failed more quietly than one
 * who was told «éste no te lo puedo leer».
 */
const root = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');
const corpus = parseAudioCorpus(
  readFileSync(join(root, 'instructions', 'audio.md'), 'utf8'));

const opts = { ...corpus, spatialPhrases: corpus.spatialPhrases };
const audio = (doc: Parameters<typeof renderLinear>[0], signedOff = false) =>
  renderLinear(doc, { ...opts, modality: 'audio' as const, signedOff });

const sheet = (blocks: string[]) => parseIR(['---', 'lang: es', '---', '', ...blocks].join('\n'));

describe('the shipped corpus', () => {
  it('carries the phrases and parses', () => {
    expect(corpus.spatialPhrases.length).toBeGreaterThan(5);
    expect(corpus.spatialPhrases).toContain('une con flechas');
    expect(corpus.answerSpace).toContain('espacio para contestar');
  });

  /**
   * An empty list would silently turn every matching exercise into a linear read —
   * the exact failure this design rejected, arriving through a corpus edit.
   */
  it('fails closed when the list is empty, rather than open', () => {
    const parsed = parseAudioCorpus('---\nspatial_phrases: []\n---\n\n# x\n', 'test.md');
    expect(parsed.spatialPhrases).toEqual(DEFAULT_AUDIO.spatialPhrases);
  });
});

describe('what has no order is announced, never guessed', () => {
  /** **The case the design turns on.** */
  it('announces a matching exercise instead of reading it as pairs', () => {
    const doc = sheet([
      '::: {#b1 .exercise data-number="3"}',
      'Une con flechas cada animal con su clase:\n\nrana\nperro',
      ':::',
    ]);
    const out = audio(doc);
    const block = out.blocks.find((b) => b.id === 'b1');

    expect(block?.announced).toBe(true);
    expect(block?.text).toContain('no te lo puedo leer en orden');
    // The pairs are not read, because reading them answers the exercise.
    expect(out.text).not.toContain('rana\nperro');
    // And the number survives, so she can say «vuelve al tres».
    expect(block?.text).toContain('3.');
  });

  it('announces a two-column table', () => {
    const doc = sheet([
      '::: {#b1 .example}',
      '| Animal | Clase |\n| rana | anfibio |\n| perro | mamífero |',
      ':::',
    ]);
    expect(audio(doc).blocks.find((b) => b.id === 'b1')?.announced).toBe(true);
  });

  it('announces an undescribed figure rather than skipping it', () => {
    // `001` FR-011's case, in a modality where the picture cannot be seen at all.
    const doc = sheet(['::: {#f1 .figure}', 'Un mapa de España.', ':::']);
    const block = audio(doc).blocks.find((b) => b.id === 'f1');
    expect(block?.announced).toBe(true);
    expect(block?.text).toContain('sin describir');
  });

  it('reads a described figure as its description, because that is the picture', () => {
    const doc = sheet([
      '::: {#f1 .figure data-description="Un mapa con los ríos de la vertiente atlántica."}',
      'mapa.png', ':::',
    ]);
    const block = audio(doc).blocks.find((b) => b.id === 'f1');
    expect(block?.announced).toBe(false);
    expect(block?.text).toContain('vertiente atlántica');
    // Not «imagen» plus the description: the description IS the image.
    expect(block?.text).not.toContain('mapa.png');
  });

  it('never drops a block silently', () => {
    const doc = sheet([
      '::: {#b1 .instruction}', 'Lee y contesta.', ':::', '',
      '::: {#b2 .exercise}', 'Relaciona las columnas.', ':::', '',
      '::: {#b3 .exercise}', '¿Por qué llueve más en el norte?', ':::',
    ]);
    const out = audio(doc);
    // Every learner-facing block is present, whether read or announced.
    for (const id of ['b1', 'b2', 'b3']) {
      expect(out.blocks.some((b) => b.id === id), id).toBe(true);
    }
    expect(out.announced.map((a) => a.id)).toEqual(['b2']);
  });

  it('reads an ordinary block normally', () => {
    const doc = sheet(['::: {#b1 .explanation}', 'El Ebro nace en Cantabria.', ':::']);
    const block = audio(doc).blocks.find((b) => b.id === 'b1');
    expect(block?.announced).toBe(false);
    expect(block?.text).toContain('El Ebro nace en Cantabria');
  });
});

describe('the order', () => {
  it('is document order when nothing says otherwise', () => {
    const doc = sheet([
      '::: {#b1 .explanation}', 'Uno.', ':::', '',
      '::: {#b2 .explanation}', 'Dos.', ':::',
    ]);
    expect(audio(doc).blocks.filter((b) => b.id).map((b) => b.id)).toEqual(['b1', 'b2']);
  });

  it('follows data-order where a recipe reordered the page', () => {
    // Whoever reordered it already knows the order they meant.
    const doc = sheet([
      '::: {#b1 .explanation data-order="2"}', 'Segundo.', ':::', '',
      '::: {#b2 .explanation data-order="1"}', 'Primero.', ':::',
    ]);
    expect(audio(doc).blocks.filter((b) => b.id).map((b) => b.id)).toEqual(['b2', 'b1']);
  });

  it('keeps unordered blocks in their relative positions', () => {
    const doc = sheet([
      '::: {#b1 .explanation}', 'A.', ':::', '',
      '::: {#b2 .explanation data-order="1"}', 'Primero.', ':::', '',
      '::: {#b3 .explanation}', 'B.', ':::',
    ]);
    expect(audio(doc).blocks.filter((b) => b.id).map((b) => b.id)).toEqual(['b2', 'b1', 'b3']);
  });
});

describe('what is always said, and what is never said', () => {
  it('says the draft mark first', () => {
    // A draft that only announces itself visually does not announce itself to this
    // learner, and «I did not see the banner» is not a lapse of attention here.
    const out = audio(sheet(['::: {#b1 .explanation}', 'Texto.', ':::']));
    expect(out.blocks[0]!.text).toContain('BORRADOR');
    expect(out.blocks[0]!.order).toBe(1);
  });

  it('says nothing about the draft once she has signed it', () => {
    const out = audio(sheet(['::: {#b1 .explanation}', 'Texto.', ':::']), true);
    expect(out.text).not.toContain('BORRADOR');
  });

  it('announces an answer space, because silence there is a lost question', () => {
    const doc = sheet(['::: {#b1 .exercise}', '¿Por qué llueve?\n\n______', ':::']);
    expect(audio(doc).text).toContain('espacio para contestar');
  });

  /** FR-1712, the one thing the printed sheet carries and this does not. */
  it('never speaks the learner\'s code', () => {
    const doc = parseIR([
      '---', 'lang: es', 'learner: A1B2', '---', '',
      '::: {#b1 .explanation}', 'Texto.', ':::',
    ].join('\n'));
    expect(audio(doc).text).not.toContain('A1B2');
  });

  it('never speaks the report notes, which are hers', () => {
    const doc = sheet([
      '::: {#b1 .explanation}', 'Texto.', ':::', '',
      '::: {#report-notes .report-notes}', 'Quité un bloque porque…', ':::',
    ]);
    expect(audio(doc).text).not.toContain('Quité un bloque');
  });

  it('speaks a pictogram as its word, since the picture cannot be heard', () => {
    const doc = sheet([
      '::: {#b1 .instruction data-picto="casa=1001"}', 'Rodea la casa.', ':::',
    ]);
    expect(audio(doc).text).toContain('con pictogramas: casa');
  });

  it('carries the pictogram attribution, which is a licence condition', () => {
    /*
     * From the sources the document names, not from a constant (review COD-08,
     * decision P40). `attributionFor` used to default to ARASAAC's credit and
     * both callers took the default, so a sheet made from any other set printed
     * ARASAAC's credit — a **false** attribution, legally worse than none.
     */
    const doc = sheet([
      '::: {#b1 .instruction data-picto="casa=1001@arasaac"}', 'Rodea la casa.', ':::',
    ]);
    const credits = new Map([['arasaac', {
      author: 'Sergio Palao', source: 'ARASAAC · Gobierno de Aragón', licence: 'CC BY-NC-SA',
    }]]);
    expect(renderLinear(doc, { ...opts, modality: 'audio', pictogramCredits: credits }).text)
      .toContain('Sergio Palao');
  });

  it('and says «the set you have» rather than inventing a credit', () => {
    // A sheet from before publishers were recorded, or a set she built herself.
    const doc = sheet([
      '::: {#b1 .instruction data-picto="casa=1001"}', 'Rodea la casa.', ':::',
    ]);
    const said = audio(doc).text;
    expect(said).toMatch(/juego que tienes puesto/);
    expect(said).not.toContain('Sergio Palao');
  });
});

describe('braille-ready is not braille', () => {
  /** FR-1715. A file called `braille.txt` is a file somebody sends to an embosser. */
  it('says so in the file itself, before anything else', () => {
    const out = renderBrailleReady(sheet(['::: {#b1 .explanation}', 'Texto.', ':::']), opts);

    expect(out.startsWith(BRAILLE_HEADER)).toBe(true);
    expect(out).toContain('NO ES BRAILLE');
    expect(out).toContain('Rampa no produce braille');
  });

  it('names what could not be linearised for the transcriber, not for the learner', () => {
    const doc = sheet(['::: {#b1 .exercise}', 'Une con flechas los animales.', ':::']);
    const out = renderBrailleReady(doc, opts);

    expect(out).toContain('Para el transcriptor');
    // The audio wording is for a child; this one is for a professional.
    expect(out).not.toContain('no te lo puedo leer');
  });

  it('is the same reading order as the audio, from one function', () => {
    const doc = sheet([
      '::: {#b1 .explanation data-order="2"}', 'Segundo.', ':::', '',
      '::: {#b2 .explanation data-order="1"}', 'Primero.', ':::',
    ]);
    expect(renderBrailleReady(doc, opts).indexOf('Primero'))
      .toBeLessThan(renderBrailleReady(doc, opts).indexOf('Segundo'));
  });
});

describe('the spatial test in isolation', () => {
  const block = (content: string, classes: string[] = ['exercise']) =>
    parseIR(['---', '---', '', `::: {#b1 ${classes.map((c) => `.${c}`).join(' ')}}`,
      content, ':::'].join('\n')).blocks[0]!;

  it('is generous on purpose', () => {
    // A false positive costs one announced block; a false negative produces a
    // confidently wrong reading order.
    for (const content of [
      'Une con flechas.', 'Relaciona cada río con su vertiente.',
      'Coloca en la recta numérica el 7.', 'Observa la imagen y contesta.',
    ]) {
      expect(spatialReason(block(content), corpus.spatialPhrases, 'audio'), content)
        .not.toBeNull();
    }
  });

  it('leaves ordinary prose alone', () => {
    for (const content of [
      '¿Por qué llueve más en el norte?', 'Escribe una frase con la palabra casa.',
      'Resuelve estas multiplicaciones.',
    ]) {
      expect(spatialReason(block(content), corpus.spatialPhrases, 'audio'), content)
        .toBeNull();
    }
  });
});
