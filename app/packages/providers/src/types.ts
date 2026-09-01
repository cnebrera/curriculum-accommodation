import { RampaError, type Usage } from '@rampa/core';

/** Per contracts/provider-adapter.md. Adding a provider must be one file. */
export type Cents = number;

export interface KeyStatus {
  ok: boolean;
  /** "invalid" is not an acceptable answer to a teacher (006 Edge Cases). */
  reason?: 'malformed' | 'wrong-provider' | 'expired' | 'no-credit' | 'network' | 'unknown';
  message?: string;
}

export interface Capabilities { vision: boolean; maxInputTokens: number; }

export interface Request {
  system: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  images?: Array<{ mediaType: string; base64: string }>;
  maxTokens?: number;
  model?: string;
}

export interface Chunk { text?: string; usage?: Usage; }

export interface Provider {
  readonly id: string;
  readonly label: string;
  /** Deep link straight to the key page, for onboarding (006 FR-403). */
  readonly keyUrl: string;
  /** Drives the no-payment-card path (006 FR-404). */
  readonly requiresPaymentCard: boolean;
  readonly defaultModel: string;

  validateKey(key: string): Promise<KeyStatus>;
  capabilities(): Promise<Capabilities>;
  send(req: Request, key: string): AsyncIterable<Chunk>;
  price(usage: Usage): Cents;
}

/** What an adapter can fail with. Every one of these is a member of core's `ErrorKind`. */
export type ProviderErrorKind =
  | 'offline' | 'rate-limited' | 'key-invalid' | 'key-no-credit'
  | 'provider-failed' | 'provider-model-gone';

/**
 * A provider failure, and **a `RampaError`** — which it was not until 2026-09-01.
 *
 * ## Why the inheritance is the whole point
 *
 * This was its own class, unrelated to `RampaError`, and the consequence reached a
 * teacher: `ipc/wrap.ts` asks `isRampaError(e)` to decide what to log and `toWire`
 * asks the same question to decide whether to encode the kind into the message. Both
 * answered no, so every provider failure crossed the IPC boundary anonymous and the
 * interface fell through to «Algo ha ido mal. No he perdido nada de lo tuyo.»
 *
 * Which means the five Spanish sentences `es.ts` carries for exactly these
 * situations — «El servicio está ocupado. No es culpa tuya», «La clave ya no vale»,
 * «La clave es correcta pero la cuenta no tiene saldo» — could never be seen. They
 * were written, reviewed, and unreachable.
 *
 * Found by Carlos running the application: Google answered 404 and he read the
 * catch-all. The log knew the truth and the screen did not, which is the wrong way
 * round — he is the one who can act on it.
 *
 * The comment in `core/src/errors.ts` describes this failure and says it was fixed.
 * It was fixed for one of the two error hierarchies, because there were two.
 */
export class ProviderError extends RampaError {
  constructor(
    override readonly kind: ProviderErrorKind,
    message: string,
    readonly retryAfterSeconds?: number,
  ) { super(kind, message); this.name = 'ProviderError'; }
}
