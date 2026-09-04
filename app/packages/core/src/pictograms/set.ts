import { logger } from '../log.js';

/**
 * Reading a pictogram set (018 T007/T008, contract:
 * `specs/018-pictogramas/contracts/pictogram-set.md`).
 *
 * ## Whose set this is
 *
 * Hers. ARASAAC's pictograms are the property of the Gobierno de Aragón, created
 * by Sergio Palao, under CC BY-NC-SA — incompatible with Apache-2.0 on NonCommercial
 * and with our CC BY-SA content on ShareAlike. So Rampa does not bundle or
 * redistribute them (FR-1601, narrowed by `023` FR-2101). It **may** fetch them to
 * her disk at her request once she has accepted the licence, which is `023` and is
 * somebody else's file: this function still just reads a folder.
 *
 * The same shape as the API key (`009`): the relationship with the third party is
 * hers, Rampa is the thing that uses it, and we never stand between her and terms
 * she should read.
 *
 * ## Nothing here names ARASAAC
 *
 * FR-1604. Another set with equivalent metadata works, and the contract is
 * documented rather than reverse-engineered — we do not have an ARASAAC download to
 * write a parser against, and writing one from memory is how a feature ships broken
 * for the only set anybody uses.
 *
 * ## keyword → ids, plural
 *
 * The direction is the whole design. A flat `{"rana": "2483"}` map cannot express a
 * picture with several words *or* a word with several pictures — and the second is
 * the ambiguity that must become an omission (FR-1609). A map that can only hold
 * one answer silently picks a winner.
 */

export interface PictogramEntry {
  id: string;
  keywords: string[];
  /**
   * Which publisher this pictogram came from (`023` FR-2116, decision P40).
   *
   * Optional, and its absence is the honest state of every set assembled by hand
   * or fetched before this existed. Without it a set built from two sources was
   * **attributed to one of them** — the render printed «Autor pictogramas: Sergio
   * Palao · Origen: ARASAAC» over pictograms that were not ARASAAC's, and a false
   * attribution is legally worse than a missing one.
   *
   * The reader tolerates fields it does not know (`018` FR-2102's «no change to
   * the contract»), which is what lets this be added without breaking a set she
   * already has.
   */
  from?: string;
  /**
   * How much the publisher's own catalogue says this pictogram is used
   * (`024` FR-2217, decision P41).
   *
   * Optional for the same reason. It exists so «los candidatos, del más usado al
   * menos» can be true: `readIndex` had this number, `mergeSet` **threw it away**
   * when writing the metadata, and the chooser then showed her the four drawings
   * of «casa» in whatever order the file happened to hold — with a comment above
   * it claiming popularity order and a ticked task saying the same.
   */
  popularity?: number;
}

export interface PictogramSet {
  /** Where she put it. Recorded in the vault; the set itself never is. */
  root: string;
  /** Language code → keyword → the ids that claim it. */
  byLanguage: Map<string, Map<string, string[]>>;
  /** Ids for which an image file was found. */
  images: Set<string>;
  /**
   * Id → the publisher it came from, for the ids that record one (P40).
   *
   * A map rather than a field on the keyword index, because the question asked of
   * it is «where did *this id* come from» — the attribution of a document is
   * derived from the ids it actually used.
   */
  from: Map<string, string>;
  /** Id → how used the publisher says it is, for ordering the chooser (P41). */
  popularity: Map<string, number>;
  /** What the licence file said, when there is one. Shown to her, never parsed. */
  licence?: string;
}

/** Why a set cannot be used, named rather than collapsed into one failure. */
export type SetProblem =
  | { kind: 'no-metadata'; message: string }
  | { kind: 'no-images'; language: string; message: string }
  | { kind: 'unreadable-metadata'; file: string; message: string };

export interface SetReading {
  set: PictogramSet | null;
  problems: SetProblem[];
  /** What to tell her it found: «1.243 pictogramas en español». */
  summary: string;
}

/**
 * What a caller must supply. Deliberately not `node:fs`.
 *
 * `packages/core` is model-free **and** side-effect-free by design: the isolation
 * suite walks every file in it. A reader passed in keeps this testable against a
 * fixture with no temp directory, and keeps the one filesystem-touching decision —
 * which paths are allowed — in the shell where `resolveInVault` already lives.
 */
export interface SetReader {
  list: (dir: string) => Promise<string[]>;
  readText: (path: string) => Promise<string | null>;
}

const METADATA = /^pictograms\.([a-z]{2,3})\.json$/;
const IMAGE = /^(.+)\.(png|jpe?g|svg|webp)$/i;

