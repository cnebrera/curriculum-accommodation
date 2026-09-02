import { describe, it, expect } from 'vitest';
import { mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readSet, type Publisher } from '@rampa/core';
import { fetchWholeSet, roomFor, type Transport } from '../src/pictograms/download.js';

/**
 * The whole set, against a fake publisher (024 T013/T014, SC-2203/2204/2205).
 *
 * Every test replaces the transport, which is the point: «nothing is fetched that is
 * already here» and «nothing is fetched on launch» are claims worth exactly as much as
 * the spy that fails when called.
 */

const PUBLISHER: Publisher = {
  id: 'test', label: 'Editor de prueba',
  search: 'https://x.test/{lang}/search/{word}',
  index: 'https://x.test/{lang}/all',
  image: 'https://x.test/img/{id}_{size}.png',
  site: 'https://x.test', licence: 'CC BY-NC-SA 4.0',
  licenceUrl: 'https://x.test/licence', languages: ['es'],
  attribution: { author: 'A', owner: 'O', source: 'S' },
};

const LIMITS = { imageSize: 300, concurrency: 4 };
const dir = () => mkdtemp(join(tmpdir(), 'rampa-whole-'));

const reader = {
  list: async (d: string) => readdir(d),
  readText: async (p: string) => readFile(p, 'utf8').catch(() => null),
};

/** An index of `n` entries, and a spy on every URL asked for. */
function fake(n: number, opts: { failIds?: Set<string> } = {}) {
  const urls: string[] = [];
  const index = Array.from({ length: n }, (_, i) => ({
    _id: i + 1,
    keywords: [{ keyword: `palabra${i + 1}` }],
    downloads: n - i,          // descending, so id 1 is the most popular
    lastUpdated: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
  }));
  const transport: Transport = {
    json: async (url) => { urls.push(url); return index; },
    bytes: async (url) => {
      urls.push(url);
      const id = /img\/(\d+)_/.exec(url)?.[1] ?? '';
      if (opts.failIds?.has(id)) throw new Error('network');
      return new Uint8Array([137, 80, 78, 71]);
    },
  };
  return { transport, urls, images: () => urls.filter((u) => u.includes('/img/')) };
}

const forbidden: Transport = {
  json: async () => { throw new Error('the transport was called'); },
  bytes: async () => { throw new Error('the transport was called'); },
};

describe('one indexed request, then the images (FR-2202, FR-2203)', () => {
  it('asks for the index once and brings every image', async () => {
    const root = await dir();
    const f = fake(5);
    const r = await fetchWholeSet({
      root, publisher: PUBLISHER, language: 'es', limits: LIMITS, transport: f.transport,
    });

    expect(f.urls.filter((u) => u.endsWith('/all'))).toEqual(['https://x.test/es/all']);
    expect(r.brought).toBe(5);
    expect(r.total).toBe(5);
    expect(r.failed).toBe(0);
  });

  it('asks at the size the corpus chose, never a default', async () => {
    const root = await dir();
    const f = fake(2);
    await fetchWholeSet({
      root, publisher: PUBLISHER, language: 'es',
      limits: { imageSize: 300, concurrency: 1 }, transport: f.transport,
    });
    expect(f.images().every((u) => u.includes('_300.png'))).toBe(true);
  });

  it('refuses rather than inventing a size when the corpus failed closed', async () => {
    await expect(fetchWholeSet({
      root: await dir(), publisher: PUBLISHER, language: 'es',
      limits: { imageSize: 0, concurrency: 0 }, transport: forbidden,
    })).rejects.toThrow(/tamaño/);
  });

  it('sends no word at all — a language and numeric ids (FR-2108)', async () => {
    const root = await dir();
    const f = fake(3);
    await fetchWholeSet({
      root, publisher: PUBLISHER, language: 'es', limits: LIMITS, transport: f.transport,
    });
    /*
     * `023` needed a name filter, a word allowlist and an assertion on the transport to
     * bound what a word list leaked. `024` deleted the word path, so the guarantee is
     * now structural: nothing word-shaped is in any URL.
     */
    for (const url of f.urls) expect(url).not.toMatch(/palabra|casa|search/);
  });

  it('brings the most-used first, so it is usable before it is complete (SC-2202)', async () => {
    const root = await dir();
    const f = fake(6);
    await fetchWholeSet({
      root, publisher: PUBLISHER, language: 'es',
      limits: { imageSize: 300, concurrency: 1 }, transport: f.transport,
    });
    const order = f.images().map((u) => Number(/img\/(\d+)_/.exec(u)![1]));
    expect(order).toEqual([1, 2, 3, 4, 5, 6]);   // popularity descends with id here
  });
});

