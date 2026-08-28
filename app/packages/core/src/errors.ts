/**
 * Domain errors. Never a status code, never a stack trace in front of a teacher
 * (006 FR-423). The UI maps each `kind` to a sentence in her language.
 */
export type ErrorKind =
  | 'vault-path-escape'      // a path tried to leave the vault
  | 'vault-unreadable'
  | 'ir-unverified'          // adaptation attempted before human verification
  | 'ir-no-provenance'       // a changed block with nothing justifying it
  | 'render-learner-data'    // learner data reached learner-facing output
  | 'render-undescribed'     // an essential figure with no description
  | 'input-too-large'
  | 'key-missing' | 'key-invalid' | 'key-wrong-provider' | 'key-no-credit'
  | 'offline' | 'rate-limited' | 'provider-failed';

export class RampaError extends Error {
  constructor(readonly kind: ErrorKind, message: string, readonly detail?: unknown) {
    super(message);
    this.name = 'RampaError';
  }
}

export const isRampaError = (e: unknown): e is RampaError => e instanceof RampaError;
