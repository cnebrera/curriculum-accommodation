# Contract — provider adapter

The only interface in the system permitted to reach the network. Adding a
provider must be one file.

```ts
export interface Provider {
  readonly id: string;              // "anthropic" | "google" | ...
  readonly label: string;           // shown to the teacher
  readonly keyUrl: string;          // deep link for onboarding (FR-403)
  readonly requiresPaymentCard: boolean;   // drives the no-card path (FR-404)

  validateKey(key: string): Promise<KeyStatus>;
  capabilities(): Promise<{ vision: boolean; maxInputTokens: number }>;
  send(req: Request): AsyncIterable<Chunk>;
  price(usage: Usage): Cents;
}
```

## Rules

1. **Every payload passes the redaction chokepoint before reaching an adapter.**
   Adapters never redact and never see an unredacted payload; the invariant is
   testable at one call site (`007` FR-510).
2. Adapters are stateless. Keys arrive per call from the shell's credential
   store, never read from disk by the adapter.
3. `validateKey` distinguishes *wrong provider*, *malformed*, *expired* and *no
   credit* — "invalid" is not an acceptable answer to a teacher (spec Edge Cases).
4. Errors surface as typed domain errors, never as status codes. The UI maps them
   to plain language.
5. Rate limits are a wait, not a failure. The free-tier path makes this the normal
   case, not the exception.
6. No adapter may be imported from `packages/core`. Enforced in CI (R2).
