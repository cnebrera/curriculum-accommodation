import { ipcMain } from 'electron';
import { toWire, logger, isRampaError } from '@rampa/core';

/**
 * Every IPC handler goes through here.
 *
 * Before this, 41 of 42 handlers had no error handling at all: an exception
 * crossed to the renderer as an opaque string with its `kind` stripped, so the
 * interface's Spanish error mapping never matched and every failure read as
 * "algo ha ido mal".
 *
 * This wrapper does three things: it preserves the kind across the wire, it
 * logs the failure without ever logging what the teacher was working on, and it
 * times the call so a slow step can be found later.
 */
export function handle<A extends unknown[], R>(
  channel: string,
  fn: (...args: A) => Promise<R> | R,
): void {
  ipcMain.handle(channel, async (_event, ...args: unknown[]) => {
    const started = Date.now();
    try {
      const result = await fn(...(args as A));
      logger.debug('ipc.ok', { channel, ms: Date.now() - started });
      return result;
    } catch (e: unknown) {
      const kind = isRampaError(e) ? e.kind : 'unknown';
      // Note what failed and how long it took — never the arguments, which are
      // the teacher's material and her learners.
      logger.error('ipc.failed', {
        channel, kind, ms: Date.now() - started,
        message: e instanceof Error ? e.message.slice(0, 120) : String(e).slice(0, 120),
      });
      throw toWire(e);
    }
  });
}
