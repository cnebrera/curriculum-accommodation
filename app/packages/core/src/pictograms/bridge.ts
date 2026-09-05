import { normalise, type PictogramSet } from './set.js';

/**
 * A bridge word, resolved by code and never by a model (033 T010, FR-3106).
 *
 * ## What a bridge is, and why it can be trusted
 *
 * A learner three weeks into the classroom's language meets «denominador» in a maths
 * sheet. The word stays — it is what he has to learn, and removing it removes the course
 * — but he is given the word his own language uses for the same thing, once, the first
 * time it appears.
 *
 * The join is a **pictogram id**: «denominador» and its Arabic equivalent are the two
 * languages' keywords for the same drawing, in metadata somebody published. So the
 * equivalence is not Rampa's opinion and not a model's; it is a correspondence a teacher
 * can look up and disagree with.
 *
 * ## Why no model is allowed near this
 *
 * A model asked for «denominador en árabe» will answer. It will answer confidently, in a
 * script this teacher very likely cannot read, and the answer will go onto a child's
 * worksheet where nobody in the room can check it. That is the one failure this whole
 * feature has to make impossible, and the way to make it impossible is to have no code
 * path that could produce a word from anything but the set's own data.
 *
 * ## Absences are named, never collapsed
 *
 * «No set», «that language is not in the set» and «that word has no entry» are three
 * different facts with three different remedies, and the report says which. Collapsed
 * into «no glosses» she would have nothing to act on — the `SetProblem` pattern from
 * `set.ts`, for the same reason.
 */

export interface BridgeGloss {
  /** The vocabulary word, in the material's language. */
  word: string;
  /** What the bridge language's metadata says for the same pictogram id. */
  gloss: string;
  /** The id that joins them — the bridge itself. */
  pictogramId: string;
  /** The bridge language, from the profile. */
  language: string;
}

export type BridgeAbsence =
  | { kind: 'no-set' }
  | { kind: 'language-not-in-set'; language: string }
  | { kind: 'word-has-no-entry'; word: string; language: string };

export interface BridgeResult {
  glosses: BridgeGloss[];
  absences: BridgeAbsence[];
}

export function bridgeWords(args: {
  /** The key words, in the material's language, chosen by the caller. */
  words: readonly string[];
  /** The material's language — the side the words are in. */
  from: string;
  /** The languages **she** recorded. Never derived from anything else. */
  to: readonly string[];
  set: PictogramSet | null;
}): BridgeResult {
  const glosses: BridgeGloss[] = [];
  const absences: BridgeAbsence[] = [];

  if (!args.set) return { glosses, absences: [{ kind: 'no-set' }] };
  const source = args.set.byLanguage.get(args.from);
  if (!source) return { glosses, absences: [{ kind: 'no-set' }] };

  for (const language of args.to) {
    const target = args.set.byLanguage.get(language);
    if (!target) {
      // The whole language is missing: one absence, not one per word. She needs to know
      // that this language is not there, not that nine words failed.
      absences.push({ kind: 'language-not-in-set', language });
      continue;
    }

    /*
     * id → the target language's word for it, built once per language.
     *
     * Inverted here rather than searched per word: the index is word → ids, and asking it
     * «which word means this id» for every key word would be a scan of the whole language
     * per word. A sheet has a handful of key words and a set has tens of thousands of
     * entries.
     */
    const byId = new Map<string, string>();
    for (const [word, ids] of target) {
      for (const id of ids) if (!byId.has(id)) byId.set(id, word);
    }

    for (const word of args.words) {
      const ids = source.get(normalise(word)) ?? [];
      /*
       * **Exactly one id, or nothing** — the same refusal `matchWord` makes.
       *
       * A word with several candidate drawings is a word with several meanings, and
       * picking one would put the wrong translation on the page: «banco» is a bench and a
       * bank, and a child reading the wrong one learns something false about a word he is
       * being taught. There is no chooser here because a bridge is not a picture she can
       * recognise at a glance — she would be choosing between words in a script she may
       * not read.
       */
      const gloss = ids.length === 1 ? byId.get(ids[0]!) : undefined;
      if (gloss === undefined) {
        absences.push({ kind: 'word-has-no-entry', word, language });
        continue;
      }
      glosses.push({ word, gloss, pictogramId: ids[0]!, language });
    }
  }

  return { glosses, absences };
}

/**
 * What the report says about a bridge that could not be built, in her words (FR-3106).
 *
 * Here rather than in the report module because the three absences are the three facts
 * this file knows about, and a sentence assembled elsewhere from a `kind` string is a
 * second place that has to learn about a fourth absence.
 */
export function explainAbsence(a: BridgeAbsence): string {
  switch (a.kind) {
    case 'no-set':
      return 'No tienes ningún vocabulario puesto, así que esta hoja va con apoyo visual '
        + 'pero sin palabras en su idioma. Se pone en Configuración ▸ Pictogramas.';
    case 'language-not-in-set':
      return `Lo que tienes puesto no trae ${a.language}, así que en esta hoja no he podido `
        + 'poner ninguna palabra puente. El apoyo visual sí va.';
    case 'word-has-no-entry':
      return `«${a.word}» no la he podido poner en ${a.language}: o no está, o tiene varios `
        + 'significados y no me toca elegir cuál. Va sin puente.';
  }
}
