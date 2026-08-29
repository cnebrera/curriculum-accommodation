/**
 * Domain errors. Never a status code, never a stack trace in front of a teacher
 * (006 FR-423). The UI maps each `kind` to a sentence in her language.
 */
export type ErrorKind =
  | 'vault-path-escape'      // a path tried to leave the vault
  | 'vault-unreadable'
  | 'ir-unverified'          // adaptation attempted before human verification
  | 'ir-no-provenance'       // a changed block with nothing justifying it
  | 'output-incomplete'      // truncated, or content gone without being declared
  | 'name-unconfirmed'       // a probable name in her own notes, not yet resolved
  | 'corpus-missing'         // the bundled recipes are not there: broken install
  | 'render-learner-data'    // learner data reached learner-facing output
  | 'render-undescribed'     // an essential figure with no description
  | 'input-too-large'
  | 'ingest-empty'           // nothing dropped
  | 'ingest-format'          // a file type we cannot read, or a mixed drop
  | 'ingest-unusable'        // a photo too dark or too small to be worth a call
  | 'ingest-many-sheets'     // two worksheets in one image; she splits, we never do
  | 'ingest-no-vision'       // her service cannot read photographs
  | 'ingest-failed'          // the bound was exhausted on a page
  | 'key-missing' | 'key-invalid' | 'key-wrong-provider' | 'key-no-credit'
  | 'offline' | 'rate-limited' | 'provider-failed';

export class RampaError extends Error {
  constructor(readonly kind: ErrorKind, message: string, readonly detail?: unknown) {
    super(message);
    this.name = 'RampaError';
  }
}

export const isRampaError = (e: unknown): e is RampaError => e instanceof RampaError;

/**
 * Electron serialises an Error across IPC into a string, which loses `kind` —
 * and the interface maps kind to a Spanish sentence, so without this the mapping
 * silently never matched and every failure fell through to "algo ha ido mal".
 *
 * Encoding the kind into the message keeps one channel and survives the round
 * trip through any Electron version.
 */
const WIRE = /^\[rampa:([a-z-]+)\]\s*/;

export const toWire = (e: unknown): Error => {
  if (isRampaError(e)) return new Error(`[rampa:${e.kind}] ${e.message}`);
  return e instanceof Error ? e : new Error(String(e));
};

export interface WireError { kind: ErrorKind | 'unknown'; message: string }

export function fromWire(e: unknown): WireError {
  const raw = e instanceof Error ? e.message : String(e);
  // Electron prefixes "Error invoking remote method 'x':" — strip it first.
  const cleaned = raw.replace(/^Error invoking remote method '[^']*':\s*/, '')
                     .replace(/^Error:\s*/, '');
  const m = WIRE.exec(cleaned);
  if (m) return { kind: m[1] as ErrorKind, message: cleaned.slice(m[0].length) };
  return { kind: 'unknown', message: cleaned };
}
