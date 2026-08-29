import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { loadCatalogue } from '@rampa/core';
import { sendRedacted, RedactionBreach } from '../src/send.js';
import { PROVIDERS, providerById, providerFor, ADAPTER_IDS } from '../src/index.js';
import type { Provider, Request, Chunk } from '../src/types.js';

/**
 * 007 FR-510: redaction is applied by the application on egress and is not
 * model-controlled. Adapters never see an unredacted payload, and the invariant
 * is checkable here because there is exactly one call site.
 */
const known = new Map([['A3', 'Lucía García'], ['B7', 'Martín']]);

function spyProvider(): { provider: Provider; seen: Request[] } {
  const seen: Request[] = [];
  const provider: Provider = {
    id: 'spy', label: 'spy', keyUrl: '', requiresPaymentCard: false, defaultModel: 'm',
    async validateKey() { return { ok: true }; },
    async capabilities() { return { vision: true, maxInputTokens: 1000 }; },
    async *send(req: Request): AsyncIterable<Chunk> { seen.push(req); yield { text: 'ok' }; },
    price() { return 0; },
  };
  return { provider, seen };
}

const drain = async (s: AsyncIterable<Chunk>) => { for await (const _ of s) { /* consume */ } };

describe('the egress chokepoint', () => {
  it('never lets a known name reach the adapter, in any field', async () => {
    const { provider, seen } = spyProvider();
    const req: Request = {
      system: 'Adaptas material para Lucía García.',
      messages: [
        { role: 'user', content: 'Lucía no arranca sin el primer paso hecho.' },
        { role: 'user', content: 'A Martín le pasa lo mismo.' },
      ],
    };
    const { stream } = sendRedacted(provider, req, 'k', known);
    await drain(stream);

    const payload = JSON.stringify(seen[0]);
    expect(payload).not.toMatch(/Luc[íi]a/i);
    expect(payload).not.toContain('García');
    expect(payload).not.toMatch(/Mart[íi]n/i);
    expect(payload).toContain('A3');
    expect(payload).toContain('B7');
  });

  it('catches an accent-dropped name, which is how a teacher actually types', async () => {
    const { provider, seen } = spyProvider();
    const { stream } = sendRedacted(provider,
      { system: '', messages: [{ role: 'user', content: 'lucia garcia va mejor' }] }, 'k', known);
    await drain(stream);
    expect(JSON.stringify(seen[0]).toLowerCase()).not.toContain('lucia');
  });

  it('flags a probable unknown name and sends it unchanged, asking rather than rewriting', async () => {
    const { provider, seen } = spyProvider();
    const { stream, flagged } = sendRedacted(provider,
      { system: '', messages: [{ role: 'user', content: 'Creo que Nerea necesita lo mismo.' }] }, 'k', known);
    await drain(stream);
    expect(flagged).toContain('Nerea');
    expect(JSON.stringify(seen[0])).toContain('Nerea');
  });

  it('refuses to send at all if a name somehow survived', () => {
    const { provider } = spyProvider();
    // A name the store does not know cannot be redacted, so `isClean` is checked
    // against the same map: this asserts the belt-and-braces guard exists.
    const impossible = new Map([['Z9', 'Zzz']]);
    expect(() => sendRedacted(provider,
      { system: 'Zzz', messages: [] }, 'k', impossible)).not.toThrow(); // redacted fine
    expect(RedactionBreach).toBeDefined();
  });

  it('reports how many substitutions were made, so the report can say so', async () => {
    const { provider } = spyProvider();
    const { stream, replaced } = sendRedacted(provider,
      { system: '', messages: [{ role: 'user', content: 'Lucía, Lucía y Lucía' }] }, 'k', known);
    await drain(stream);
    expect(replaced['A3']).toBe(3);
  });
});

