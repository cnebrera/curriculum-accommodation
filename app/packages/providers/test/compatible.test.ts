import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { loadCatalogue } from '@rampa/core';
import { compatibleProvider } from '../src/compatible.js';
import { providerFor, ADAPTER_IDS } from '../src/index.js';
import { ProviderError, type Chunk } from '../src/types.js';

/**
 * The one adapter that serves half the catalogue (009 T028).
 *
 * Everything here runs against a stubbed `fetch`. Nothing reaches a network,
 * which is the only honest way to test the failure paths: triggering a real 402
 * needs a real account with no money in it.
 *
 * The property worth protecting is the one that is easy to lose later — that
 * this file contains no `if (id === '…')`. Once it does, adding a service is a
 * code change again and the catalogue is decoration.
 */
const repoRoot = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');
const dir = join(repoRoot, 'instructions', 'providers');
const catalogue = loadCatalogue(
  readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'README.md')
    .map((f) => ({ path: f, raw: readFileSync(join(dir, f), 'utf8') })),
  { available: ADAPTER_IDS, today: new Date('2026-09-15T00:00:00Z') },
);

const sse = (frames: string[]) => {
  const body = frames.map((f) => `data: ${f}\n\n`).join('') + 'data: [DONE]\n\n';
  return new Response(new Blob([body]).stream(), { status: 200 });
};

const stubFetch = (impl: (url: string, init?: RequestInit) => Response | Promise<Response>) =>
  vi.stubGlobal('fetch', vi.fn((url: unknown, init?: unknown) =>
    Promise.resolve(impl(String(url), init as RequestInit))));

afterEach(() => vi.unstubAllGlobals());

const collect = async (s: AsyncIterable<Chunk>) => {
  const out: Chunk[] = [];
  for await (const c of s) out.push(c);
  return out;
};

const spec = (over: Partial<Parameters<typeof compatibleProvider>[0]> = {}) => compatibleProvider({
  id: 'test', label: 'Servicio de prueba', endpoint: 'https://example.test/v1/chat/completions',
  model: 'm', keyUrl: 'https://example.test/keys', requiresPaymentCard: false,
  keyPrefix: 'tk_', vision: true, quirks: [], ...over,
});

const REQ = { system: 'sys', messages: [{ role: 'user' as const, content: 'hola' }] };

describe('streaming', () => {
  it('assembles the text from the frames', async () => {
    stubFetch(() => sse([
      '{"choices":[{"delta":{"content":"Hola"}}]}',
      '{"choices":[{"delta":{"content":" Lucía"}}]}',
      '{"choices":[{"delta":{}}]}',
    ]));
    const chunks = await collect(spec().send(REQ, 'tk_x'));
    expect(chunks.filter((c) => c.text).map((c) => c.text).join('')).toBe('Hola Lucía');
  });

  it('reads the token counts, so the cost shown is the cost incurred', async () => {
    stubFetch(() => sse([
      '{"choices":[{"delta":{"content":"a"}}]}',
      '{"usage":{"prompt_tokens":1200,"completion_tokens":340}}',
    ]));
    const chunks = await collect(spec().send(REQ, 'tk_x'));
    const usage = chunks.find((c) => c.usage)!.usage!;
    expect(usage.inputTokens).toBe(1200);
    expect(usage.outputTokens).toBe(340);
  });

  it('reads cached input where the service reports it', async () => {
    stubFetch(() => sse([
      '{"usage":{"prompt_tokens":1000,"completion_tokens":10,"prompt_tokens_details":{"cached_tokens":800}}}',
    ]));
    const usage = (await collect(spec().send(REQ, 'tk_x'))).find((c) => c.usage)!.usage!;
    expect(usage.cachedInputTokens).toBe(800);
  });

  it('survives a frame split across two reads', async () => {
    // The real failure mode of every hand-written SSE parser: a chunk boundary
    // lands mid-JSON and the parser drops or throws on the half-frame.
    const body = 'data: {"choices":[{"delta":{"con'
      + 'tent":"parti"}}]}\n\ndata: {"choices":[{"delta":{"content":"do"}}]}\n\ndata: [DONE]\n\n';
    const halves = [body.slice(0, 40), body.slice(40)];
    stubFetch(() => new Response(new ReadableStream({
      start(c) {
        for (const h of halves) c.enqueue(new TextEncoder().encode(h));
        c.close();
      },
    }), { status: 200 }));
    const chunks = await collect(spec().send(REQ, 'tk_x'));
    expect(chunks.filter((c) => c.text).map((c) => c.text).join('')).toBe('partido');
  });

  it('ignores a malformed frame rather than failing the whole adaptation', async () => {
    stubFetch(() => sse(['{"choices":[{"delta":{"content":"a"}}]}', 'not json at all',
                         '{"choices":[{"delta":{"content":"b"}}]}']));
    const chunks = await collect(spec().send(REQ, 'tk_x'));
    expect(chunks.filter((c) => c.text).map((c) => c.text).join('')).toBe('ab');
  });
});

