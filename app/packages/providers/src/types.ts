import type { Usage } from '@rampa/core';

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

export class ProviderError extends Error {
  constructor(
    readonly kind: 'offline' | 'rate-limited' | 'key-invalid' | 'key-no-credit' | 'provider-failed',
    message: string,
    readonly retryAfterSeconds?: number,
  ) { super(message); this.name = 'ProviderError'; }
}