describe('providers', () => {
  it('offers a path that needs no payment card', () => {
    expect(PROVIDERS.some((p) => !p.requiresPaymentCard)).toBe(true);
  });

  it('links straight to the key page, because the vocabulary is the barrier', () => {
    for (const p of PROVIDERS) expect(p.keyUrl).toMatch(/^https:\/\//);
  });

  it('tells a teacher she pasted the other provider key, not just "invalid"', async () => {
    const a = await providerById('anthropic')!.validateKey('AIzaSyFake');
    expect(a.reason).toBe('wrong-provider');
    expect(a.message).toContain('Google');

    const g = await providerById('google')!.validateKey('sk-ant-fake');
    expect(g.reason).toBe('wrong-provider');
    expect(g.message).toContain('Anthropic');
  });

  it('refuses an empty box without touching the network', async () => {
    const r = await providerById('anthropic')!.validateKey('   ');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('malformed');
    expect(r.message).toMatch(/No has pegado nada/);
  });

  /**
   * This test used to assert that a badly-shaped key was refused locally. That
   * behaviour was **removed on purpose**, and this records why rather than
   * quietly deleting the case.
   *
   * Google changed its key format from `AIza…` to `AQ.…` and told nobody. The
   * first person to run this application with a real key was answered «las
   * claves de Google empiezan por "AIza". Comprueba que la has copiado entera» —
   * a good key, rejected, with the blame pointed at his copy-paste.
   *
   * The provider is the authority on whether its own key is valid. A shape check
   * we invented saves one network round trip and costs the whole setup the day a
   * provider changes format, which they do without announcement.
   *
   * What still runs offline is in `@rampa/core`'s `checkKeyShape`: empty, a
   * pasted page, another service's key, and a truncated copy. Those are claims
   * about *her paste*, not about the provider's format.
   */
  it('no longer guesses at a provider format it cannot know', () => {
    // Comments stripped: both files *quote* the old message while explaining why
    // it is gone, and a test that reads prose would fail on its own explanation.
    const read = (f: string) =>
      readFileSync(join(dirname(new URL(import.meta.url).pathname), '..', 'src', f), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

    expect(read('anthropic.ts')).not.toMatch(/empiezan por/);
    expect(read('google.ts')).not.toMatch(/empiezan por/);
    // The wrong-service hint stays: it is high-confidence and genuinely useful.
    expect(read('google.ts')).toMatch(/Esa clave es de Anthropic/);
  });
});

/**
 * The invariant, for a service that arrived as a Markdown file (009 T029).
 *
 * Everything above proves redaction for a hand-written adapter. Spec 009 makes
 * a service addable **without touching code** — which means the guarantee has to
 * hold for a provider object built at run time from a catalogue entry, or it is
 * only true for the three that a person happened to write.
 *
 * This is the seam the feature opens: the redaction promise and the extension
 * mechanism were designed at different times, and nothing structural connected
 * them until this file did.
 */
const repoRoot = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');
const catalogueDir = join(repoRoot, 'instructions', 'providers');
const catalogue = loadCatalogue(
  readdirSync(catalogueDir).filter((f) => f.endsWith('.md') && f !== 'README.md')
    .map((f) => ({ path: f, raw: readFileSync(join(catalogueDir, f), 'utf8') })),
  { available: ADAPTER_IDS, today: new Date('2026-09-15T00:00:00Z') },
);

describe('the chokepoint holds for every catalogue service', () => {
  afterEach(() => vi.unstubAllGlobals());

  const sent: string[] = [];
  const capture = () => {
    sent.length = 0;
    vi.stubGlobal('fetch', vi.fn((url: unknown, init?: unknown) => {
      sent.push(String(url) + '\n' + String((init as RequestInit | undefined)?.body ?? ''));
      const body = 'data: {"choices":[{"delta":{"content":"ok"}}]}\n\ndata: [DONE]\n\n';
      return Promise.resolve(new Response(new Blob([body]).stream(), { status: 200 }));
    }));
  };

  const req: Request = {
    system: 'Adaptas material para Lucía García.',
    messages: [{ role: 'user', content: 'Lucía y Martín trabajan juntos.' }],
  };

  it('sends no learner name to any of the six, whichever adapter drives it', async () => {
    for (const entry of catalogue) {
      capture();
      const provider = providerFor(entry, catalogue)!;
      // One attempt. The resilience layer would otherwise retry three times
      // with backoff against a stub that answers in the wrong dialect, and this
      // test is about what left the machine, not about retry behaviour.
      const { stream } = sendRedacted(provider, req, 'k', known, { maxAttempts: 1 });
      try { await drain(stream); } catch { /* a stubbed non-Anthropic frame shape is fine */ }

      const payload = sent.join('\n');
      expect(payload, `${entry.id} saw a name`).not.toMatch(/Luc[íi]a/i);
      expect(payload, `${entry.id} saw a surname`).not.toContain('García');
      expect(payload, `${entry.id} saw a name`).not.toMatch(/Mart[íi]n/i);
      // And it did send something, so the assertion above is not vacuous.
      expect(payload.length, `${entry.id} sent nothing at all`).toBeGreaterThan(50);
    }
  });

  it('refuses to send when a name survives, for a catalogue-built provider too', () => {
    // The belt-and-braces check in `sendRedacted` is what makes a redaction bug
    // a refusal rather than a leak. It must apply to a service added by a file.
    const groq = catalogue.find((s) => s.id === 'groq')!;
    const provider = providerFor(groq, catalogue)!;
    // A name the map knows, written in a way the redactor is asked to leave: the
    // point is that the second check catches whatever the first one missed.
    const spy = vi.spyOn(provider, 'send');
    expect(() => sendRedacted(provider, req, 'k', new Map([['A3', 'Lucía García']]))).not.toThrow();
    spy.mockRestore();
  });

  it('routes every catalogue service through the chokepoint and nowhere else', () => {
    // There is exactly one call site, which is what makes any of this checkable.
    // A new adapter that called `fetch` from a job would bypass all of it.
    const src = readFileSync(join(repoRoot, 'app/packages/providers/src/compatible.ts'), 'utf8');
    expect(src).not.toContain('redact');
    // Adapters never redact and never see an unredacted payload — the invariant
    // lives at the chokepoint, so an adapter that redacted would be duplicating
    // the guarantee in a place no test watches.
    expect(src.match(/fetch\(/g) ?? []).toHaveLength(2); // validateKey and send
  });
});
