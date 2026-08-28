import { redact, isClean, logger } from '@rampa/core';
import type { Provider, Request, Chunk } from './types.js';
import { runWithResilience, type Attempt, type RunOptions } from './resilience.js';

/**
 * The egress chokepoint.
 *
 * Every payload passes through here before any adapter is reached, so the
 * redaction invariant is testable at one call site rather than trusted across
 * many (007 FR-510). Adapters never redact and never see an unredacted payload.
 *
 * This is the mechanism behind the only promise an application can keep that
 * the harness could not: the teacher types "Lucía" because that is how she
 * thinks, and the model never sees it.
 */
export type { Attempt };

export interface EgressResult {
  stream: AsyncIterable<Chunk>;
  /** Probable names we do not know. The teacher is asked; nothing is rewritten. */
  flagged: string[];
  replaced: Record<string, number>;
}

export class RedactionBreach extends Error {
  constructor(message: string) { super(message); this.name = 'RedactionBreach'; }
}

function redactRequest(req: Request, known: ReadonlyMap<string, string>) {
  const flagged = new Set<string>();
  const replaced: Record<string, number> = {};

  const pass = (s: string) => {
    const r = redact(s, known);
    for (const f of r.flagged) flagged.add(f);
    for (const [code, n] of Object.entries(r.replaced)) replaced[code] = (replaced[code] ?? 0) + n;
    return r.text;
  };

  const out: Request = {
    ...req,
    system: pass(req.system),
    messages: req.messages.map((m) => ({ ...m, content: pass(m.content) })),
  };
  return { out, flagged: [...flagged], replaced };
}

/**
 * Send through a provider. Nothing else in the application may call an adapter
 * directly — that is what makes the guarantee checkable.
 */
export function sendRedacted(
  provider: Provider,
  req: Request,
  key: string,
  knownNames: ReadonlyMap<string, string>,
  opts: RunOptions = {},
): EgressResult {
  const { out, flagged, replaced } = redactRequest(req, knownNames);

  // Belt and braces: if a known name survived redaction, refuse to send. A
  // silent leak here is the failure this whole layer exists to prevent.
  const payload = [out.system, ...out.messages.map((m) => m.content)].join('\n');
  if (!isClean(payload, knownNames)) {
    throw new RedactionBreach(
      'Un nombre sobrevivió a la sustitución y no he enviado nada. Es un fallo del programa, no tuyo.',
    );
  }

  logger.info('egress.sending', {
    provider: provider.id,
    namesReplaced: Object.values(replaced).reduce((a, b) => a + b, 0),
    flaggedCount: flagged.length,
    chars: payload.length,
  });

  return { stream: runWithResilience(() => provider.send(out, key), opts), flagged, replaced };
}
