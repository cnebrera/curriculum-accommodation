import { describe, it, expect } from 'vitest';
import { fetchGate, type FetchGate } from '@rampa/core';
import { transportFor } from '../src/pictograms/download.js';

/**
 * The gate mints the transport (from a security review, 2026-09-02).
 *
 * ## The defect
 *
 * `fetchGate` was correct and `bringPictograms` called it. `checkUpdate` was written
 * three hours later and **did not** — so ARASAAC was reached with no acceptance ever
 * recorded, and kept being reached after she withdrew one. FR-2104 and FR-2106 both
 * failed, and `withdrawLicence`'s «stops further fetching» was false.
 *
 * The comments in `fetch.ts` and `preload.ts` had warned about exactly this shape: «a
 * gate in a caller is a gate the second caller walks past». I was the second caller.
 *
 * Re-checking in `checkUpdate` fixes the instance. This fixes the class: there is no
 * exported `httpTransport`, so nothing can make a request without a `FetchGate` that
 * says `may` — the requirement is in the type, not in a reviewer's memory.
 */

const refused: FetchGate[] = [
  { may: false, because: 'no-publisher' },
  { may: false, because: 'not-accepted', publisher: 'arasaac' },
];

describe('a refused gate yields a transport that cannot reach anybody', () => {
  for (const gate of refused) {
    it(`refuses json and bytes for ${gate.may ? 'may' : gate.because}`, async () => {
      const t = transportFor(gate);
      await expect(t.json('https://arasaac.org/whatever')).rejects.toThrow(/licencia/);
      await expect(t.bytes('https://arasaac.org/whatever')).rejects.toThrow(/licencia/);
    });
  }

  it('and the refusal carries a kind the renderer can translate', async () => {
    const t = transportFor({ may: false, because: 'no-publisher' });
    await expect(t.json('https://x.test')).rejects.toMatchObject({
      kind: 'pictogram-not-accepted',
    });
  });
});

describe('the gate itself refuses in every state that is not an acceptance', () => {
  const ids = ['arasaac'];

  it('nothing accepted', () => {
    expect(fetchGate(ids, null).may).toBe(false);
  });

  it('accepted, then withdrawn — which is what `withdrawLicence` leaves behind', () => {
    // `withdrawLicence` deletes `pictogramLicence`, so the gate sees `undefined`.
    expect(fetchGate(ids, undefined).may).toBe(false);
  });

  it("another publisher's acceptance", () => {
    expect(fetchGate(['arasaac', 'otro'], { publisher: 'arasaac' }, 'otro').may).toBe(false);
  });

  it('and allows it only for the one she accepted', () => {
    expect(fetchGate(ids, { publisher: 'arasaac' }))
      .toEqual({ may: true, publisherId: 'arasaac' });
  });
});

describe('no module exports a transport that skips the gate', () => {
  it('`httpTransport` is not exported', async () => {
    const mod = await import('../src/pictograms/download.js') as Record<string, unknown>;
    /*
     * The structural half. It was exported and `checkUpdate` imported it directly —
     * which is how a second call site reached the network without a gate at all.
     */
    expect(Object.keys(mod)).not.toContain('httpTransport');
    expect(Object.keys(mod)).toContain('transportFor');
  });

  it('and nothing else in the feature builds its own', async () => {
    const { readFileSync } = await import('node:fs');
    const src = ['download.ts', 'bring.ts']
      .map((f) => readFileSync(
        new URL(`../src/pictograms/${f}`, import.meta.url), 'utf8')).join('\n');
    // One `fetch(` per method in `httpTransport`, and nowhere else.
    expect([...src.matchAll(/(?<![.\w])fetch\(/g)]).toHaveLength(2);
  });
});