describe('never twice, and always readable (FR-2206, SC-2203, SC-2205)', () => {
  it('makes zero image requests on a second complete pass', async () => {
    const root = await dir();
    await fetchWholeSet({
      root, publisher: PUBLISHER, language: 'es', limits: LIMITS,
      transport: fake(4).transport,
    });

    const again = fake(4);
    const r = await fetchWholeSet({
      root, publisher: PUBLISHER, language: 'es', limits: LIMITS,
      transport: again.transport,
    });
    expect(again.images(), 'nothing already on disk may be requested').toEqual([]);
    expect(r.brought).toBe(0);
    expect(r.present).toBe(4);
  });

  it("writes the metadata before the first image, so ten seconds in is a usable set", async () => {
    const root = await dir();
    /*
     * SC-2205 at an *arbitrary* point, not at the end. The index arrives complete, so
     * the metadata is complete from the start and `018` FR-1616 renders a word whose
     * image has not arrived as a named gap — which is the right state for «still
     * downloading». The other order would leave images nothing could find.
     */
    const dying: Transport = {
      json: async () => Array.from({ length: 10 }, (_, i) =>
        ({ _id: i + 1, keywords: [{ keyword: `p${i + 1}` }], downloads: 1 })),
      bytes: async () => { throw new Error('network died immediately'); },
    };
    const r = await fetchWholeSet({
      root, publisher: PUBLISHER, language: 'es', limits: LIMITS, transport: dying,
    });
    expect(r.brought).toBe(0);
    expect(r.failed).toBe(10);

    const reading = await readSet(root, reader);
    /*
     * The set is **usable** — every word is there — and `018` reports the one true
     * thing about it: «he encontrado la lista de palabras y ninguna imagen». That is
     * the correct report, not a defect, and it is the difference SC-2205 turns on: a
     * zero-image set says so, and from the first image onward there are no problems at
     * all (the partial-failure test below).
     */
    expect(reading.set, 'the set is readable').not.toBeNull();
    expect(reading.set!.byLanguage.get('es')!.size).toBe(10);
    expect(reading.problems.map((p) => p.kind)).toEqual(['no-images']);
  });

  it('is readable after a partial failure, and resumes with only the rest', async () => {
    const root = await dir();
    const first = fake(6, { failIds: new Set(['4', '5', '6']) });
    const r1 = await fetchWholeSet({
      root, publisher: PUBLISHER, language: 'es', limits: LIMITS,
      transport: first.transport,
    });
    expect(r1.brought).toBe(3);
    expect(r1.failed).toBe(3);
    expect((await readSet(root, reader)).problems).toEqual([]);

    const second = fake(6);
    const r2 = await fetchWholeSet({
      root, publisher: PUBLISHER, language: 'es', limits: LIMITS,
      transport: second.transport,
    });
    expect(r2.present).toBe(3);
    expect(second.images().map((u) => Number(/img\/(\d+)_/.exec(u)![1])).sort())
      .toEqual([4, 5, 6]);
  });

  it('leaves no `.parcial` behind', async () => {
    const root = await dir();
    await fetchWholeSet({
      root, publisher: PUBLISHER, language: 'es', limits: LIMITS,
      transport: fake(3).transport,
    });
    expect((await readdir(root)).filter((f) => f.endsWith('.parcial'))).toEqual([]);
  });

  it('stops when she stops it, and says so', async () => {
    const root = await dir();
    const control = new AbortController();
    let seen = 0;
    const t: Transport = {
      json: async () => Array.from({ length: 20 }, (_, i) =>
        ({ _id: i + 1, keywords: [{ keyword: `p${i + 1}` }], downloads: 20 - i })),
      bytes: async () => {
        seen += 1;
        if (seen >= 4) control.abort();
        return new Uint8Array([1]);
      },
    };
    const r = await fetchWholeSet({
      root, publisher: PUBLISHER, language: 'es',
      limits: { imageSize: 300, concurrency: 1 }, transport: t, signal: control.signal,
    });
    expect(r.stopped).toBe(true);
    expect(r.brought).toBeLessThan(20);
    expect((await readSet(root, reader)).problems).toEqual([]);
  });
});

describe('it refuses before it asks (FR-2208, and 023 FR-2107)', () => {
  it('refuses a language the publisher does not serve, requesting nothing', async () => {
    await expect(fetchWholeSet({
      root: await dir(), publisher: PUBLISHER, language: 'eu', limits: LIMITS,
      transport: forbidden,
    })).rejects.toThrow(/eu/);
  });

  it('refuses when the publisher gives no index, rather than writing an empty set', async () => {
    const empty: Transport = { json: async () => [], bytes: async () => null };
    await expect(fetchWholeSet({
      root: await dir(), publisher: PUBLISHER, language: 'es', limits: LIMITS,
      transport: empty,
    })).rejects.toThrow(/lista de pictogramas/);
  });

  it('answers the disk question, or says it does not know', async () => {
    const room = await roomFor(await dir(), 60);
    // `unknown` is a legitimate answer: refusing on the basis of a check we could not
    // run would be worse than the risk it guards against.
    expect([true, false, 'unknown']).toContain(room.ok);
    const impossible = await roomFor(await dir(), 1_000_000_000);
    expect(impossible.ok === false || impossible.ok === 'unknown').toBe(true);
  });
});

describe("018's own reader is untouched by any of this (SC-2207)", () => {
  it('reads a downloaded set exactly as it reads a hand-made one', async () => {
    const byHand = await dir();
    await writeFile(join(byHand, 'pictograms.es.json'),
      JSON.stringify([{ id: '1', keywords: ['casa'] }]));
    await writeFile(join(byHand, '1.png'), 'x');

    const downloaded = await dir();
    await fetchWholeSet({
      root: downloaded, publisher: PUBLISHER, language: 'es', limits: LIMITS,
      transport: fake(1).transport,
    });

    for (const root of [byHand, downloaded]) {
      const reading = await readSet(root, reader);
      expect(reading.problems).toEqual([]);
      expect(reading.set!.byLanguage.get('es')!.size).toBe(1);
      expect(reading.set!.images.size).toBe(1);
    }
  });
});
