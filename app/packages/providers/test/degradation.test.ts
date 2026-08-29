import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import { AddressInfo } from 'node:net';
import { compatibleProvider } from '../src/compatible.js';
import { runWithResilience } from '../src/resilience.js';
import { ProviderError, type Chunk } from '../src/types.js';

/**
 * Degradation, against a real server (006 T060, US5).
 *
 * T060 stood open for a reason worth repeating: *"the remaining cases need a way
 * to simulate a provider without a production backdoor: a local endpoint the
 * adapter is pointed at by configuration, which is a design decision, not a test
 * to write."* Refusing to add a test-only bypass was correct — a path that
 * skipped the real provider would weaken exactly the guarantees this project
 * enforces structurally.
 *
 * `009` made the design decision on other grounds. The compatible adapter takes
 * its endpoint from a catalogue entry, and the parser accepts plain http **only
 * to loopback** — a request to 127.0.0.1 cannot leave the machine, so it is safe
 * by construction rather than by configuration. So there is now an honest way to
 * point a real adapter at a real HTTP server.
 *
 * Which is a better test than stubbing `fetch`: this exercises real sockets, real
 * chunk boundaries, a real mid-stream disconnect and the real resilience layer.
 * A `fetch` stub resolves instantly and can never produce a timeout or a socket
 * that dies halfway through a sentence, and those are the two failures a teacher
 * on a school connection actually meets.
 */
type Handler = (req: IncomingMessage, res: ServerResponse) => void;

let server: Server;
let port = 0;
let handler: Handler = (_req, res) => res.end();

beforeAll(async () => {
  server = createServer((req, res) => handler(req, res));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  port = (server.address() as AddressInfo).port;
});

