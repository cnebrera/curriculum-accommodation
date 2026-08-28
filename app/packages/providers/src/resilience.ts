import { logger } from '@rampa/core';
import { ProviderError, type Chunk } from './types.js';

/**
 * Adapting a worksheet is a long call over a network a school does not control.
 * Three things were missing and all three are visible to a teacher:
 *
 * - **A timeout.** Without one a dropped connection leaves her watching a
 *   spinner with no end, which reads as "the program is broken".
 * - **Cancellation.** She must be able to change her mind, and closing a screen
 *   should not leave a request running against her own bill.
 * - **Retry on the failures that deserve it.** A rate limit is a wait, not an
 *   error — and on the free tier it is the normal case, not the exception.
 */
export const DEFAULT_TIMEOUT_MS = 180_000;

export interface Attempt { attempt: number; of: number; waitingSeconds?: number; }

/** Retry only what retrying can fix. A bad key is not going to become good. */
const RETRYABLE = new Set(['rate-limited', 'offline', 'provider-failed']);

export interface RunOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  maxAttempts?: number;
  onAttempt?: (a: Attempt) => void;
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => { clearTimeout(t); reject(new ProviderError('provider-failed', 'Cancelado.')); },
      { once: true });
  });

/**
 * Wraps a stream with a timeout that resets on activity, plus bounded retries.
 *
 * The timeout is per-chunk rather than per-call on purpose: a long adaptation
 * that is still streaming is healthy, and killing it at a fixed wall-clock limit
 * would punish exactly the biggest worksheets.
 */
export async function* runWithResilience(
  makeStream: () => AsyncIterable<Chunk>,
  opts: RunOptions = {},
): AsyncIterable<Chunk> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxAttempts = opts.maxAttempts ?? 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    opts.onAttempt?.({ attempt, of: maxAttempts });
    let produced = false;
    try {
      const iterator = makeStream()[Symbol.asyncIterator]();
      for (;;) {
        if (opts.signal?.aborted) throw new ProviderError('provider-failed', 'Cancelado.');

        const next = iterator.next();
        const timer = new Promise<never>((_r, reject) =>
          setTimeout(() => reject(new ProviderError('provider-failed',
            'El servicio ha tardado demasiado en responder.')), timeoutMs).unref?.());

        const result = await Promise.race([next, timer]);
        if (result.done) return;
        produced = true;
        yield result.value;
      }
    } catch (e: unknown) {
      const err = e instanceof ProviderError ? e : new ProviderError('provider-failed', String(e));
      const canRetry = RETRYABLE.has(err.kind) && attempt < maxAttempts && !opts.signal?.aborted;

      // Once output has reached the teacher, retrying would duplicate it.
      if (!canRetry || produced) {
        logger.warn('provider.failed', { kind: err.kind, attempt, produced });
        throw err;
      }

      const wait = err.retryAfterSeconds ?? Math.min(30, 2 ** attempt);
      logger.info('provider.retrying', { kind: err.kind, attempt, waitSeconds: wait });
      opts.onAttempt?.({ attempt, of: maxAttempts, waitingSeconds: wait });
      await sleep(wait * 1000, opts.signal);
    }
  }
}
