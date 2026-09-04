import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  mergeSet, urlFor, RampaError, readIndex, planWholeSet,
  type Publisher, type FetchLimits, type PictogramEntry, type FetchGate,
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
 * ## Why the writes are atomic
 *
 * Temp file then rename, because the failure it prevents is the one that loses a set
 * she already had — and `023` FR-2115/FR-2118 promise that she can close the window,
 * lose the network or press stop and still have something `018`'s reader reads.
 */

export interface Transport {
  /** JSON, or `null` where the publisher has nothing for this word. */
  json(url: string): Promise<unknown | null>;
  /** Bytes, or `null`. */
  bytes(url: string): Promise<Uint8Array | null>;
}

/** ~15s: a slow morning in a school is not a failure (`006`). */
const TIMEOUT_MS = 15_000;

/**
 * The **only** way to get a working transport (from a security review, 2026-09-02).
 *
 * ## Why the gate mints it instead of being checked
 *
 * `fetchGate` was correct and `bringPictograms` called it. Then `checkUpdate` was
 * written three hours later and **did not** — so a teacher who had never accepted the
 * licence, or who had withdrawn it, still reached `api.arasaac.org`. FR-2104 and FR-2106
 * both failed.
 *
 * The comments in `fetch.ts` and `preload.ts` had warned about exactly this: «a gate in
 * a caller is a gate the second caller walks past». I was the second caller.
 *
 * A re-check in `checkUpdate` would fix the instance. This fixes the class: there is no
 * exported `httpTransport` any more, so a fourth call site cannot make a request without
 * a `FetchGate` that says `may`. The type system carries the requirement.
 */
export function transportFor(gate: FetchGate): Transport {
  if (!gate.may) {
    /*
     * A refusing transport rather than a throw here, so the caller decides what to say
     * — `checkUpdate` answers from disk, `bringPictograms` raises her sentence.
     */
    return {
      json: async () => { throw new RampaError('pictogram-not-accepted', GATE_MESSAGE); },
      bytes: async () => { throw new RampaError('pictogram-not-accepted', GATE_MESSAGE); },
    };
  }
  return httpTransport;
}

const GATE_MESSAGE =
  'No he pedido nada: todavía no has aceptado la licencia de los pictogramas.';