export async function readSet(root: string, reader: SetReader): Promise<SetReading> {
  const problems: SetProblem[] = [];
  const entries = await reader.list(root);

  const byLanguage = new Map<string, Map<string, string[]>>();
  const images = new Set<string>();
  /** Per id, and across languages: an id is one pictogram whatever calls it. */
  const from = new Map<string, string>();
  const popularity = new Map<string, number>();

  for (const name of entries) {
    const img = IMAGE.exec(name);
    if (img) { images.add(img[1]!); continue; }
  }

  for (const name of entries) {
    const meta = METADATA.exec(name);
    if (!meta) continue;
    const language = meta[1]!;
    const raw = await reader.readText(`${root}/${name}`);
    if (raw === null) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      /*
       * Named, with the file, and **the rest of the set still loads**. The same
       * rule as `011` FR-907: one malformed language file must not take the others
       * down, because the consequence is a teacher with no pictograms at all and
       * no idea which file to fix.
       */
      problems.push({
        kind: 'unreadable-metadata', file: name,
        message: `No he podido leer «${name}»: no es un JSON válido. El resto del `
          + 'juego de pictogramas sí lo he leído.',
      });
      logger.warn('pictograms.metadata-unreadable', { file: name });
      continue;
    }

    if (!Array.isArray(parsed)) {
      problems.push({
        kind: 'unreadable-metadata', file: name,
        message: `«${name}» no tiene la forma que espero: una lista de `
          + '{ id, keywords }.',
      });
      continue;
    }

    const map = new Map<string, string[]>();
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue;
      const e = item as Record<string, unknown>;
      const id = typeof e['id'] === 'string' ? e['id'].trim()
        : typeof e['id'] === 'number' ? String(e['id']) : '';
      const keywords = Array.isArray(e['keywords'])
        ? e['keywords'].filter((k): k is string => typeof k === 'string')
        : [];
      if (!id || keywords.length === 0) continue;

      /*
       * Two optional fields, and both absent is the normal state of a set she
       * assembled by hand (P40, P41). Read here rather than guessed anywhere else:
       * an id with no `from` is attributed to the set she configured, not to
       * whichever publisher the code happened to know about.
       */
      if (typeof e['from'] === 'string' && e['from'].trim()) from.set(id, e['from'].trim());
      if (typeof e['popularity'] === 'number' && Number.isFinite(e['popularity'])) {
        popularity.set(id, e['popularity']);
      }

      for (const keyword of keywords) {
        const key = normalise(keyword);
        if (!key) continue;
        const ids = map.get(key) ?? [];
        // Deduplicated: the same id claiming a word twice is not an ambiguity.
        if (!ids.includes(id)) ids.push(id);
        map.set(key, ids);
      }
    }

    if (map.size > 0) byLanguage.set(language, map);
  }

  if (byLanguage.size === 0) {
    /*
     * **Filenames are not metadata.** A directory of `rana.png` looks like a set
     * and guessing from it is the wrong-pictogram failure this whole feature is
     * built around: she reads the text, the child reads the picture, and nobody
     * notices.
     */
    problems.push({
      kind: 'no-metadata',
      message: 'Esta carpeta no trae la lista de palabras, así que no puedo saber '
        + 'qué dibujo va con cada palabra. Los nombres de los ficheros no me sirven: '
        + 'adivinar es exactamente el fallo que hay que evitar.',
    });
    return { set: null, problems, summary: 'No he podido usar esta carpeta.' };
  }

  for (const language of byLanguage.keys()) {
    if (images.size === 0) {
      problems.push({
        kind: 'no-images', language,
        message: 'He encontrado la lista de palabras y ninguna imagen.',
      });
    }
  }

  const licence = (await reader.readText(`${root}/LICENSE`))
    ?? (await reader.readText(`${root}/LICENSE.txt`))
    ?? undefined;

  return {
    set: { root, byLanguage, images, from, popularity, ...(licence ? { licence } : {}) },
    problems,
    summary: describe(byLanguage, images),
  };
}

/** «1.243 pictogramas en español» — what she is told it found (US1 scenario 2). */
function describe(
  byLanguage: Map<string, Map<string, string[]>>, images: Set<string>,
): string {
  const LANGUAGE_ES: Record<string, string> = {
    es: 'español', en: 'inglés', ca: 'catalán', gl: 'gallego', eu: 'euskera',
    fr: 'francés', pt: 'portugués',
  };
  const parts = [...byLanguage.entries()].map(([lang, map]) =>
    `${map.size.toLocaleString('es-ES')} palabras en ${LANGUAGE_ES[lang] ?? lang}`);
  return `${images.size.toLocaleString('es-ES')} imágenes · ${parts.join(' · ')}.`;
}

/**
 * Lower case, accents folded, whitespace collapsed — **and nothing else**.
 *
 * No stemming, no plural rules, no synonyms. A word the set does not have gets
 * nothing, which is the correct outcome and not a gap to be closed with cleverness:
 * every inference here is a chance to produce a picture for a word she did not
 * write.
 */
export const normalise = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();


/**
 * Candidate ids, most-used first (`024` FR-2217, decision P41).
 *
 * ## Why this is a function in `core` and not two lines in the shell
 *
 * Because the two lines in the shell could not be tested. `candidatesFor` reaches
 * the settings and the filesystem, so nothing in the offline suite can see it —
 * and the first version of this fix lived there and **survived being deleted**:
 * every test still passed with the ordering gone, which is the same shape as the
 * defect it was fixing. FR-2217 and US2 both say «largest-used first», T017 was
 * ticked as «popularity-ordered», and the number was not on disk at all.
 *
 * By id as the tie-break, so a set with no popularity recorded still has a
 * **stable** order: an arbitrary order that changes between openings is worse than
 * an arbitrary one that does not.
 *
 * It is an order and not a recommendation. Which pictogram is right is hers
 * (`018` FR-1609, `024` FR-2203) — this only decides which she is shown first.
 */
export function mostUsedFirst(
  ids: readonly string[], popularity: ReadonlyMap<string, number>,
): string[] {
  return [...ids].sort((a, b) =>
    (popularity.get(b) ?? -1) - (popularity.get(a) ?? -1) || a.localeCompare(b));
}
