import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { loadCatalogue } from '@rampa/core';
import { providerFor, ADAPTER_IDS } from '../src/index.js';

/**
 * The model a service is called with is the one the corpus declares (Principle I).
 *
 * ## The defect this closes, and why the test is generic
 *
 * On 2026-09-01 composing failed with a 404 from Google. The cause:
 *
 * | Source | Model |
 * |---|---|
 * | `instructions/providers/google.md` | `gemini-2.5-flash` — correct, and dated |
 * | `packages/providers/src/google.ts`  | `gemini-2.0-flash` — **what ran** |
 *
 * `providerFor` passed `entry.model` to the `compatible` and `openai` adapters and
 * dropped it for `google` and `anthropic`, which returned their hand-written
 * constants. Nothing in the shell ever sets `req.model`, so the constant always won.
 * Google had shut `gemini-2.0-flash` down, so the free-tier path — the one the README
 * recommends for a teacher's first run — could not adapt anything at all.
 *
 * That is the **tenth** time this project has found a field that is written, parsed,
 * typed and read by nobody. So this test is not «google uses 2.5-flash»: it is
 * **every entry that declares a model gets called with it**, which is the class of
 * defect rather than the instance. A seventh service added tomorrow is covered by it
 * on the day it is added.
 *
 * It is also Principle I with teeth. The corpus was maintained — `last_checked:
 * 2026-08-28` — and the code was not, and the code won. A judgement that lives in
 * Markdown has to be the judgement that runs.
 */

const catalogueDir = join(
  dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..', 'instructions', 'providers');

const catalogue = loadCatalogue(
  readdirSync(catalogueDir).filter((f) => f.endsWith('.md') && f !== 'README.md')
    .map((f) => ({ path: f, raw: readFileSync(join(catalogueDir, f), 'utf8') })),
  { available: ADAPTER_IDS, today: new Date('2026-09-15T00:00:00Z') },
);

describe('the corpus decides which model is called', () => {
  it('has a catalogue to check, so nothing below is vacuous', () => {
    expect(catalogue.length).toBeGreaterThan(3);
    expect(catalogue.filter((s) => s.model).length).toBe(catalogue.length);
  });

  it('gives every service the model its corpus entry declares', () => {
    for (const entry of catalogue) {
      const provider = providerFor(entry, catalogue);
      expect(provider, `${entry.id} produced no provider`).toBeDefined();
      expect(provider!.defaultModel,
        `${entry.id}: the corpus says «${entry.model}» and the adapter would use `
        + `«${provider!.defaultModel}»`).toBe(entry.model);
    }
  });

  it('calls the declared model on the wire, not just in a field', async () => {
    /*
     * The field being right is not the requirement — the request being right is. This
     * is the assertion that would have caught the original defect, because
     * `defaultModel` was never wrong: it was correct for a model Google had retired,
     * and `send()` read it rather than the corpus.
     */
    const sent: string[] = [];
    vi.stubGlobal('fetch', vi.fn((url: unknown, init?: unknown) => {
      sent.push(String(url) + '\n' + String((init as RequestInit | undefined)?.body ?? ''));
      const body = 'data: {"choices":[{"delta":{"content":"ok"}}]}\n\ndata: [DONE]\n\n';
      return Promise.resolve(new Response(new Blob([body]).stream(), { status: 200 }));
    }));

    for (const entry of catalogue) {
      sent.length = 0;
      const provider = providerFor(entry, catalogue)!;
      try {
        for await (const _ of provider.send(
          { system: 's', messages: [{ role: 'user', content: 'hola' }] }, 'k')) { /* drain */ }
      } catch { /* a stubbed frame in the wrong dialect is fine; we want the request */ }
      expect(sent.join('\n'), `${entry.id} did not name its declared model`)
        .toContain(entry.model);
    }
  });

  afterEach(() => vi.unstubAllGlobals());
});
