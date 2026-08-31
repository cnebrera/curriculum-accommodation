import type { ProposedExercise } from './verify/types.js';

/**
 * A model's answer, parsed into proposals (002 T011).
 *
 * In the core rather than in the job for the same reason the loop is: this is
 * deterministic text handling with no provider in it, and it is the step where a
 * lenient parser would do real damage — a line it half-understands must become
 * **no proposal**, never a guessed one. A guessed expression goes to the verifier,
 * which checks the guess rather than what the model said.
 */
/**
 * `expresión = resultado`, one per line.
 *
 * Tolerant of a fence, a number in front and a full stop after, for the same
 * reason `parseJsonish` is: burning a retry on punctuation spends her money on
 * formatting. Anything past that is not parsed into a guess — an unparseable line
 * is simply not a proposal, and the loop's budget handles it.
 */
export function parseProposals(raw: string): ProposedExercise[] {
  const body = /```(?:\w+)?\s*([\s\S]*?)```/.exec(raw)?.[1] ?? raw;
  const out: ProposedExercise[] = [];

  for (const line of body.split(/\r?\n/)) {
    const clean = line.trim().replace(/^[-*•]\s*/, '').replace(/^\d+[.)]\s*/, '');
    if (!clean) continue;
    const m = /^(.+?)=\s*([-\d.,\s]+)\.?$/.exec(clean);
    if (!m) continue;
    const expression = m[1]!.trim();
    const statedAnswer = m[2]!.trim();
    if (!expression || !statedAnswer) continue;
    out.push({ expression, statedAnswer });
  }

  return out;
}
