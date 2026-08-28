/**
 * Diagnostics.
 *
 * A teacher cannot read a stack trace and will not open a terminal, so when
 * something goes wrong the only way anyone finds out what happened is a file she
 * can attach to a message. That file therefore has one hard rule:
 *
 *   **A log line may never contain learner data, her material, or a name.**
 *
 * Codes, error kinds, counts, durations and file paths relative to the vault.
 * Nothing else. A diagnostic that leaks a child's worksheet is worse than no
 * diagnostic, and this is the one place where the temptation to "just include
 * the payload for debugging" is strongest.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogRecord {
  at: string;
  level: LogLevel;
  event: string;
  /** Only values that cannot identify a learner or reproduce her material. */
  data?: Record<string, string | number | boolean | null>;
}

export type LogSink = (r: LogRecord) => void;

/** Values that may never appear in a log, whatever the caller passes. */
const FORBIDDEN_KEYS = /^(name|nombre|content|contenido|text|texto|body|payload|prompt|material|quote|source)$/i;

/** Long free text is material until proven otherwise. */
const looksLikeContent = (v: unknown): boolean => typeof v === 'string' && v.length > 120;

export function sanitise(data: Record<string, unknown> | undefined): LogRecord['data'] {
  if (!data) return undefined;
  const out: NonNullable<LogRecord['data']> = {};
  for (const [k, v] of Object.entries(data)) {
    if (FORBIDDEN_KEYS.test(k)) { out[k] = '[omitido]'; continue; }
    if (looksLikeContent(v)) { out[k] = `[${(v as string).length} caracteres]`; continue; }
    if (v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') out[k] = v;
    else out[k] = String(v).slice(0, 60);
  }
  return out;
}

export class Logger {
  private sinks: LogSink[] = [];
  constructor(private minLevel: LogLevel = 'info') {}

  addSink(s: LogSink): void { this.sinks.push(s); }
  setLevel(l: LogLevel): void { this.minLevel = l; }

  private enabled(l: LogLevel): boolean {
    const order: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return order.indexOf(l) >= order.indexOf(this.minLevel);
  }

  log(level: LogLevel, event: string, data?: Record<string, unknown>): void {
    if (!this.enabled(level)) return;
    const record: LogRecord = { at: new Date().toISOString(), level, event, data: sanitise(data) };
    for (const s of this.sinks) { try { s(record); } catch { /* a broken sink must never break the app */ } }
  }

  debug(e: string, d?: Record<string, unknown>): void { this.log('debug', e, d); }
  info(e: string, d?: Record<string, unknown>): void { this.log('info', e, d); }
  warn(e: string, d?: Record<string, unknown>): void { this.log('warn', e, d); }
  error(e: string, d?: Record<string, unknown>): void { this.log('error', e, d); }
}

export const logger = new Logger();

export const formatLine = (r: LogRecord): string =>
  `${r.at} ${r.level.toUpperCase().padEnd(5)} ${r.event}` +
  (r.data && Object.keys(r.data).length ? ` ${JSON.stringify(r.data)}` : '');
