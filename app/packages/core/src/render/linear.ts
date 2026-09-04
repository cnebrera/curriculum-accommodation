import type { Block, IRDocument } from '../ir/types.js';
import { learnerFacing } from '../ir/parse.js';
import { draftMark } from './draft.js';
import { attributionFor } from './attribution.js';
import { parsePicto } from '../pictograms/apply.js';
import type { Attribution } from './attribution.js';

/**
 * One linear rendering, two modalities (019 T012-T019, FR-1708…1715).
 *
 * ## Why audio-ready and braille-ready are the same function
 *
 * Both answer «what is the order, and what has no order». `research.md` T011 found
 * that the third case — a structure whose meaning is spatial — needs the same
 * treatment in both: **named, never guessed, never silently dropped**. Two
 * implementations of that would be two chances to get it wrong differently, and
 * FR-1714's «named for the transcriber» and FR-1709's «announced as undescribed»
 * are the same sentence pointed at different people.
 *
 * What differs is small and is a parameter: audio says «éste no te lo puedo leer en
 * orden», braille-ready says «para el transcriptor: esto no se puede linealizar».
 *
 * ## The rule that decides everything
 *
 * **Linearise what is honestly linear; announce what is not, and say why.**
 *
 * Guessing was rejected because a matching exercise read as pairs has been
 * *answered aloud* — the linearisation is the answer key. Refusing the whole
 * document was rejected as the opposite failure: nine usable blocks withheld for
 * the tenth.
 *
 * ## What is never in the output
 *
 * The learner's code (FR-1712). It is the one thing the printed sheet carries and
 * this does not: a code read aloud in a classroom is a code that has stopped being
 * one.
 */

export type Modality = 'audio' | 'braille';

export interface LinearOptions {
  modality: Modality;
  /**
   * Phrases that mean «the layout is the exercise», from
   * `instructions/audio.md`.
   *
   * Corpus rather than code: which Spanish phrasings carry that meaning is a
   * judgement a PT can correct, and passing them in keeps this function's own
   * behaviour testable against a list rather than against the shipped file.
   */
  spatialPhrases: readonly string[];
  /** What to say where the page has an answer box. Also corpus. */
  answerSpace: string;
  /**
   * What each pictogram source says about itself (COD-08, P40).
   *
   * Same map the HTML renderer takes, and for the same reason: the linear export
   * carries the attribution too, so it printed the same false credit.
   */
  pictogramCredits?: ReadonlyMap<string, Attribution>;
  /** Cleared only by the review step (`007` FR-509). */
  signedOff?: boolean;
}

export interface LinearBlock {
  id: string;
  /** 1-based position in the reading order. */
  order: number;
  /** What is read, or what is announced instead. */
  text: string;
  /** True where the block was announced rather than read (FR-1709/1714). */
  announced: boolean;
  /** Why, when it was announced. For the report and for the transcriber. */
  because?: string;
}

export interface Linear {
  blocks: LinearBlock[];
  /** The document, as plain text in reading order. */
  text: string;
  /** Everything announced rather than read, for the report. */
  announced: Array<{ id: string; because: string }>;
}

const NOT_IN_ORDER: Record<Modality, string> = {
  audio: 'Éste no te lo puedo leer en orden.',
  braille: 'Para el transcriptor: esto no se puede linealizar sin perder información.',
};

const UNDESCRIBED: Record<Modality, string> = {
  audio: 'Hay una imagen sin describir. No sé qué hay en ella.',
  braille: 'Para el transcriptor: imagen sin descripción.',
};

/** «Ejercicio 3» — without it she cannot say «vuelve al tres». */
const numbered = (b: Block): string => {
  const n = b.attrs['data-number'];
  return n ? `${n}. ` : '';
};

/**
 * A block whose meaning is spatial (research R/T011).
 *
 * Three tells, in order of confidence:
 *
 * 1. A `figure` with no description — already `001` FR-011's case.
 * 2. A table with more than one column of data. One column is a list; two is a
 *    correspondence, and a correspondence read in sequence is lost.
 * 3. An instruction about spatial arrangement, from the corpus.
 *
 * Deliberately generous: a false positive costs one announced block that could
 * have been read, and a false negative produces a confidently wrong reading order —
 * which is the failure that gets found late and by the wrong person.
 */