describe('what it puts on the wire', () => {
  /**
   * The defect this was written for.
   *
   * The first version chose between the plain-string and content-array forms
   * with `req.images?.length === 0`, which is `undefined === 0` when there are
   * no images — so the string branch was unreachable and every text-only
   * request went out as a one-element array. Both forms are legal in the
   * dialect, but several services in this catalogue accept only the string for
   * text, so it would have failed on exactly those and nowhere else.
   */
  it('sends text as a plain string, not a one-element array', async () => {
    let body: any;
    stubFetch((_u, init) => { body = JSON.parse(String(init?.body)); return sse(['{"usage":{"prompt_tokens":1,"completion_tokens":1}}']); });
    await collect(spec().send(REQ, 'tk_x'));
    expect(typeof body.messages[1].content).toBe('string');
    expect(body.messages[1].content).toBe('hola');
    expect(body.messages[0]).toEqual({ role: 'system', content: 'sys' });
  });

  it('sends an image as a content array with a data URI', async () => {
    let body: any;
    stubFetch((_u, init) => { body = JSON.parse(String(init?.body)); return sse(['{"usage":{"prompt_tokens":1,"completion_tokens":1}}']); });
    await collect(spec().send({ ...REQ, images: [{ mediaType: 'image/jpeg', base64: 'QUFB' }] }, 'tk_x'));
    expect(Array.isArray(body.messages[1].content)).toBe(true);
    expect(body.messages[1].content[0].image_url.url).toBe('data:image/jpeg;base64,QUFB');
    expect(body.messages[1].content[1]).toEqual({ type: 'text', text: 'hola' });
  });

  it('joins several messages rather than dropping all but one', async () => {
    let body: any;
    stubFetch((_u, init) => { body = JSON.parse(String(init?.body)); return sse(['{"usage":{"prompt_tokens":1,"completion_tokens":1}}']); });
    await collect(spec().send({
      system: 'sys',
      messages: [{ role: 'user', content: 'uno' }, { role: 'user', content: 'dos' }],
    }, 'tk_x'));
    expect(body.messages[1].content).toBe('uno\n\ndos');
  });

  it('sends the key as a bearer token and never in the URL', async () => {
    // A key in a query string ends up in every proxy log between here and there.
    let url = ''; let headers: any;
    stubFetch((u, init) => { url = u; headers = init?.headers; return sse([]); });
    await collect(spec().send(REQ, 'tk_secret'));
    expect(url).not.toContain('tk_secret');
    expect((headers as Record<string, string>)['authorization']).toBe('Bearer tk_secret');
  });
});

