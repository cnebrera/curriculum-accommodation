import { normalise } from './set.js';
import type { PictogramEntry } from './set.js';
import type { WordList } from './wordlist.js';

/**
 * Planning and parsing a fetch (023 T005-T007, FR-2111…2115).
 *
 * ## Pure, and it stays pure
 *
 * No transport, no filesystem, no clock. `packages/core` is side-effect-free by
 * design and the isolation suite walks every file in it; the request itself lives in
 * `packages/shell/src/pictograms/download.ts`, which is where a timeout and a disk
 * belong.
 *
 * What that buys is the assertion `023` SC-2103 needs. «Nothing is fetched before she
 * accepts» is only worth something if the thing that fetches can be replaced by a spy
 * that fails the test when called at all, and that requires the decision of *what* to
 * fetch to be separable from the doing of it.
 *
 * ## The output is `018`'s input
 *
 * `mergeSet` produces exactly what `readSet` reads: a list of `{ id, keywords }`. No
 * new format, no new contract, no change to the reader — FR-2102 — and a set she
 * assembled by hand stays indistinguishable from a fetched one.
 */

export interface FetchLimits {
  /** From the corpus. Reached is reported, never silently applied (FR-2117). */
  wordsPerFetch: number;
}

export interface FetchPlan {
  /** The words to ask for, in order. */
  fetch: string[];
  /** Already in the set, so not asked for again (FR-2112). */
  present: string[];
  /**
   * Cut by the bound (FR-2117).
   *
   * Returned rather than dropped, so the screen can say «me he traído 300 y faltan
   * 47» — a bound applied in silence reads as «that is all there was».
   */
  cut: string[];
}

/**
 * What to ask for, given what is already there.
 *
 * `present` is the set's own keyword map for this language, so «already there» means
 * «this word already resolves to at least one pictogram» — not «some file with a
 * similar name exists». A word whose only candidate has no image is **not** present:
 * `018` FR-1616 renders that as a named gap, and re-fetching is how the gap closes.
 */
export function planFetch(
  list: WordList,
  present: ReadonlyMap<string, string[]> | undefined,
  images: ReadonlySet<string> | undefined,
  limits: FetchLimits,
): FetchPlan {
  const already: string[] = [];
  const wanted: string[] = [];

  for (const word of list.words) {
    const ids = present?.get(normalise(word)) ?? [];
    const usable = ids.length > 0 && ids.some((id) => images?.has(id) ?? false);
    if (usable) already.push(word);
    else wanted.push(word);
  }

  const bound = limits.wordsPerFetch > 0 ? limits.wordsPerFetch : wanted.length;
  return {
    fetch: wanted.slice(0, bound),
    present: already,
    cut: wanted.slice(bound),
  };
}

/**
 * One id and the words that claim it.
 *
 * `PictogramCandidate` and not `Candidate`: `guide/read.ts` already exports that name.
 * Second collision in ten minutes, both caught by the barrel file at the moment of
 * export — which is the cheapest place this project has found to catch them.
 */
export interface PictogramCandidate {
  id: string;
  keywords: string[];
}

/**
 * Ids are digits and ASCII letters. Nothing else, ever.
 *
 * This is the Principle IX check for this feature. An id from a publisher's response
 * becomes a **filename** on her disk and a segment of an image **URL**, so an id
 * containing `../`, a slash, a null byte or a query string is a path traversal and an
 * SSRF wearing a JSON field's clothing. An allowlist, and refused rather than
 * sanitised — `007` FR-508's rule for paths, and `022` FR-2008's for markup.
 */
const ID = /^[A-Za-z0-9_-]{1,40}$/;

/**
 * A publisher's search response → candidates. **Every** candidate (FR-2113).
 *
 * Keeping all of them is what lets `018` FR-1609 still turn an ambiguous word into an
 * omission plus a report line. Picking one here — the first, the most downloaded, the
 * one whose keyword matches best — would move that decision from a screen she can see
 * to a parser she cannot, and the wrong pictogram is worse than none.
 *
 * ## Shape, not schema
 *
 * ARASAAC returns `[{ _id, keywords: [{ keyword }] }]`. Read structurally: an array of
 * objects with an id-ish field and keywords that are either strings or objects with a
 * `keyword`. A publisher whose JSON differs slightly still works, and one whose JSON
 * is unrecognisable yields nothing rather than guesses — which is reported as a word
 * not found, and not as a crash.
 */
