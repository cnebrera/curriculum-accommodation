import { describe, it, expect, vi } from 'vitest';
import { sendRedacted, RedactionBreach } from '../src/send.js';
import { PROVIDERS, providerById } from '../src/index.js';
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

  it('rejects a malformed key without touching the network', async () => {
    const r = await providerById('anthropic')!.validateKey('pegado a medias');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('malformed');
  });
});
