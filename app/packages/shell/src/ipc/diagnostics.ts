import { app, shell } from 'electron';
import { appendFile, mkdir, readFile, stat, rename } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { logger, formatLine, type LogRecord } from '@rampa/core';
import { handle } from './wrap.js';

/**
 * The log lives in the OS application-data directory, NOT in the vault.
 *
 * It is a diagnostic, not part of her records: it must not travel with a
 * handover packet, must not be copied by a vault backup, and must not appear
 * in a folder she is encouraged to share. And per @rampa/core's log module, it
 * never contains a learner's name, her material, or anything that could
 * reproduce them.
 */
const LOG_MAX_BYTES = 2_000_000;
const logPath = () => join(app.getPath('userData'), 'logs', 'rampa.log');

async function rotateIfLarge(path: string): Promise<void> {
  try {
    if ((await stat(path)).size > LOG_MAX_BYTES) await rename(path, `${path}.1`);
  } catch { /* no log yet */ }
}

export async function startLogging(): Promise<void> {
  const path = logPath();
  await mkdir(dirname(path), { recursive: true });
  await rotateIfLarge(path);

  logger.setLevel(app.isPackaged ? 'info' : 'debug');
  logger.addSink((r: LogRecord) => { void appendFile(path, formatLine(r) + '\n', 'utf8').catch(() => { /* never break the app for a log */ }); });
  if (!app.isPackaged) logger.addSink((r) => { process.stdout.write(formatLine(r) + '\n'); });

  logger.info('app.started', { version: app.getVersion(), platform: process.platform, packaged: app.isPackaged });

  // An unhandled failure is the one a teacher will report, so it must be in the file.
  process.on('uncaughtException', (e) => logger.error('uncaught', { message: e.message.slice(0, 200) }));
  process.on('unhandledRejection', (e) => logger.error('unhandled-rejection', { message: String(e).slice(0, 200) }));
}

export function registerDiagnosticsIpc(): void {
  handle('diagnostics:path', () => logPath());

  /** So she can attach it to a message without hunting through folders. */
  handle('diagnostics:reveal', () => { shell.showItemInFolder(logPath()); return true; });

  handle('diagnostics:tail', async (lines: number = 200) => {
    try {
      const text = await readFile(logPath(), 'utf8');
      return text.split('\n').slice(-lines).join('\n');
    } catch { return ''; }
  });
}