export function readCandidates(json: unknown, word: string): PictogramCandidate[] {
  if (!Array.isArray(json)) return [];
  const out: PictogramCandidate[] = [];

  for (const item of json) {
    if (!item || typeof item !== 'object') continue;
    const e = item as Record<string, unknown>;

    const rawId = e['_id'] ?? e['id'];
    const id = typeof rawId === 'number' ? String(rawId)
      : typeof rawId === 'string' ? rawId.trim() : '';
    if (!ID.test(id)) continue;

    const keywords = new Set<string>();
    /*
     * The searched word is always a keyword of its own results.
     *
     * Without this, a publisher that returns keywords in a shape we do not
     * recognise would write entries with no words — which `readSet` skips, so the
     * fetch would report success and the set would gain nothing.
     */
    keywords.add(normalise(word));

    const raws = Array.isArray(e['keywords']) ? e['keywords'] : [];
    for (const k of raws) {
      if (typeof k === 'string') { if (normalise(k)) keywords.add(normalise(k)); continue; }
      if (k && typeof k === 'object') {
        const kw = (k as Record<string, unknown>)['keyword'];
        if (typeof kw === 'string' && normalise(kw)) keywords.add(normalise(kw));
      }
    }
    out.push({ id, keywords: [...keywords] });
  }
  return out;
}

/**
 * The metadata to write: what was there, plus what came back.
 *
 * **Idempotent** (FR-2115). A fetch she interrupted and restarted must not produce an
 * entry twice, because `readSet` deduplicates ids per keyword but would keep two
 * entries for the same id — and a metadata file that grows every time she presses the
 * button is a file that eventually stops being readable.
 *
 * Existing keywords are kept: a set she assembled by hand may know words this
 * publisher does not, and a fetch is additive by definition. Nothing here removes
 * anything.
 */
export function mergeSet(
  existing: readonly PictogramEntry[], fetched: readonly PictogramCandidate[],
): PictogramEntry[] {
  const byId = new Map<string, Set<string>>();

  for (const e of existing) {
    if (!ID.test(e.id)) continue;
    const words = byId.get(e.id) ?? new Set<string>();
    for (const k of e.keywords) if (normalise(k)) words.add(normalise(k));
    byId.set(e.id, words);
  }
  for (const c of fetched) {
    const words = byId.get(c.id) ?? new Set<string>();
    for (const k of c.keywords) if (normalise(k)) words.add(normalise(k));
    byId.set(c.id, words);
  }

  return [...byId.entries()]
    .filter(([, words]) => words.size > 0)
    // Sorted, so the file's diff is about what changed and not about fetch order.
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, words]) => ({ id, keywords: [...words].sort() }));
}

/** What she is told a fetch did (FR-2114, FR-2117). */
export interface FetchOutcome {
  /** Words that gained at least one pictogram. */
  found: string[];
  /** Words the publisher does not have. By name (FR-2114). */
  missing: string[];
  /** Words already in the set (FR-2112). */
  present: string[];
  /** Words the bound cut (FR-2117). */
  cut: string[];
  /** Words whose request failed — network, timeout, refusal. Retryable. */
  failed: string[];
  images: number;
  /** How many words never left because they were a name (FR-2109). */
  namesRemoved: number;
  /**
   * Words that came back with **several** pictograms (`018` FR-1609).
   *
   * ## Why a fetch has to say this
   *
   * The first real fetch against ARASAAC, 2026-09-02: three words —
   * «casa», «perro», «multiplicar» — returned **26 pictograms**. Every candidate is
   * kept on purpose (FR-2113), because the wrong pictogram is worse than none. But
   * `018` FR-1609 then omits an ambiguous word from the sheet.
   *
   * So without this number the button would appear to work perfectly and the sheet
   * would come out with no pictograms on it, and she would have no way to connect the
   * two. «He traído 3 palabras» would be true and useless.
   *
   * It is not a defect `023` introduced — a folder assembled by hand from ARASAAC's
   * own site behaves identically, and `018` shipped that way. What `023` changes is
   * that it is now easy to reach, which is exactly when a latent gap starts costing
   * somebody an afternoon. Recorded in backlog G30.
   */
  ambiguous: string[];
}

/**
 * «He traído 42 palabras nuevas. 3 no las tiene ARASAAC.»
 *
 * Every non-empty category gets a sentence, and the order is what she can act on
 * first: what worked, what she could retry, what she could ask for again, what was
 * simply not there.
 */
