import { describe, it, expect, vi } from 'vitest';
import { runWithResilience } from '../src/resilience.js';
import { ProviderError, type Chunk } from '../src/types.js';

const collect = async (s: AsyncIterable<Chunk>) => { const o: Chunk[] = []; for await (const c of s) o.push(c); return o; };

describe('inference is resilient without being reckless', () => {
  it('retries a rate limit, which on a free tier is normal rather than an error', async () => {
    let calls = 0;
    const stream = () => (async function* () {
      calls++;
      if (calls === 1) throw new ProviderError('rate-limited', 'busy', 0);
      yield { text: 'ok' } as Chunk;
    })();
    const out = await collect(runWithResilience(stream, { maxAttempts: 3 }));
    expect(calls).toBe(2);
    expect(out[0]?.text).toBe('ok');
  });

  it('does not retry a bad key, because retrying cannot fix it', async () => {
    let calls = 0;
    const stream = () => (async function* () { calls++; throw new ProviderError('key-invalid', 'nope'); })();
    await expect(collect(runWithResilience(stream, { maxAttempts: 3 }))).rejects.toThrow();
    expect(calls).toBe(1);
  });

  it('never retries once output has reached the teacher, which would duplicate it', async () => {
    let calls = 0;
    const stream = () => (async function* () {
      calls++;
      yield { text: 'primera parte' } as Chunk;
      throw new ProviderError('provider-failed', 'cut off');
    })();
    await expect(collect(runWithResilience(stream, { maxAttempts: 3 }))).rejects.toThrow();
    expect(calls).toBe(1);
  });

  it('gives up rather than hanging on a stalled response', async () => {
    const stream = () => (async function* () { await new Promise(() => { /* never resolves */ }); yield {} as Chunk; })();
    await expect(collect(runWithResilience(stream, { timeoutMs: 40, maxAttempts: 1 })))
      .rejects.toThrow(/tardado demasiado/);
  });

  it('stops when she changes her mind', async () => {
    const controller = new AbortController();
    controller.abort();
    const stream = () => (async function* () { yield { text: 'x' } as Chunk; })();
    await expect(collect(runWithResilience(stream, { signal: controller.signal }))).rejects.toThrow(/Cancelado/);
  });

  it('reports each attempt, so a wait can be shown instead of a frozen screen', async () => {
    const onAttempt = vi.fn();
    let calls = 0;
    const stream = () => (async function* () {
      calls++;
      if (calls === 1) throw new ProviderError('offline', 'no net', 0);
      yield { text: 'ok' } as Chunk;
    })();
    await collect(runWithResilience(stream, { maxAttempts: 2, onAttempt }));
    expect(onAttempt).toHaveBeenCalled();
    expect(onAttempt.mock.calls.some(([a]) => a.waitingSeconds !== undefined)).toBe(true);
  });
});
