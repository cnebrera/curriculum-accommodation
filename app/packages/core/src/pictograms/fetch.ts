import { normalise } from './set.js';
import type { PictogramEntry } from './set.js';

/**
 * Planning and parsing a fetch (023 T005-T007; 024 T002/T003).
 *
 * ## `024` deleted the word-by-word path, and the privacy story got shorter
 *
 * `023` sent one vocabulary word per request, and three of its requirements existed to
 * bound what that leaked: a word list built by removing the names Rampa knows, a filter
 * rejecting anything that was not a plain word, and an assertion on what the transport
 * was asked for.
 *
 * `024` fetches the whole catalogue in one indexed request, so **no word leaves at
 * all** — a language and a set of numeric ids, and nothing else. FR-2108's guarantee
 * stopped needing machinery to hold it up. Deleting the path rather than deprecating it
 * is the point: two ways in is how the one without the guard gets called.
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
  /** Pixels per image, from the corpus (024 FR-2204). */
  imageSize: number;
  /** How many images at once (024 FR-2207). */
  concurrency: number;
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
    /*
     * Only when there is one. `readIndex` calls this with an empty «searched word»
     * because a bulk index has no search behind it — and an unconditional `add('')`
     * meant an entry with no keywords survived carrying `['']`, which `readSet` then
     * skips silently. The fetch would report success and the set would gain nothing.
     */
    if (normalise(word)) keywords.add(normalise(word));

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

/**
 * May anything be fetched? (`023` FR-2104, SC-2103.)
 *
 * ## Why the gate is a pure function
 *
 * Because it has to be testable where the transport can be a spy that fails the test
 * when called. `bringPictograms` in the shell reaches the vault, the settings and the
 * encrypted name map, so it cannot run in the offline suite — and «nothing is fetched
 * before she accepts» asserted only through Electron is a guarantee asserted nowhere.
 *
 * ## Why the publisher has to match
 *
 * Accepting ARASAAC's licence is not accepting somebody else's. A second publisher added
 * to the corpus must ask again — otherwise a corpus edit would silently extend an
 * agreement she made about one specific licence.
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

/* ── The whole set, in one press (024 US1) ────────────────────────────────── */

/**
 * One entry of the publisher's bulk index, plus what decides its turn.
 *
 * `popularity` is the publisher's own download count. It orders **arrival** and
 * nothing else — never which pictogram is used, which stays `018` FR-1609 and her
 * choice (FR-2203, and the Principle III line in `024`'s plan).
 */
export interface IndexEntry extends PictogramCandidate {
  popularity: number;
  /** The publisher's own last-modified stamp, for the update check (FR-2213). */
  updated: string;
}

/**
 * The bulk index → entries (024 T002, FR-2202).
 *
 * ## Why this exists at all, when `readCandidates` already parses a search response
 *
 * Because the whole point of `024` is that **she types nothing**. `023` asked her for a
 * word list, which is a task she cannot do well: she does not know which words the next
 * worksheet will contain. One request for the whole catalogue replaces it — measured on
 * 2026-09-02 at 8,1 MB for 13.802 entries, which is an order of magnitude cheaper than
 * the guess that produced `023`'s design.
 *
 * ## Read structurally, like everything else from a publisher
 *
 * ARASAAC returns `[{ _id, keywords: [{ keyword }], downloads, lastUpdated }]`. The id
 * allowlist is `readCandidates`'s and matters 13.802 times over here: an id becomes a
 * filename and a URL segment (Principle IX). A missing `downloads` sorts last rather
 * than failing — it costs an entry its place in the queue, not its existence.
 */
