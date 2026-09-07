import { app, shell } from 'electron';
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { logger, formatLine, type LogRecord } from '@rampa/core';
import { handle } from './wrap.js';
import { networkLog } from '../net-counter.js';
import { logFileIn, rotateIfLarge } from '../log-file.js';

/**
 * The log lives in the OS application-data directory, NOT in the vault.
 *
 * It is a diagnostic, not part of her records: it must not travel with a
 * handover packet, must not be copied by a vault backup, and must not appear
 * in a folder she is encouraged to share. And per @rampa/core's log module, it
 * never contains a learner's name, her material, or anything that could
 * reproduce them.
 */
/*
 * Where it lives and what bounds it are `../log-file.ts` since `036` T003a — extracted
 * **unchanged**, taking the directory as an argument, so FR-3402 and FR-3403 can be
 * asserted behaviourally instead of by reading source text. Eighth time the
 * Electron-surface bound has produced that move.
 */
const logPath = () => logFileIn(app.getPath('userData'));

export async function startLogging(): Promise<void> {
  const path = logPath();
  /*
   * **Setting up the log may never stop the application starting** (`036` FR-3405).
   *
   * This was `await mkdir(...)` unguarded, and `main.ts` calls `startLogging()` as the
   * first thing inside `whenReady` — so a locked profile, a full disk or a school-issued
   * read-only folder aborted the whole startup chain. **No window at all.** Found by
   * `036` T017 on its first run: the requirement said «a failure to write the log MUST
   * NOT break, block or interrupt anything», and the one place it was not honoured was
   * the place that costs everything.
   *
   * The file's own rule was already written for the sink — «never break the app for a
   * log» — and the setup path had no such guard. Same rule, the other half.
   */
  const ready = await mkdir(dirname(path), { recursive: true })
    .then(() => true).catch(() => false);
  if (ready) await rotateIfLarge(path);

  logger.setLevel(app.isPackaged ? 'info' : 'debug');
  // The sink is installed either way: `appendFile` swallows its own failure, so a log
  // directory that appears later starts working without a restart. Installing it only
  // when `ready` would make a transient failure permanent.
  logger.addSink((r: LogRecord) => { void appendFile(path, formatLine(r) + '\n', 'utf8').catch(() => { /* never break the app for a log */ }); });
  if (!app.isPackaged) logger.addSink((r) => { process.stdout.write(formatLine(r) + '\n'); });

  logger.info('app.started', { version: app.getVersion(), platform: process.platform, packaged: app.isPackaged });

  // An unhandled failure is the one a teacher will report, so it must be in the file.
  process.on('uncaughtException', (e) => logger.error('uncaught', { message: e.message.slice(0, 200) }));
  process.on('unhandledRejection', (e) => logger.error('unhandled-rejection', { message: String(e).slice(0, 200) }));
}

export function registerDiagnosticsIpc(): void {
  handle('diagnostics:path', () => logPath());

  /**
   * Every request this process has made, under test only (`035` SC-3302).
   *
   * Read back over a channel rather than asserted inside the main process, because what
   * the test needs to say is «zero, across a whole rehearsal» — a claim about a span of
   * time that only the test knows the boundaries of.
   *
   * Outside `RAMPA_TEST` the counter was never installed, so this answers `null`: an
   * absent counter and a counter reading zero are different facts, and a shipped build
   * reporting «0 requests» would be the more comforting of the two and the false one.
   */
  handle('diagnostics:network', () =>
    (process.env['RAMPA_TEST'] === '1' ? networkLog() : null));

  /** So she can attach it to a message without hunting through folders. */
  handle('diagnostics:reveal', () => { shell.showItemInFolder(logPath()); return true; });

  handle('diagnostics:tail', async (lines: number = 200) => {
    try {
      const text = await readFile(logPath(), 'utf8');
      return text.split('\n').slice(-lines).join('\n');
    } catch { return ''; }
  });
}
