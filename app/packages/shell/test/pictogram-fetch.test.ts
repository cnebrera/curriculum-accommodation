import { describe, it, expect } from 'vitest';
import { mkdtemp, readFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readSet, wordListOf, type Publisher } from '@rampa/core';
import { fetchPictograms, type Transport } from '../src/pictograms/download.js';

/**
 * The transport (023 T012/T017, SC-2103/2104/2105).
 *
 * Every test here replaces the transport, which is the point: a claim that nothing is
 * fetched without her is worth exactly as much as the spy that fails when called.
 */

const PUBLISHER: Publisher = {
  id: 'test', label: 'Editor de prueba',
  search: 'https://x.test/{lang}/search/{word}',
  image: 'https://x.test/img/{id}.png',
  site: 'https://x.test', licence: 'CC BY-NC-SA 4.0',
  licenceUrl: 'https://x.test/licence', languages: ['es'],
  attribution: { author: 'A', owner: 'O', source: 'S' },
};

const dir = () => mkdtemp(join(tmpdir(), 'rampa-picto-'));

/** Answers for the words it knows; records every URL it was asked for. */
function fake(known: Record<string, number[]>): Transport & { urls: string[] } {
  const urls: string[] = [];
  return {
    urls,
    json: async (url) => {
      urls.push(url);
      const word = decodeURIComponent(url.split('/').pop()!);
      const ids = known[word];
      return ids ? ids.map((id) => ({ _id: id, keywords: [{ keyword: word }] })) : null;
    },
    bytes: async (url) => { urls.push(url); return new Uint8Array([137, 80, 78, 71]); },
  };
}

/** Fails the test if it is touched at all. */
const forbidden: Transport = {
  json: async () => { throw new Error('the transport was called'); },
  bytes: async () => { throw new Error('the transport was called'); },
};

describe('what lands on disk is a set 018 reads (FR-2102, SC-2102)', () => {
  it('writes metadata and images the unmodified reader consumes', async () => {
    const root = await dir();
    const t = fake({ casa: [1], perro: [2] });

    const outcome = await fetchPictograms({
      root, publisher: PUBLISHER, transport: t,
      list: wordListOf(['casa', 'perro'], { language: 'es' }),
      limits: { wordsPerFetch: 100 },
    });

    expect(outcome.found).toEqual(['casa', 'perro']);
    expect(outcome.images).toBe(2);

    const reading = await readSet(root, {
      list: async (d) => (await import('node:fs/promises')).readdir(d),
      readText: async (p) => readFile(p, 'utf8').catch(() => null),
    });
    expect(reading.problems).toEqual([]);
    expect(reading.set!.byLanguage.get('es')!.get('casa')).toEqual(['1']);
    expect(reading.set!.images.has('1')).toBe(true);
  });

  it('asks for one word per request and nothing else (FR-2108, SC-2104)', async () => {
    const root = await dir();
    const t = fake({ casa: [1] });
    await fetchPictograms({
      root, publisher: PUBLISHER, transport: t,
      // A learner's name, her code and her school, all in the input.
      list: wordListOf(['casa', 'María', 'K42', 'Nebrera'], {
        language: 'es', names: new Set(['maria', 'nebrera']),
      }),
      limits: { wordsPerFetch: 100 },
    });

    const searches = t.urls.filter((u) => u.includes('/search/'));
    expect(searches).toEqual(['https://x.test/es/search/casa']);
    for (const leak of ['maria', 'mar%C3%ADa', 'k42', 'nebrera']) {
      expect(t.urls.join(' ').toLowerCase(), `«${leak}» must not be requested`)
        .not.toContain(leak);
    }
  });

  it('reports a word the publisher does not have, by name, and fetches the rest', async () => {
    const root = await dir();
    const outcome = await fetchPictograms({
      root, publisher: PUBLISHER, transport: fake({ casa: [1] }),
      list: wordListOf(['casa', 'ornitorrinco'], { language: 'es' }),
      limits: { wordsPerFetch: 100 },
    });
    expect(outcome.found).toEqual(['casa']);
    expect(outcome.missing).toEqual(['ornitorrinco']);
  });
});

