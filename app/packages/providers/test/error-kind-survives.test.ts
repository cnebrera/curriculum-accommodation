import { describe, it, expect } from 'vitest';
import { toWire, fromWire, isRampaError } from '@rampa/core';
import { ProviderError } from '../src/types.js';

/**
 * A provider failure keeps its kind all the way to the sentence she reads.
 *
 * ## The defect this was written for
 *
 * Found on 2026-09-01 by Carlos running the application and pressing «Preparar el
 * material». Google returned 404, and what he read was:
 *
 *   «Algo ha ido mal. No he perdido nada de lo tuyo.»
 *
 * The log said what the interface could not: `ipc.failed {"channel":"job:compose",
 * "kind":"unknown","message":"El servicio devolvió un error (404)."}`. The message
 * existed. The kind existed. **Neither reached her.**
 *
 * `ProviderError` was its own class, unrelated to `RampaError`. So `isRampaError`
 * was false, `toWire` returned the error unprefixed, `fromWire` read no kind, and
 * the interface fell through to the catch-all — for **every** provider failure
 * there is: no connection, rate limit, invalid key, no credit.
 *
 * Which means `es.ts` has carried five carefully written Spanish sentences —
 * «El servicio está ocupado. No es culpa tuya» among them — that a teacher could
 * never see. The comment in `errors.ts` describes this exact failure and says it
 * was fixed; it was fixed for one of the two error hierarchies.
 *
 * The lesson is the same one this project keeps relearning: a second class that
 * means the same thing is a second path that has to be maintained, and it is the
 * one nobody tests.
 */

const KINDS = ['offline', 'rate-limited', 'key-invalid', 'key-no-credit',
  'provider-failed', 'provider-model-gone'] as const;

describe('a provider failure survives the wire', () => {
  it('is a RampaError, so every layer that knows about kinds sees this one', () => {
    const e = new ProviderError('rate-limited', 'Espera un poco.');
    expect(isRampaError(e)).toBe(true);
  });

  it.each(KINDS)('keeps kind «%s» across the IPC boundary', (kind) => {
    const e = new ProviderError(kind, 'Da igual el texto.');
    // Exactly what `ipc/wrap.ts` does on the way out, and `data/async.ts` on the
    // way in — including the prefix Electron adds, which is what broke the naive
    // version of this round trip.
    const wired = new Error(`Error invoking remote method 'job:compose': ${toWire(e).message}`);
    expect(fromWire(wired).kind).toBe(kind);
  });

  it('keeps its own message, so a kind with no sentence still says something', () => {
    const e = new ProviderError('provider-failed', 'El servicio devolvió un error (503).');
    expect(fromWire(toWire(e)).message).toBe('El servicio devolvió un error (503).');
  });

  it('keeps retryAfterSeconds for the caller that waits', () => {
    // Not carried across the wire — the renderer does not retry — but the
    // resilience layer in this process reads it, and it must not be lost by
    // changing what this class extends.
    expect(new ProviderError('rate-limited', 'x', 60).retryAfterSeconds).toBe(60);
  });
});
