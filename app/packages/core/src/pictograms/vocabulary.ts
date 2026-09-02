import { parseFrontMatter } from '../vault/parse.js';
import { normalise } from './set.js';

/**
 * Her vocabulary: which drawing is «casa» (024 T005, FR-2214/2219/2220/2221).
 *
 * ## Why this is not `profile.pictograms.overrides`
 *
 * Because `018` put that on the **learner**, and its own rationale gives the game away:
 * «her school uses a different picture for *recreo*». That is a fact about her school,
 * not about one child. Stored per learner, she picks the same picture again for every
 * child in her caseload — and Carlos said it in one line: «lo bajo una vez y lo uso
 * para todos los que lo necesiten».
 *
 * So: chosen once, used for every learner. The per-learner override stays for the
 * genuine per-child exception and still wins (FR-2215).
 *
 * ## Why a Markdown file in her vault
 *
 * Principle I, applied to **her** judgements rather than only to ours. Which drawing
 * means «recreo» in her school is exactly the kind of decision the constitution says
 * belongs in a file a person can read and correct — and a handover has to carry it
 * (FR-2219), because it is professional knowledge about a school, not a preference.
 *
 * Her licence acceptance does **not** travel: that is an agreement she personally made
 * with a third party, and it is in application settings for that reason.
 *
 * ## What may not be in here
 *
 * A word. Nothing else. FR-2221 and `011` FR-910: no learner's name, no code, nothing
 * about a child. This file goes in a handover packet, and «which pictogram for casa» is
 * safe to hand over precisely because it says nothing about who it was for.
 */

export interface Vocabulary {
  /** language → normalised word → the pictogram id she chose. */
  byLanguage: Map<string, Map<string, string>>;
}

export const emptyVocabulary = (): Vocabulary => ({ byLanguage: new Map() });

/** Same allowlist as everywhere: an id becomes a filename (Principle IX). */
const ID = /^[A-Za-z0-9_-]{1,40}$/;

/**
 * Read it, tolerating everything.
 *
 * A word she cannot have meant, an id that is not an id, a language key that is not a
 * language: skipped, and the rest of the file still loads. The same rule `018`'s reader
 * has for a broken language file, and for the same reason — the consequence of failing
 * hard is a teacher with no pictograms at all and no idea which line to fix.
 */
export function parseVocabulary(raw: string, file = 'vocabulario.md'): Vocabulary {
  const { data } = parseFrontMatter(raw, file);
  const byLanguage = new Map<string, Map<string, string>>();

  const words = data['words'];
  if (!words || typeof words !== 'object') return { byLanguage };

  for (const [language, entries] of Object.entries(words as Record<string, unknown>)) {
    if (!/^[a-z]{2,3}$/.test(language) || !entries || typeof entries !== 'object') continue;
    const map = new Map<string, string>();
    for (const [word, id] of Object.entries(entries as Record<string, unknown>)) {
      const key = normalise(word);
      if (!key || typeof id !== 'string' || !ID.test(id.trim())) continue;
      map.set(key, id.trim());
    }
    if (map.size > 0) byLanguage.set(language, map);
  }
  return { byLanguage };
}

/**
 * Write it, for her to read.
 *
 * Sorted, so the diff of a file in her own vault is about what she changed. The prose
 * is hers rather than ours: she opens this in Obsidian or Notepad and it has to explain
 * itself without Rampa running.
 */
export function renderVocabulary(v: Vocabulary): string {
  const languages = [...v.byLanguage.entries()].sort(([a], [b]) => a.localeCompare(b));
  const lines: string[] = ['---', 'words:'];

  for (const [language, map] of languages) {
    if (map.size === 0) continue;
    lines.push(`  ${language}:`);
    for (const [word, id] of [...map.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      lines.push(`    ${JSON.stringify(word)}: "${id}"`);
    }
  }
  lines.push('---', '');
  lines.push('# Mi vocabulario de pictogramas', '');
  lines.push('Cuando una palabra tiene varios dibujos posibles, Rampa **no pone ninguno**');
  lines.push('hasta que eliges tú: un dibujo equivocado es peor que ninguno, porque el');
  lines.push('alumno lee el dibujo y tú lees el texto.', '');
  lines.push('Aquí está lo que has elegido. Lo eliges **una vez** y vale para todos tus');
  lines.push('alumnos. Si un alumno concreto necesita otro dibujo, eso va en su perfil y');
  lines.push('gana sobre esto.', '');
  lines.push('Puedes cambiarlo desde Rampa o editando el número de aquí arriba.', '');
  lines.push('**Las hojas que ya hiciste no cambian.** Se quedan con el dibujo anterior, y');
  lines.push('no te aviso de que están desactualizadas — todavía no sé hacerlo. Si quieres');
  lines.push('que lleven el nuevo, vuelve a prepararlas.', '');
  lines.push('**No pongas aquí nada de un alumno** — ni nombres, ni códigos. Este fichero');
  lines.push('viaja en un traspaso, y viaja precisamente porque no dice nada de nadie.');
  lines.push('');
  return lines.join('\n');
}

/** Her choice for one word, or `undefined`. */
export const chosenFor = (
  v: Vocabulary, language: string, word: string,
): string | undefined => v.byLanguage.get(language)?.get(normalise(word));

/** Record a choice. Returns a new vocabulary; nothing is mutated. */
export function choose(
  v: Vocabulary, language: string, word: string, id: string,
): Vocabulary {
  const key = normalise(word);
  if (!key || !ID.test(id)) return v;
  const byLanguage = new Map(v.byLanguage);
  const map = new Map(byLanguage.get(language) ?? []);
  map.set(key, id);
  byLanguage.set(language, map);
  return { byLanguage };
}

/** Forget a choice, so the word goes back to being reported as ambiguous. */
export function unchoose(v: Vocabulary, language: string, word: string): Vocabulary {
  const key = normalise(word);
  const existing = v.byLanguage.get(language);
  if (!existing || !existing.has(key)) return v;
  const byLanguage = new Map(v.byLanguage);
  const map = new Map(existing);
  map.delete(key);
  byLanguage.set(language, map);
  return { byLanguage };
}

/** As `matchWord` wants it: normalised word → id, for one language. */
export const forLanguage = (
  v: Vocabulary, language: string,
): ReadonlyMap<string, string> => v.byLanguage.get(language) ?? new Map();