const httpTransport: Transport = {
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

const metadataName = (language: string): string => `pictograms.${language}.json`;

/**
 * What the metadata file already holds, or nothing.
 *
 * An unreadable file yields an empty list rather than a throw: `018`'s reader already
 * names a broken metadata file for her, and refusing to download because the previous
 * download left something odd would strand her with no way forward.
 */
async function readExisting(root: string, language: string): Promise<PictogramEntry[]> {
  try {
    const raw = await readFile(join(root, metadataName(language)), 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as PictogramEntry[] : [];
  } catch {
    return [];
  }
}

/**
 * Temp then rename, so an interrupted write cannot lose the set she had.
 *
 * The temp name carries a **run id** (from a review, 2026-09-02). It was
 * `${path}.parcial`, shared by every writer — so two concurrent whole-set downloads
 * interleaved into one temp file and `rename` published truncated PNG bytes into the
 * set. `bringPictograms` now refuses a second run, and this makes atomicity hold even
 * if that guard is ever lost: correctness should not depend on there being one writer.
 */
async function writeAtomic(
  path: string, body: string | Uint8Array, runId: string,
): Promise<void> {
  const tmp = `${path}.${runId}.parcial`;
  await writeFile(tmp, body);
  await rename(tmp, path);
}

/* ── The whole set, in one press (024 T009-T012) ──────────────────────────── */

export interface WholeSetArgs {
  root: string;
  publisher: Publisher;
  language: string;
  limits: FetchLimits;
  transport?: Transport;
  onProgress?: (done: number, total: number) => void;
  signal?: AbortSignal;
}

export interface WholeSetResult {
  /** Images fetched this time. */
  brought: number;
  /** Already on disk, never requested (FR-2206). */
  present: number;
  /** What the publisher has. */
  total: number;
  /**
   * Requests that failed for a reason that may pass — network, timeout, refusal.
   * Retryable, and pressing again asks only for these.
   */
  failed: number;
  /**
   * Images the publisher's index lists and its CDN **does not have** (404).
   *
   * Split from `failed` after a review (2026-09-02). The transport already treated a
   * 404 as «no lo tengo, which is an answer and not a failure» — and then both were
   * collapsed into one counter, so the inventory recorded 13.800 images out of 13.802
   * and `updateStatus` reported `incomplete` **for ever**. «Te faltan 2. Sigo por donde
   * iba» on a screen whose whole requirement (FR-2209) is to ask her for nothing once
   * the set is done, re-requesting two dead ids on every press.
   *
   * ARASAAC really has two such ids today, which is why the measurement in `024`'s
   * SC-2202 reads «13.800 of 13.802» — the number that should have given this away.
   */
  absent: number;
  highWater: string;
  /** True where she stopped it or the window closed (FR-2118). */
  stopped: boolean;
}

/**
 * The whole catalogue, one press, no word list (FR-2201/2202/2203/2206/2207).
 *
 * ## The shape, and why each part is the way it is
 *
 * **The index in one request.** 8,1 MB, 13.802 entries, measured. That single request
 * replaces the word list `023` made her type — a task she could not do well, because
 * she does not know which words the next worksheet contains.
 *
 * **Images in popularity order.** The index carries the publisher's own download
 * count, so ordering by it costs nothing and makes the set usable in the first minute
 * instead of the tenth (SC-2202). It decides arrival, never use.
 *
 * **Metadata written once, before the first image.** `023` wrote after every word,
 * because there a word's candidates were discovered one request at a time. Here the
 * index arrives complete, so the metadata is complete too — and rewriting it in
 * batches, which is what this function did for its first ten minutes of existence,
 * wrote identical bytes 69 times.
 *
 * Writing it **first** is the part that matters: an interruption ten seconds in leaves
 * a set that knows every word, and `018` FR-1616 renders a metadata entry whose image
 * is absent as a named gap. That is exactly the right state for «still downloading»,
 * and it is what makes SC-2205 true at *any* point rather than only at the end. The
 * other order would leave images nothing could find.
 *
 * **Bounded concurrency**, from the corpus. `static.arasaac.org` is a CDN and serving
 * files is its purpose, but polite is not the same as unlimited.
 */
export async function fetchWholeSet(args: WholeSetArgs): Promise<WholeSetResult> {
  const transport = args.transport ?? httpTransport;
  const { language, limits } = args;

  if (!args.publisher.languages.includes(language)) {
    throw new RampaError('pictogram-language',
      `${args.publisher.label} no tiene pictogramas en este idioma (${language}).`);
  }
  if (limits.imageSize <= 0 || limits.concurrency <= 0) {
    // The corpus failed closed, so this does too rather than inventing a size.
    throw new RampaError('corpus-missing',
      'No sé a qué tamaño traer los pictogramas. Falta un dato del corpus.');
  }

  const index = readIndex(await transport.json(
    urlFor(args.publisher.index, { lang: language })));
  if (index.length === 0) {
    throw new RampaError('pictogram-no-publisher',
      `${args.publisher.label} no me ha dado su lista de pictogramas.`);
  }

  await mkdir(args.root, { recursive: true });
  const metadataPath = join(args.root, metadataName(language));
  let entries = await readExisting(args.root, language);
  const onDisk = new Set(await imagesOnDisk(args.root));

  const plan = planWholeSet(index, onDisk);
  const runId = `${process.pid}-${Math.round(performance.now())}`;
  const result: WholeSetResult = {
    brought: 0, present: plan.present, total: plan.total, failed: 0, absent: 0,
    highWater: plan.highWater, stopped: false,
  };

  /*
   * The index is written first, before a single image.
   *
   * So that an interruption ten seconds in still leaves her a set that knows every
   * word — `018`'s reader tolerates a metadata entry whose image is absent and renders
   * a named gap (FR-1616), which is exactly the right state for "downloading". The
   * other order would leave images nothing can find.
   */
  /*
   * The publisher's id travels with the entries (`023` FR-2116, decision P40).
   *
   * Without it a set she built from two sources was attributed to whichever one
   * the render happened to know about, and the sheet printed a credit that was
   * false — worse, legally, than printing none.
   */
  entries = mergeSet(entries, index, args.publisher.id);
  await writeAtomic(metadataPath, `${JSON.stringify(entries, null, 2)}\n`, runId);

  /*
   * `entries` is not touched again. The index was complete, so the file is complete —
   * only the images arrive over time.
   */

  let done = 0;
  const queue = plan.fetch;

  const worker = async (): Promise<void> => {
    for (;;) {
      if (args.signal?.aborted) { result.stopped = true; return; }
      const next = queue[done];
      if (!next) return;
      done += 1;
      args.onProgress?.(result.present + result.brought, plan.total);

      try {
        const bytes = await transport.bytes(urlFor(args.publisher.image, {
          id: next.id, size: String(limits.imageSize),
        }));
        // `null` is the transport's 404: listed by the index, absent from the CDN.
        if (bytes === null) { result.absent += 1; continue; }
        await writeAtomic(join(args.root, `${next.id}.png`), bytes, runId);
        result.brought += 1;
      } catch (e) {
        logger.warn('pictograms.image-failed', { id: next.id, error: String(e) });
        result.failed += 1;
      }
    }
  };

  await Promise.all(Array.from({ length: limits.concurrency }, () => worker()));
  logger.info('pictograms.whole-set', {
    publisher: args.publisher.id, language,
    brought: result.brought, present: result.present,
    failed: result.failed, absent: result.absent, stopped: result.stopped,
  });
  return result;
}

/** Ids that already have a file, so nothing is requested twice (FR-2206). */
async function imagesOnDisk(root: string): Promise<string[]> {
  try {
    return (await readdir(root))
      .map((f) => /^(.+)\.(png|jpe?g|svg|webp)$/i.exec(f)?.[1])
      .filter((id): id is string => Boolean(id));
  } catch { return []; }
}

/**
 * Is there room? (FR-2208.)
 *
 * Asked **before the first byte**, because the failure it prevents is a set half
 * written on a full disk and a teacher with no idea why her worksheets stopped having
 * pictograms. `statfs` is Node 18+; where it is unavailable the answer is «no lo sé»,
 * and the download proceeds — refusing on the basis of a check we could not run would
 * be worse than the risk.
 */
export async function roomFor(root: string, megabytes: number): Promise<
  { ok: true } | { ok: false; freeMb: number; needMb: number } | { ok: 'unknown' }
> {
  try {
    const { statfs } = await import('node:fs/promises');
    if (typeof statfs !== 'function') return { ok: 'unknown' };
    await mkdir(root, { recursive: true });
    const fs = await statfs(root);
    const freeMb = Math.floor((fs.bavail * fs.bsize) / 1_000_000);
    // A margin, because filling a disk to the last megabyte breaks other things too.
    return freeMb > megabytes * 1.2 ? { ok: true } : { ok: false, freeMb, needMb: megabytes };
  } catch {
    return { ok: 'unknown' };
  }
}