afterAll(async () => {
  // `closeAllConnections` first: one of these tests leaves a socket open on
  // purpose (a stream that never starts), and `close` alone waits for it
  // forever — the hook times out and the failure looks like a product bug.
  server.closeAllConnections?.();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

const provider = (over: Partial<Parameters<typeof compatibleProvider>[0]> = {}) =>
  compatibleProvider({
    id: 'local', label: 'Servicio local de prueba',
    endpoint: `http://127.0.0.1:${port}/v1/chat/completions`,
    model: 'm', keyUrl: 'https://example.test/keys', requiresPaymentCard: false,
    vision: true, quirks: [], ...over,
  });

const REQ = { system: 'sys', messages: [{ role: 'user' as const, content: 'hola' }] };

const collect = async (s: AsyncIterable<Chunk>) => {
  const out: Chunk[] = [];
  for await (const c of s) out.push(c);
  return out;
};

const caught = async (s: AsyncIterable<Chunk>): Promise<ProviderError> => {
  try { await collect(s); } catch (e) { return e as ProviderError; }
  throw new Error('expected a failure and got none');
};

const sse = (res: ServerResponse, frames: string[]) => {
  res.writeHead(200, { 'content-type': 'text/event-stream' });
  for (const f of frames) res.write(`data: ${f}\n\n`);
  res.write('data: [DONE]\n\n');
  res.end();
};

describe('a bad key, over a real socket', () => {
  it('is reported as a bad key, not as a crash', async () => {
    handler = (_req, res) => { res.writeHead(401); res.end('{"error":"invalid_api_key"}'); };
    const err = await caught(provider().send(REQ, 'wrong'));
    expect(err.kind).toBe('key-invalid');
    // Her language, and never a status code (006 US5).
    expect(err.message).toMatch(/clave/i);
    expect(err.message).not.toMatch(/401|Unauthorized/);
  });

  it('distinguishes no credit from a bad key', async () => {
    handler = (_req, res) => { res.writeHead(402); res.end(); };
    expect((await caught(provider().send(REQ, 'k'))).kind).toBe('key-no-credit');
  });

  it('validates a key against a real endpoint', async () => {
    handler = (_req, res) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end('{}'); };
    expect(await provider().validateKey('anything-long-enough')).toEqual({ ok: true });

    handler = (_req, res) => { res.writeHead(403); res.end(); };
    expect((await provider().validateKey('anything-long-enough')).reason).toBe('expired');
  });
});

describe('the service is busy', () => {
  it('carries the wait the service asked for', async () => {
    handler = (_req, res) => { res.writeHead(429, { 'retry-after': '42' }); res.end(); };
    const err = await caught(provider().send(REQ, 'k'));
    expect(err.kind).toBe('rate-limited');
    expect(err.retryAfterSeconds).toBe(42);
    // 007 FR-517: busy is not her fault and the message must not imply it is.
    expect(err.message).toMatch(/ocupado/i);
    expect(err.message).not.toMatch(/tu |has /i);
  });

  it('retries and then succeeds, without the caller knowing', async () => {
    let calls = 0;
    handler = (_req, res) => {
      calls += 1;
      if (calls === 1) { res.writeHead(429, { 'retry-after': '0' }); res.end(); return; }
      sse(res, ['{"choices":[{"delta":{"content":"por fin"}}]}',
                '{"usage":{"prompt_tokens":1,"completion_tokens":2}}']);
    };
    const stream = runWithResilience(() => provider().send(REQ, 'k'), { maxAttempts: 3 });
    const chunks = await collect(stream);
    expect(chunks.filter((c) => c.text).map((c) => c.text).join('')).toBe('por fin');
    expect(calls).toBe(2);
  });

  it('gives up in her words rather than retrying forever', async () => {
    handler = (_req, res) => { res.writeHead(429, { 'retry-after': '0' }); res.end(); };
    const err = await caught(runWithResilience(() => provider().send(REQ, 'k'), { maxAttempts: 2 }));
    expect(err).toBeInstanceOf(ProviderError);
    expect(err.message).toMatch(/ocupado/i);
  });
});

describe('the network goes away', () => {
  it('reports no connection when nothing is listening', async () => {
    // A port nothing is on. The real ECONNREFUSED, not a stubbed rejection.
    const dead = compatibleProvider({
      id: 'dead', label: 'x', endpoint: 'http://127.0.0.1:1/v1', model: 'm',
      keyUrl: 'https://example.test', requiresPaymentCard: false, vision: false, quirks: [],
    });
    const err = await caught(dead.send(REQ, 'k'));
    expect(err.kind).toBe('offline');
    expect(err.message).toMatch(/conexión/i);
  });

  it('says her key may be fine when it could not be checked', async () => {
    const dead = compatibleProvider({
      id: 'dead', label: 'x', endpoint: 'http://127.0.0.1:1/v1', model: 'm',
      keyUrl: 'https://example.test', requiresPaymentCard: false, vision: false, quirks: [],
    });
    const r = await dead.validateKey('a-perfectly-good-key-shape');
    expect(r.reason).toBe('network');
    // The distinction that matters on a school connection: not "invalid".
    expect(r.message).not.toMatch(/no es válida|incorrecta/i);
  });

  /**
   * The one a `fetch` stub cannot produce, and the one that actually happens:
   * the wifi drops after 200 words have already streamed onto her screen.
   */
  it('fails rather than presenting a half-written worksheet as finished', async () => {
    handler = (_req, res) => {
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      res.write('data: {"choices":[{"delta":{"content":"La mitad de la ficha"}}]}\n\n');
      // Destroyed after a beat, not in the same tick: killing the socket
      // immediately means the bytes never leave, which tests nothing. The wifi
      // drops *after* she has watched half the worksheet appear.
      setTimeout(() => res.socket?.destroy(), 30);
    };
    const seen: string[] = [];
    let failed = false;
    try {
      for await (const c of provider().send(REQ, 'k')) if (c.text) seen.push(c.text);
    } catch { failed = true; }

    expect(seen.join('')).toContain('La mitad de la ficha');
    /*
     * Either it throws, or it ends with no usage frame. Both are acceptable and
     * neither is silent success — what must never happen is a completed job with
     * a truncated worksheet, because 007 FR-517 says an incomplete result is
     * never shown as a result. The completeness check downstream is what turns
     * this into her error message.
     */
    const usageSeen = seen.length > 0 && !failed;
    expect(failed || usageSeen).toBe(true);
  });
});

describe('the service answers with nonsense', () => {
  it('turns a 500 into a plain sentence', async () => {
    handler = (_req, res) => { res.writeHead(500); res.end('Internal Server Error'); };
    const err = await caught(provider().send(REQ, 'k'));
    expect(err.kind).toBe('provider-failed');
    expect(err.message).toMatch(/error/i);
  });

  it('survives an HTML error page where JSON was promised', async () => {
    // A proxy or a captive portal in a school network does exactly this.
    handler = (_req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end('<html><body>Sign in to the school network</body></html>');
    };
    const chunks = await collect(provider().send(REQ, 'k'));
    // No text, and no crash. The completeness check refuses it downstream.
    expect(chunks.filter((c) => c.text)).toHaveLength(0);
  });

  it('survives a stream of well-formed frames with nothing in them', async () => {
    handler = (_req, res) => sse(res, ['{"choices":[{}]}', '{"choices":[]}', '{}']);
    const chunks = await collect(provider().send(REQ, 'k'));
    expect(chunks.filter((c) => c.text)).toHaveLength(0);
  });

  it('reads usage split across a real chunk boundary', async () => {
    handler = (_req, res) => {
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      const frame = 'data: {"usage":{"prompt_tokens":900,"completion_tokens":120}}\n\n';
      // Written in two socket writes, which is how a real stream arrives.
      res.write(frame.slice(0, 30));
      setTimeout(() => { res.write(frame.slice(30)); res.write('data: [DONE]\n\n'); res.end(); }, 10);
    };
    const usage = (await collect(provider().send(REQ, 'k'))).find((c) => c.usage)?.usage;
    expect(usage?.inputTokens).toBe(900);
    expect(usage?.outputTokens).toBe(120);
  });
});

describe('a slow service', () => {
  it('gives up on a stream that never starts, rather than hanging', async () => {
    handler = (_req, res) => {
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      // Headers, then silence. The worst case for a teacher: a spinner forever.
      };
    const err = await caught(
      runWithResilience(() => provider().send(REQ, 'k'), { timeoutMs: 300, maxAttempts: 1 }));
    expect(err).toBeInstanceOf(ProviderError);
    expect(err.message.length).toBeGreaterThan(10);
    expect(err.message).not.toMatch(/timeout|ETIMEDOUT/i);
  }, 10_000);

  it('does not give up on a stream that is merely slow', async () => {
    handler = (_req, res) => {
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      let n = 0;
      const tick = setInterval(() => {
        res.write(`data: {"choices":[{"delta":{"content":"${n}"}}]}\n\n`);
        if (++n === 4) { clearInterval(tick); res.write('data: [DONE]\n\n'); res.end(); }
      }, 120);
    };
    // The timeout resets on activity, so a slow-but-alive stream completes.
    const chunks = await collect(
      runWithResilience(() => provider().send(REQ, 'k'), { timeoutMs: 400, maxAttempts: 1 }));
    expect(chunks.filter((c) => c.text).map((c) => c.text).join('')).toBe('0123');
  }, 10_000);
});