export function describeOutcome(o: FetchOutcome, publisher: string): string[] {
  const lines: string[] = [];
  const n = (x: number) => x.toLocaleString('es-ES');

  if (o.found.length > 0) {
    lines.push(`He traído ${n(o.found.length)} `
      + `palabra${o.found.length === 1 ? '' : 's'} nueva${o.found.length === 1 ? '' : 's'}`
      + ` y ${n(o.images)} dibujo${o.images === 1 ? '' : 's'}.`);
  }
  if (o.failed.length > 0) {
    lines.push(`${n(o.failed.length)} se han quedado a medias por la conexión. `
      + 'Si vuelves a darle, sólo pido las que faltan.');
  }
  if (o.cut.length > 0) {
    lines.push(`Me he parado en el tope de esta descarga, así que faltan `
      + `${n(o.cut.length)}. Dale otra vez para seguir.`);
  }
  if (o.present.length > 0) {
    lines.push(`${n(o.present.length)} ya las tenías, así que no las he vuelto a pedir.`);
  }
  /*
   * Before the misses, because it is the line that explains an empty sheet — and she
   * has to be able to act on it while she still remembers pressing the button.
   */
  if (o.ambiguous.length > 0) {
    const shown = o.ambiguous.slice(0, 6).map((w) => `«${w}»`).join(', ');
    lines.push(`Ojo: ${n(o.ambiguous.length)} `
      + `palabra${o.ambiguous.length === 1 ? '' : 's'} `
      + `${o.ambiguous.length === 1 ? 'tiene' : 'tienen'} varios dibujos posibles `
      + `(${shown}${o.ambiguous.length > 6 ? '…' : ''}). Hasta que elijas cuál, `
      + 'no pongo ninguno: un dibujo equivocado es peor que ninguno.');
  }
  if (o.missing.length > 0) {
    const shown = o.missing.slice(0, 8).map((w) => `«${w}»`).join(', ');
    lines.push(`${n(o.missing.length)} no las tiene ${publisher}: ${shown}`
      + `${o.missing.length > 8 ? '…' : ''}. No es un fallo tuyo ni mío.`);
  }
  if (o.namesRemoved > 0) {
    lines.push(`${n(o.namesRemoved)} palabra${o.namesRemoved === 1 ? '' : 's'} no `
      + `${o.namesRemoved === 1 ? 'ha' : 'han'} salido de tu ordenador porque `
      + `${o.namesRemoved === 1 ? 'era un nombre' : 'eran nombres'}.`);
  }
  if (lines.length === 0) lines.push('No había nada que traer.');
  return lines;
}

/**
 * May anything be fetched? (FR-2104, SC-2103.)
 *
 * ## Why the gate is a pure function
 *
 * Because it has to be testable where the transport can be a spy that fails the test
 * when called. `bringPictograms` in the shell reaches the vault, the settings and the
 * encrypted name map, so it cannot run in the offline suite — and «nothing is fetched
 * before she accepts» asserted only through Electron is a guarantee asserted nowhere.
 *
 * So the decision lives here and the effects live there. The shell calls this and
 * obeys it; this is what the tests interrogate.
 *
 * ## Why the publisher has to match
 *
 * Accepting ARASAAC's licence is not accepting somebody else's. A second publisher
 * added to the corpus must ask again — otherwise a corpus edit would silently extend
 * an agreement she made about one specific licence, which is the shape of consent this
 * project refuses everywhere else.
 */
export type FetchGate =
  | { may: true; publisherId: string }
  | { may: false; because: 'no-publisher' }
  | { may: false; because: 'not-accepted'; publisher: string };

export function fetchGate(
  publisherIds: readonly string[],
  accepted: { publisher: string } | null | undefined,
  wanted?: string,
): FetchGate {
  /*
   * The third fallback is a defect the e2e found (2026-09-02).
   *
   * With nothing accepted and nothing requested, this returned `no-publisher` — so a
   * fresh install was told «No tengo de dónde traer pictogramas», which is **false**:
   * the corpus has ARASAAC and she simply had not accepted it yet. A refusal that
   * misnames its own reason sends her to fix the wrong thing, and this one sent her
   * looking for a folder when the answer was a button two lines above.
   *
   * Only when there is exactly one. With several, «which?» is a real question and
   * guessing an answer would record an acceptance for a licence she did not read.
   */
  const id = wanted ?? accepted?.publisher
    ?? (publisherIds.length === 1 ? publisherIds[0] : undefined);
  if (!id || !publisherIds.includes(id)) return { may: false, because: 'no-publisher' };
  if (!accepted || accepted.publisher !== id) {
    return { may: false, because: 'not-accepted', publisher: id };
  }
  return { may: true, publisherId: id };
}
