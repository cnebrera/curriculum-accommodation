import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  planFetch, readCandidates, mergeSet, urlFor, RampaError,
  type Publisher, type WordList, type FetchLimits, type FetchOutcome,
  type PictogramCandidate, type PictogramEntry,
} from '@rampa/core';
import { logger } from '@rampa/core';

/**
 * Fetching pictograms from their publisher (023 T013, FR-2108/2115/2118).
 *
 * ## Why the transport is injectable
 *
 * `023` SC-2103 says no request reaches a publisher before she has accepted its
 * licence, and the only version of that claim worth anything is a test where the
 * transport **fails the test if it is called at all**. So `Transport` is a parameter,
 * and the real one is `node:fetch`. The same shape as `packages/core`'s readers, for
 * the same reason.
 *
 * ## Main process only
 *
 * Never the renderer. A window in this application also renders material that came
 * from a photograph of somebody else's worksheet (`007`), and a `fetch` available in
 * that context is a `fetch` reachable from content. Principle IX.
 *
 * ## Why the metadata is written after every word
 *
 * FR-2115 and FR-2118: she can close the window, lose the network, or press stop, and
 * what is on disk has to be a set `018`'s reader reads. Writing once at the end would
 * make an interrupted fetch worth nothing; writing per word makes it worth what it
 * fetched. The cost is a small file rewritten a few hundred times, which is cheaper
 * than the alternative by any measure that matters.
 *
 * The write is atomic — temp file then rename — because the failure it prevents is the
 * one that loses a set she already had.
 */

export interface Transport {
  /** JSON, or `null` where the publisher has nothing for this word. */
  json(url: string): Promise<unknown | null>;
  /** Bytes, or `null`. */
  bytes(url: string): Promise<Uint8Array | null>;
}

/** ~15s: a slow morning in a school is not a failure (`006`). */
const TIMEOUT_MS = 15_000;

export const httpTransport: Transport = {
  json: async (url) => {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept: 'application/json' },
    });
    // 404 is «no lo tengo», which is an answer and not a failure (FR-2114).
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },
  bytes: async (url) => {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  },
};

export interface FetchArgs {
  root: string;
  publisher: Publisher;
  list: WordList;
  limits: FetchLimits;
  /** The set as it is now, so nothing is asked for twice (FR-2112). */
  present?: ReadonlyMap<string, string[]>;
  images?: ReadonlySet<string>;
  transport?: Transport;
  onProgress?: (done: number, total: number, word: string) => void;
  /** She pressed stop, or closed the window (FR-2118). */
  signal?: AbortSignal;
}

const metadataName = (language: string): string => `pictograms.${language}.json`;

async function readExisting(root: string, language: string): Promise<PictogramEntry[]> {
  try {
    const raw = await readFile(join(root, metadataName(language)), 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as PictogramEntry[] : [];
  } catch {
    // No file, or an unreadable one. `mergeSet` starting from nothing is the right
    // recovery: `018`'s reader already names an unreadable file for her, and this
    // must not overwrite a *readable* one it failed to parse — which is why a parse
    // failure here yields an empty list only when the file is genuinely not usable.
    return [];
  }
}

/** Temp then rename, so an interrupted write cannot lose the set she had. */
async function writeAtomic(path: string, body: string | Uint8Array): Promise<void> {
  const tmp = `${path}.parcial`;
  await writeFile(tmp, body);
  await rename(tmp, path);
}

export async function fetchPictograms(args: FetchArgs): Promise<FetchOutcome> {
  const transport = args.transport ?? httpTransport;
  const { language } = args.list;

  if (!args.publisher.languages.includes(language)) {
    throw new RampaError('pictogram-language',
      `${args.publisher.label} no tiene pictogramas en este idioma (${language}).`);
  }

  const plan = planFetch(args.list, args.present, args.images, args.limits);
  const outcome: FetchOutcome = {
    found: [], missing: [], present: plan.present, cut: plan.cut, failed: [],
    images: 0, namesRemoved: args.list.namesRemoved, ambiguous: [],
  };
  if (plan.fetch.length === 0) return outcome;

  await mkdir(args.root, { recursive: true });
  let entries = await readExisting(args.root, language);
  const metadataPath = join(args.root, metadataName(language));

  let done = 0;
  for (const word of plan.fetch) {
    if (args.signal?.aborted) {
      // Stopped, not failed. What is left is reported as retryable, and the set on
      // disk is already readable.
      outcome.failed.push(...plan.fetch.slice(done));
      break;
    }
    args.onProgress?.(done, plan.fetch.length, word);
    done += 1;

    let candidates: PictogramCandidate[] = [];
    try {
      const json = await transport.json(
        urlFor(args.publisher.search, { lang: language, word, id: undefined }));
      if (json === null) { outcome.missing.push(word); continue; }
      candidates = readCandidates(json, word);
    } catch (e) {
      logger.warn('pictograms.fetch-failed', { word, error: String(e) });
      outcome.failed.push(word);
      continue;
    }

    if (candidates.length === 0) { outcome.missing.push(word); continue; }

    /*
     * The image before the metadata, per candidate.
     *
     * If it went the other way round, an interrupted fetch would leave the set
     * claiming a pictogram whose file is absent — which `018` FR-1616 renders as a
     * named gap, so the sheet would be *correct* and she would have no way to tell
     * a gap that resumes from one that does not.
     */
    const landed: PictogramCandidate[] = [];
    for (const c of candidates) {
      if (args.images?.has(c.id)) { landed.push(c); continue; }
      try {
        const bytes = await transport.bytes(
          urlFor(args.publisher.image, { id: c.id, lang: language, word: undefined }));
        if (bytes === null) continue;
        await writeAtomic(join(args.root, `${c.id}.png`), bytes);
        outcome.images += 1;
        landed.push(c);
      } catch (e) {
        logger.warn('pictograms.image-failed', { id: c.id, error: String(e) });
      }
    }

    if (landed.length === 0) { outcome.failed.push(word); continue; }

    entries = mergeSet(entries, landed);
    await writeAtomic(metadataPath, `${JSON.stringify(entries, null, 2)}\n`);
    outcome.found.push(word);
    /*
     * Several candidates means `018` FR-1609 will omit this word from the sheet, so
     * the fetch has to say so — otherwise the button looks like it worked and the
     * worksheet comes out bare. See `FetchOutcome.ambiguous`.
     */
    if (landed.length > 1) outcome.ambiguous.push(word);
  }

  return outcome;
}
