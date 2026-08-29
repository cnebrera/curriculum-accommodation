import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { checkForUpdate, isNewer } from '../src/releases.js';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

/**
 * The update check (006 T073).
 *
 * Against a real local server, for the same reason the degradation suite is:
 * the failures worth testing here are a timeout and a malformed body, and a
 * `fetch` stub cannot produce the first one at all.
 */
let server: Server;
let port = 0;
let respond: (res: ServerResponse) => void = (res) => res.end('{}');

beforeAll(async () => {
  server = createServer((_req, res) => respond(res));
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  port = (server.address() as AddressInfo).port;
});
afterAll(async () => {
  server.closeAllConnections?.();
  await new Promise<void>((r) => server.close(() => r()));
});

const api = () => `http://127.0.0.1:${port}/latest`;
const json = (body: unknown, status = 200) => (res: ServerResponse) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
};

describe('version comparison', () => {
  it('is numeric, not lexical', () => {
    /*
     * The defect this prevents: `'0.10.0' > '0.9.0'` is **false** as a string,
     * so a lexical comparison would tell her she is up to date for the whole of
     * a ten-release stretch and then stop mentioning updates entirely.
     */
    expect(isNewer('0.10.0', '0.9.0')).toBe(true);
    expect(isNewer('0.9.0', '0.10.0')).toBe(false);
    expect(isNewer('1.0.0', '0.99.99')).toBe(true);
  });

  it('tolerates a v prefix and a pre-release suffix', () => {
    expect(isNewer('v0.2.0', '0.1.0')).toBe(true);
    expect(isNewer('0.2.0-beta.1', '0.1.0')).toBe(true);
  });

  it('says no to the same version, and to an older one', () => {
    expect(isNewer('0.1.0', '0.1.0')).toBe(false);
    expect(isNewer('0.1.0', '0.2.0')).toBe(false);
  });

  it('treats a missing component as zero rather than as newer', () => {
    expect(isNewer('0.1', '0.1.0')).toBe(false);
    expect(isNewer('0.1.1', '0.1')).toBe(true);
  });

  it('does not crash on a tag that is not a version', () => {
    expect(isNewer('release-candidate', '0.1.0')).toBe(false);
  });
});

describe('asking once', () => {
  it('reports a newer release and where to get it', async () => {
    respond = json({ tag_name: 'v0.4.0' });
    const s = await checkForUpdate('0.1.0', { api: api() });
    expect(s).toMatchObject({ current: '0.1.0', latest: '0.4.0', newer: true });
    // Always the releases page, never a binary URL: the installers are unsigned
    // (R14), so she has to see the page and its warnings.
    expect(s.page).toMatch(/^https:\/\/github\.com\/.*\/releases$/);
    expect(s.problem).toBeUndefined();
  });

  it('reports up-to-date without inventing a problem', async () => {
    respond = json({ tag_name: 'v0.1.0' });
    const s = await checkForUpdate('0.1.0', { api: api() });
    expect(s.newer).toBe(false);
    expect(s.latest).toBe('0.1.0');
    expect(s.problem).toBeUndefined();
  });

  it('treats "no release published yet" as an answer, not a failure', async () => {
    // The project has published none at the time of writing. Telling her
    // "no he podido comprobarlo" would be a different and wrong statement.
    respond = json({ message: 'Not Found' }, 404);
    expect((await checkForUpdate('0.1.0', { api: api() })).problem).toBe('not-published');
  });

  it('falls back to `name` when there is no tag', async () => {
    respond = json({ name: '0.3.0' });
    expect((await checkForUpdate('0.1.0', { api: api() })).latest).toBe('0.3.0');
  });

  it('reads an unusable body as unreadable rather than throwing', async () => {
    for (const body of [{}, { tag_name: 42 }, { tag_name: null }]) {
      respond = json(body);
      expect((await checkForUpdate('0.1.0', { api: api() })).problem).toBe('unreadable');
    }
    respond = (res) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end('not json'); };
    expect((await checkForUpdate('0.1.0', { api: api() })).problem).toBe('offline');
  });

  it('reads a rate limit as unreadable, not as up-to-date', async () => {
    // Saying "estás al día" when we could not check would be the one wrong
    // answer here: she would stop looking.
    respond = json({ message: 'API rate limit exceeded' }, 403);
    const s = await checkForUpdate('0.1.0', { api: api() });
    expect(s.problem).toBe('unreadable');
    expect(s.newer).toBe(false);
    expect(s.latest).toBeUndefined();
  });

  it('reports offline when nothing is listening, and never throws', async () => {
    const s = await checkForUpdate('0.1.0', { api: 'http://127.0.0.1:1/latest' });
    expect(s.problem).toBe('offline');
    expect(s.current).toBe('0.1.0');
  });

  it('gives up rather than hanging on a server that never answers', async () => {
    respond = () => { /* headers never written */ };
    const s = await checkForUpdate('0.1.0', { api: api(), timeoutMs: 200 });
    expect(s.problem).toBe('offline');
  }, 10_000);
});

describe('it is never automatic', () => {
  it('has no scheduler, no launch hook, and no interval', () => {
    /*
     * The property that matters most and is easiest to lose: someone adds a
     * "check on startup" for convenience, and a tool handling children's data
     * in state schools starts phoning home on a schedule nobody consented to.
     *
     * Asserted over the source, because there is no runtime behaviour to
     * observe — the absence of a timer is the whole guarantee.
     */
    const root = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..');
    const src = readFileSync(join(root, 'packages/providers/src/releases.ts'), 'utf8');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/setInterval|whenReady|app\.on|autoUpdater/);
    // The one timer present is the abort timeout, which shortens a request
    // rather than scheduling one.
    expect(code.match(/setTimeout/g) ?? []).toHaveLength(1);
    expect(code).toContain('controller.abort');

    // And the main-process handler must not call it on its own either.
    const shell = readFileSync(join(root, 'packages/shell/src/ipc/corpus.ts'), 'utf8');
    const shellCode = shell.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const calls = shellCode.match(/checkForUpdate\(/g) ?? [];
    // Exactly one: inside the IPC handler, reached only from her button.
    expect(calls).toHaveLength(1);
    expect(shellCode).toMatch(/handle\('corpus:checkForUpdate'/);
  });

  it('sends nothing identifying', () => {
    const root = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..');
    const code = readFileSync(join(root, 'packages/providers/src/releases.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    // No key, no machine id, no vault path, no learner anything.
    expect(code).not.toMatch(/hostname|machineId|userInfo|vault|apiKey|token/i);
    expect(code).not.toMatch(/credentials|cookie/i);
  });
});