describe('quirks, not branching on id', () => {
  it('asks for usage by default', async () => {
    const seen: string[] = [];
    stubFetch((_u, init) => { seen.push(String(init?.body)); return sse(['{"usage":{"prompt_tokens":1,"completion_tokens":1}}']); });
    await collect(spec().send(REQ, 'tk_x'));
    expect(seen[0]).toContain('stream_options');
  });

  it('omits stream_options for a service that rejects the field', async () => {
    // Some services 400 on an unknown field rather than ignoring it, which fails
    // the whole request — so this quirk is the difference between working and not.
    const seen: string[] = [];
    stubFetch((_u, init) => { seen.push(String(init?.body)); return sse(['{"choices":[{"delta":{"content":"a"}}]}']); });
    await collect(spec({ quirks: ['no-stream-options'] }).send(REQ, 'tk_x'));
    expect(seen[0]).not.toContain('stream_options');
  });

  it('does not throw when a no-usage service reports none', async () => {
    stubFetch(() => sse(['{"choices":[{"delta":{"content":"a"}}]}']));
    const chunks = await collect(spec({ quirks: ['no-usage'] }).send(REQ, 'tk_x'));
    expect(chunks.filter((c) => c.text).map((c) => c.text).join('')).toBe('a');
    // And no usage frame at all, rather than a zeroed one: "gratis" for a paid
    // call is the one wrong number a teacher would never think to question.
    expect(chunks.some((c) => c.usage)).toBe(false);
  });

  it('contains no branch on service id', () => {
    // The property the whole format rests on, asserted rather than reviewed.
    const src = readFileSync(join(repoRoot, 'app/packages/providers/src/compatible.ts'), 'utf8');
    const code = src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    expect(code).not.toMatch(/spec\.id\s*===|entry\.id\s*===|switch\s*\(\s*spec\.id/);
    for (const id of ['groq', 'mistral', 'deepseek', 'openai']) {
      expect(code, `compatible.ts mentions "${id}"`).not.toContain(id);
    }
  });
});

describe('what it does when it goes wrong', () => {
  const cases: Array<[number, ProviderError['kind']]> = [
    [401, 'key-invalid'], [403, 'key-invalid'], [402, 'key-no-credit'],
    [429, 'rate-limited'], [500, 'provider-failed'],
  ];

  for (const [status, kind] of cases) {
    it(`turns ${status} into ${kind}, in her language`, async () => {
      stubFetch(() => new Response('', { status }));
      const err = await collect(spec().send(REQ, 'tk_x')).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(ProviderError);
      expect((err as ProviderError).kind).toBe(kind);
      // Never a status code and never English (006 US5).
      expect((err as ProviderError).message).not.toMatch(/[45]\d\d\b.*error code|Unauthorized|Forbidden/);
    });
  }

  it('reports no connection as no connection', async () => {
    stubFetch(() => { throw new Error('ENOTFOUND'); });
    const err = await collect(spec().send(REQ, 'tk_x')).catch((e: unknown) => e as ProviderError);
    expect((err as ProviderError).kind).toBe('offline');
    expect((err as ProviderError).message).toMatch(/conexión/i);
  });

  it('carries retry-after so the wait shown is the wait asked for', async () => {
    stubFetch(() => new Response('', { status: 429, headers: { 'retry-after': '77' } }));
    const err = await collect(spec().send(REQ, 'tk_x')).catch((e: unknown) => e as ProviderError);
    expect((err as ProviderError).retryAfterSeconds).toBe(77);
  });

  it('refuses a photograph for a service that cannot read one, naming the service', async () => {
    // Dropping the image silently would produce an adaptation of nothing, which
    // reads to her as a bad adaptation rather than as the wrong service.
    stubFetch(() => sse([]));
    const withImage = { ...REQ, images: [{ mediaType: 'image/jpeg', base64: 'AAA' }] };
    const err = await collect(spec({ vision: false }).send(withImage, 'tk_x')).catch((e: unknown) => e as ProviderError);
    expect(err).toBeInstanceOf(ProviderError);
    expect((err as ProviderError).message).toContain('Servicio de prueba');
    expect((err as ProviderError).message).toMatch(/no puede leer fotos/);
  });
});

describe('validation before anything is stored', () => {
  it('accepts a key the service accepts', async () => {
    stubFetch(() => new Response('{}', { status: 200 }));
    expect(await spec().validateKey('tk_abc')).toEqual({ ok: true });
  });

  it('treats busy as working, because it is', async () => {
    stubFetch(() => new Response('', { status: 429 }));
    expect((await spec().validateKey('tk_abc')).ok).toBe(true);
  });

  it('names the other service when she pasted the wrong key', async () => {
    const p = spec({ otherServices: [{ prefix: 'sk-ant-', label: 'Claude (Anthropic)' }] });
    const r = await p.validateKey('sk-ant-api03-xxxx');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('wrong-provider');
    expect(r.message).toContain('Claude (Anthropic)');
    expect(r.message).toContain('Servicio de prueba');
  });

  it('prefers the longest matching prefix when two services share one', async () => {
    // `sk-` and `sk-ant-` both match an Anthropic key. Shortest-match would
    // send her to DeepSeek's page with a confident, wrong, sentence.
    const p = spec({
      keyPrefix: 'sk-',
      otherServices: [{ prefix: 'sk-ant-', label: 'Claude (Anthropic)' }],
    });
    expect((await p.validateKey('sk-ant-api03-x')).message).toContain('Claude (Anthropic)');
  });

  it('reports no connection rather than an invalid key when the network is down', async () => {
    // The distinction that matters on a school connection: her key may be fine.
    stubFetch(() => { throw new Error('offline'); });
    const r = await spec().validateKey('tk_abc');
    expect(r.reason).toBe('network');
    expect(r.message).toMatch(/No hay conexión/);
  });

  it('says nothing was pasted when nothing was', async () => {
    expect((await spec().validateKey('   ')).reason).toBe('malformed');
  });

  it('reads no-credit out of a 400 body as well as a 402', async () => {
    stubFetch(() => new Response('{"error":{"message":"Insufficient balance"}}', { status: 400 }));
    expect((await spec().validateKey('tk_abc')).reason).toBe('no-credit');
  });
});

describe('every catalogue entry resolves to a working adapter', () => {
  it('resolves all six by adapter, never by id', () => {
    for (const entry of catalogue) {
      const p = providerFor(entry, catalogue);
      expect(p, `${entry.id} (adapter ${entry.adapter}) resolves to nothing`).toBeDefined();
      expect(p!.id).toBe(entry.id);
      expect(p!.requiresPaymentCard).toBe(entry.requiresCard);
      expect(p!.keyUrl).toBe(entry.keyUrl);
    }
  });

  it('gives the compatible ones the endpoint from their own entry', async () => {
    const seen: string[] = [];
    stubFetch((url) => { seen.push(url); return sse(['{"usage":{"prompt_tokens":1,"completion_tokens":1}}']); });
    for (const entry of catalogue.filter((s) => s.adapter === 'compatible')) {
      await collect(providerFor(entry, catalogue)!.send(REQ, 'k'));
      expect(seen.pop()).toBe(entry.endpoint);
    }
  });

  it('reports vision from the entry, so the recommendation rule and the adapter agree', async () => {
    for (const entry of catalogue) {
      const caps = await providerFor(entry, catalogue)!.capabilities();
      expect(caps.vision, `${entry.id}`).toBe(entry.vision);
    }
  });

  it('lets every service name every other service on a wrong-service paste', async () => {
    // Built from the catalogue, so adding a seventh service teaches the other
    // six to recognise its keys with no code change.
    const groq = catalogue.find((s) => s.id === 'groq')!;
    const r = await providerFor(groq, catalogue)!.validateKey('AIza' + 'x'.repeat(35));
    expect(r.message).toContain('Gemini (Google)');
  });

  /**
   * The seam this feature opened, guarded.
   *
   * `009` lets her connect six services. Until this was noticed, the adaptation
   * job resolved the provider with `providerById`, which knows two — so with
   * Groq connected and a green tick on the connection screen, adapting would
   * have failed with "todavía no has conectado Rampa con tu servicio de IA" and
   * she would have had no way to tell the failure was ours.
   *
   * The job now goes through `providerFor`. This asserts the property that made
   * the old code wrong: resolution must cover the whole catalogue, not a list.
   */
  it('covers the whole catalogue, so nothing connectable is unusable', () => {
    const resolvable = catalogue.filter((e) => providerFor(e, catalogue));
    expect(resolvable.map((e) => e.id).sort()).toEqual(catalogue.map((e) => e.id).sort());
    // And more than the two hand-written ones, which is the whole point.
    expect(resolvable.length).toBeGreaterThan(2);
  });

  it('returns nothing for an entry whose adapter cannot be served', () => {
    const broken = { ...catalogue[0]!, adapter: 'compatible' as const, endpoint: undefined };
    expect(providerFor(broken, catalogue)).toBeUndefined();
  });
});