export function spatialReason(
  b: Block, phrases: readonly string[], modality: Modality,
): string | null {
  if (b.classes.includes('figure')) {
    const described = (b.attrs['data-description'] ?? '').trim()
      || /^\s*>/m.test(b.content);
    if (!described) return UNDESCRIBED[modality];
  }

  const rows = b.content.split('\n').filter((l) => l.trim().startsWith('|'));
  if (rows.length >= 2) {
    const columns = Math.max(...rows.map((r) => r.split('|').filter((c) => c.trim()).length));
    if (columns >= 2) {
      return modality === 'audio'
        ? 'Aquí hay una tabla. Éste no te lo puedo leer en orden.'
        : 'Para el transcriptor: tabla de varias columnas.';
    }
  }

  const lower = b.content.toLowerCase();
  const hit = phrases.find((p) => lower.includes(p.toLowerCase()));
  if (hit) {
    return modality === 'audio'
      ? `Aquí hay un ejercicio que se hace sobre el dibujo o la disposición de la `
        + `página («${hit}»). ${NOT_IN_ORDER.audio}`
      : `Para el transcriptor: el ejercicio se resuelve sobre la disposición `
        + `(«${hit}»). ${NOT_IN_ORDER.braille}`;
  }

  return null;
}

/**
 * The reading order.
 *
 * `data-order` where a block carries one — a recipe that reordered a page already
 * knows the order it meant — and document order otherwise, which is almost
 * everything. Stable: blocks with no `data-order` keep their relative positions.
 */
function inReadingOrder(blocks: readonly Block[]): Block[] {
  return [...blocks]
    .map((b, i) => ({ b, i, o: Number(b.attrs['data-order'] ?? Number.NaN) }))
    .sort((x, y) => {
      if (Number.isFinite(x.o) && Number.isFinite(y.o)) return x.o - y.o;
      if (Number.isFinite(x.o)) return -1;
      if (Number.isFinite(y.o)) return 1;
      return x.i - y.i;
    })
    .map(({ b }) => b);
}

/** Does this block have somewhere to write? */
const hasAnswerSpace = (b: Block): boolean =>
  /_{4,}|\.{6,}|☐|\[\s*\]/.test(b.content)
  // A composed question says so outright (`027` FR-2503). The classes below already
  // covered it, and this makes the attribute mean the same thing in all three
  // renderers rather than being HTML's private arrangement.
  || b.attrs['data-answer-space'] !== undefined
  || b.classes.includes('exercise') || b.classes.includes('assessment');

export function renderLinear(doc: IRDocument, opts: LinearOptions): Linear {
  const out: LinearBlock[] = [];
  let order = 0;

  const push = (text: string, id = '', because?: string): void => {
    order += 1;
    out.push({ id, order, text, announced: because !== undefined, ...(because ? { because } : {}) });
  };

  /*
   * The draft mark **first** (FR-1711). A draft that only announces itself
   * visually does not announce itself to this learner — and this is the modality
   * where «I did not see the banner» is not a lapse of attention.
   */
  const mark = draftMark(doc, opts.signedOff);
  if (mark) push(mark.banner);

  for (const b of inReadingOrder(doc.blocks.filter(learnerFacing))) {
    const spatial = spatialReason(b, opts.spatialPhrases, opts.modality);
    if (spatial) {
      push(`${numbered(b)}${spatial}`, b.id, spatial);
      continue;
    }

    /*
     * A described figure **is** its description (FR-1709). Not «imagen» plus the
     * description: the description is what the picture says.
     */
    const description = (b.attrs['data-description'] ?? '').trim();
    const body = b.classes.includes('figure') && description
      ? description
      : b.content.trim();

    const pictos = parsePicto(b.attrs['data-picto']);
    const words = pictos.length > 0
      // The pictogram's word, because the picture cannot be heard or felt. This is
      // `018` FR-1614's text alternative doing the job it exists for.
      ? ` (con pictogramas: ${pictos.map((p) => p.word).join(', ')})`
      : '';

    push(`${numbered(b)}${body}${words}`, b.id);

    if (hasAnswerSpace(b)) push(opts.answerSpace, b.id);
  }

  const attribution = attributionFor(doc, opts.pictogramCredits ?? new Map());
  if (attribution) push(attribution);

  return {
    blocks: out,
    text: out.map((b) => b.text).join('\n\n') + '\n',
    announced: out.filter((b) => b.because !== undefined)
      .map((b) => ({ id: b.id, because: b.because! })),
  };
}

/**
 * Braille-ready, and **not braille** (FR-1715).
 *
 * The header says so in the file itself, because a file called `braille.txt` is a
 * file somebody will send to an embosser. Claiming to produce braille would be
 * claiming expertise this project does not have and cannot check — and the person
 * who would find out is a blind learner holding a page that does not work.
 */
export const BRAILLE_HEADER = [
  'PREPARADO PARA BRAILLE — NO ES BRAILLE',
  '',
  'Este fichero es texto lineal para que lo trabaje una persona que transcribe, o',
  'una impresora braille con su propio software. Rampa no produce braille y no',
  'sabe si el resultado sirve.',
  '',
  'Lo que no se ha podido linealizar está marcado en el propio texto.',
  '',
  '---',
].join('\n');

export const renderBrailleReady = (doc: IRDocument, opts: Omit<LinearOptions, 'modality'>): string =>
  `${BRAILLE_HEADER}\n\n${renderLinear(doc, { ...opts, modality: 'braille' }).text}`;
