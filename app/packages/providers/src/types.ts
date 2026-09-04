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

export interface Chunk {
  text?: string;
  usage?: Usage;
  /**
   * The answer stopped because it hit the token ceiling (review AGE-07).
   *
   * **Nobody read this before**, because nobody produced it: `anthropic.ts` and
   * `compatible.ts` both set `max_tokens` and neither looked at `stop_reason` or
   * `finish_reason`. For the arithmetic path the cost is small — a truncated line
   * is one fewer proposal. For the **content** path it is the failure the `study`
   * kind exists to name: `material-kinds.md` says its own failure mode is
   * «teaching less without it showing», and a text cut off at 4.000 tokens mid-way
   * through an objective leaves blocks that still carry a valid `data-objective`
   * and `data-anchor`, so both checks pass and it goes on the sheet.
   *
   * The review was conservative about the net, too: `checkObjectives` emits
   * `unknown-objective`, `no-objective` and `no-blocks` — it never checks that each
   * objective *asked for* has blocks. A cut that removed a whole objective's blocks
   * would pass as well, as long as something was generated.
   *
   * A boolean and not a reason string: the only question a caller has is «is this
   * answer complete», and a provider-specific enum would be a second vocabulary to
   * map. Absent means «the provider did not say», which is not the same as `false`
   * — and callers treat it as «no evidence of truncation» rather than as proof of
   * completeness.
   */
  truncated?: boolean;
}

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
  /**
   * What that call cost, or **null when nobody knows** (`costCents`, 2026-09-01).
   *
   * The price table covers four models and the catalogue offers six services, so most
   * adapters legitimately cannot answer — and the old fallback quoted Claude's prices for
   * whatever she had connected, including free ones.
   */
  price(usage: Usage): Cents | null;
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