describe('an interrupted fetch (FR-2115, FR-2118, SC-2105)', () => {
  it('leaves a readable set and only the rest to do', async () => {
    const root = await dir();
    /* Dies on the third word, after two have landed. */
    let n = 0;
    const flaky: Transport = {
      json: async (url) => {
        if (url.includes('/search/')) n += 1;
        if (n === 3) throw new Error('network');
        const word = decodeURIComponent(url.split('/').pop()!);
        return [{ _id: word.length, keywords: [{ keyword: word }] }];
      },
      bytes: async () => new Uint8Array([1]),
    };

    const first = await fetchPictograms({
      root, publisher: PUBLISHER, transport: flaky,
      list: wordListOf(['casa', 'perros', 'gato'], { language: 'es' }),
      limits: { wordsPerFetch: 100 },
    });
    expect(first.found).toEqual(['casa', 'perros']);
    expect(first.failed).toEqual(['gato']);

    const reader = {
      list: async (d: string) => (await import('node:fs/promises')).readdir(d),
      readText: async (p: string) => readFile(p, 'utf8').catch(() => null),
    };
    const mid = await readSet(root, reader);
    expect(mid.problems, 'a half-done fetch is still a usable set').toEqual([]);

    // Second attempt: only what is missing is asked for (FR-2112).
    const t2 = fake({ casa: [4], perros: [6], gato: [4] });
    const again = await fetchPictograms({
      root, publisher: PUBLISHER, transport: t2,
      list: wordListOf(['casa', 'perros', 'gato'], { language: 'es' }),
      limits: { wordsPerFetch: 100 },
      present: mid.set!.byLanguage.get('es'),
      images: mid.set!.images,
    });
    expect(again.present.sort()).toEqual(['casa', 'perros']);
    expect(t2.urls.filter((u) => u.includes('/search/')))
      .toEqual(['https://x.test/es/search/gato']);
  });

  it('stops when she stops it, and calls what is left retryable', async () => {
    const root = await dir();
    const control = new AbortController();
    const t: Transport = {
      json: async (url) => {
        control.abort();   // she pressed stop while the first word was in flight
        const word = decodeURIComponent(url.split('/').pop()!);
        return [{ _id: 1, keywords: [{ keyword: word }] }];
      },
      bytes: async () => new Uint8Array([1]),
    };
    const outcome = await fetchPictograms({
      root, publisher: PUBLISHER, transport: t, signal: control.signal,
      list: wordListOf(['casa', 'perro', 'gato'], { language: 'es' }),
      limits: { wordsPerFetch: 100 },
    });
    expect(outcome.found).toEqual(['casa']);
    expect(outcome.failed).toEqual(['perro', 'gato']);
  });

  it('never leaves a `.parcial` behind on a completed word', async () => {
    const root = await dir();
    await fetchPictograms({
      root, publisher: PUBLISHER, transport: fake({ casa: [1] }),
      list: wordListOf(['casa'], { language: 'es' }),
      limits: { wordsPerFetch: 100 },
    });
    const files = await (await import('node:fs/promises')).readdir(root);
    expect(files.filter((f) => f.endsWith('.parcial'))).toEqual([]);
  });
});

describe('nothing is requested when there is nothing to request (FR-2107, FR-2112)', () => {
  it('does not touch the transport when every word is already present', async () => {
    const root = await dir();
    await mkdir(root, { recursive: true });
    await writeFile(join(root, 'pictograms.es.json'),
      JSON.stringify([{ id: '1', keywords: ['casa'] }]));
    await writeFile(join(root, '1.png'), 'x');

    const outcome = await fetchPictograms({
      root, publisher: PUBLISHER, transport: forbidden,
      list: wordListOf(['casa'], { language: 'es' }),
      limits: { wordsPerFetch: 100 },
      present: new Map([['casa', ['1']]]), images: new Set(['1']),
    });
    expect(outcome.present).toEqual(['casa']);
    expect(outcome.found).toEqual([]);
  });

  it('does not touch the transport for an empty word list', async () => {
    const outcome = await fetchPictograms({
      root: await dir(), publisher: PUBLISHER, transport: forbidden,
      list: wordListOf([], { language: 'es' }), limits: { wordsPerFetch: 100 },
    });
    expect(outcome.found).toEqual([]);
  });

  it('refuses a language the publisher does not serve, before requesting anything', async () => {
    await expect(fetchPictograms({
      root: await dir(), publisher: PUBLISHER, transport: forbidden,
      list: wordListOf(['casa'], { language: 'eu' }), limits: { wordsPerFetch: 100 },
    })).rejects.toThrow(/euskera|eu/);
  });
});