export function readIndex(json: unknown): IndexEntry[] {
  if (!Array.isArray(json)) return [];
  const out: IndexEntry[] = [];

  for (const item of json) {
    if (!item || typeof item !== 'object') continue;
    const e = item as Record<string, unknown>;

    /*
     * `readCandidates` with the entry's own first keyword as the «searched word».
     *
     * Not an empty string: it always adds the searched word to the keyword set, which
     * is the guard that stops an unrecognised keyword shape producing entries with no
     * words at all. Here there is no search, so the guard has nothing useful to add and
     * an empty word would be dropped by `mergeSet` anyway.
     */
    const [parsed] = readCandidates([e], '');
    if (!parsed || parsed.keywords.length === 0) continue;

    out.push({
      ...parsed,
      popularity: typeof e['downloads'] === 'number' ? e['downloads'] : 0,
      updated: typeof e['lastUpdated'] === 'string' ? e['lastUpdated'] : '',
    });
  }
  return out;
}

export interface WholeSetPlan {
  /** Ids to fetch an image for, most-used first (FR-2203). */
  fetch: IndexEntry[];
  /** Already on disk, so never requested again (FR-2206). */
  present: number;
  /** Everything the publisher has, for «3.140 de 13.802». */
  total: number;
  /** The publisher's high-water mark, for the update check (FR-2213). */
  highWater: string;
}

/**
 * What is missing, in the order that makes the set useful before it is complete.
 *
 * ## Why popularity and not id order
 *
 * SC-2202: the most-used two thousand within one minute. Ordered by id, the first
 * thousand images are whatever ARASAAC happened to draw in 2009, and she waits ten
 * minutes before "casa" arrives. Ordered by the publisher's own download count, the
 * words a classroom actually uses land first and she can start.
 *
 * It costs nothing — the index carries the number — and it decides **arrival only**.
 */
export function planWholeSet(
  index: readonly IndexEntry[], images: ReadonlySet<string> | undefined,
): WholeSetPlan {
  const missing: IndexEntry[] = [];
  let present = 0;
  let highWater = '';

  for (const entry of index) {
    if (entry.updated > highWater) highWater = entry.updated;
    if (images?.has(entry.id)) { present += 1; continue; }
    missing.push(entry);
  }

  // Descending popularity, then by id so the order is stable across runs — an
  // unstable order would make a resumed download re-plan differently every time.
  missing.sort((a, b) => b.popularity - a.popularity || a.id.localeCompare(b.id));
  return { fetch: missing, present, total: index.length, highWater };
}

/** What is on disk and how current it is (FR-2213). Recorded, so it is answerable offline. */
export interface SetInventory {
  publisher: string;
  language: string;
  /** How many images are on disk. */
  images: number;
  /** What the publisher had when we last looked. */
  total: number;
  /** The publisher's high-water mark at that moment. */
  highWater: string;
  broughtOn: string;
  /**
   * A high-water mark she was offered and declined (FR-2212).
   *
   * So «no me lo vuelvas a preguntar» means until the index changes **further** — not
   * until the next time she opens the screen.
   */
  declined?: string;
}

export type UpdateStatus =
  | { state: 'complete' }
  | { state: 'incomplete'; missing: number }
  | { state: 'update'; added: number; highWater: string }
  | { state: 'unknown' };

/**
 * Is what she has current? (FR-2209, FR-2211, FR-2212.)
 *
 * `complete` is the answer that matters, because FR-2209 says a complete set means the
 * screen asks her for **nothing**. «Ya lo tiene, no me lo vuelva a preguntar» is a
 * requirement about silence, and silence needs a value that means it.
 *
 * Pure, and takes the fresh index only when there is one — so the ordinary case,
 * opening the screen, costs no request at all (FR-2210).
 */
export function updateStatus(
  inventory: SetInventory | null, fresh?: { total: number; highWater: string },
): UpdateStatus {
  if (!inventory) return { state: 'unknown' };

  if (fresh) {
    const added = fresh.total - inventory.total;
    if (added > 0 && fresh.highWater !== inventory.declined) {
      return { state: 'update', added, highWater: fresh.highWater };
    }
  }
  const missing = inventory.total - inventory.images;
  return missing > 0 ? { state: 'incomplete', missing } : { state: 'complete' };
}
