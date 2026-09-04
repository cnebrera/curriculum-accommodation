import type { ProposedExercise } from './verify/types.js';
import type { ProposedProblem } from './problems.js';

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

/**
 * The labelled block formats (027 T004, FR-2507,
 * `specs/027-examenes-y-problemas/contracts/proposal-formats.md`).
 *
 * ## Why the new kinds need their own wire format at all
 *
 * A word problem is unparseable under `expresión = resultado` **by construction** —
 * that one-line format is why «problemas» could be offered, charged for and not
 * produced. So each path gets its own format, and the one-liner stops being appended to
 * systems whose message asks for something else (the review's AGE-04).
 *
 * ## And the same intolerance
 *
 * These share `parseProposals`' rule exactly: tolerant of a fence, of list numbering and
 * of a trailing full stop — the punctuation whose absence would spend her money on a
 * retry — and **nothing else**. A block this half-understands is *no proposal*. A
 * guessed proposal reaches the verifier, which then checks the guess instead of what the
 * model said, and that is the one failure this layer exists to prevent.
 */

/** Split a body into label-headed blocks. `header` starts each one. */
function blocksOf(raw: string, header: RegExp): string[][] {
  const body = /```(?:\w+)?\s*([\s\S]*?)```/.exec(raw)?.[1] ?? raw;
  const out: string[][] = [];
  let current: string[] | null = null;
  for (const line of body.split(/\r?\n/)) {
    const clean = line.trim().replace(/^[-*•]\s*/, '').replace(/^\d+[.)]\s*/, '');
    if (header.test(clean)) { current = []; out.push(current); continue; }
    if (current) current.push(clean);
  }
  return out;
}

/**
 * `LABEL: value`, with the value running to the next label.
 *
 * Multi-line on purpose: a statement is prose and a model will wrap it. Joined with a
 * space rather than a newline — the statement reaches a block of IR, where a stray
 * newline is a paragraph break the child sees.
 */
function labelled(lines: readonly string[], labels: readonly string[]): Record<string, string> {
  const found: Record<string, string[]> = {};
  let at: string | null = null;
  for (const line of lines) {
    const m = /^([A-ZÁÉÍÓÚÑ]+)\s*:\s*(.*)$/.exec(line);
    if (m && labels.includes(m[1]!)) {
      at = m[1]!;
      found[at] = [m[2]!.trim()];
      continue;
    }
    if (at && line) found[at]!.push(line);
  }
  return Object.fromEntries(
    Object.entries(found).map(([k, v]) => [k, v.join(' ').trim()]));
}

/**
 * Problems: `PROBLEMA` / `ENUNCIADO` / `OPERACIÓN` / `RESULTADO`.
 *
 * `ENUNCIADO` is required — a block without one is no proposal. `OPERACIÓN` and
 * `RESULTADO` may be absent (a non-computable ask), and `verifyProblem` then answers
 * `unknown` rather than guessing an operation from the prose.
 */
export function parseProblemProposals(raw: string): ProposedProblem[] {
  const out: ProposedProblem[] = [];
  for (const lines of blocksOf(raw, /^PROBLEMA\b/i)) {
    const f = labelled(lines, ['ENUNCIADO', 'OPERACIÓN', 'OPERACION', 'RESULTADO']);
    const statement = f['ENUNCIADO'];
    if (!statement) continue;
    const expression = f['OPERACIÓN'] ?? f['OPERACION'];
    const statedAnswer = f['RESULTADO'];
    out.push({
      statement: statement.replace(/\.$/, '.').trim(),
      ...(expression ? { expression: strip(expression) } : {}),
      ...(statedAnswer ? { statedAnswer: strip(statedAnswer) } : {}),
    });
  }
  return out;
}

/** One proposed exam question, before anything believed it. */
export interface ProposedQuestion {
  /** The prompt, as the learner reads it. Carries no answer, ever. */
  text: string;
  /** Present for a computable question. */
  expression?: string;
  /** The model's answer. Reaches the key labelled unchecked, never the sheet. */
  statedAnswer?: string;
}

/**
 * Exam questions: `PREGUNTA` / `TEXTO` / `OPERACIÓN` / `RESULTADO`.
 *
 * `TEXTO` is required and is the only field that ever reaches the sheet. A question with
 * an `OPERACIÓN` is verified exactly as a problem; one without is carried
 * declared-unverified (research R3), which is why `RESULTADO` alone is not a reason to
 * drop the block.
 */
export function parseExamProposals(raw: string): ProposedQuestion[] {
  const out: ProposedQuestion[] = [];
  for (const lines of blocksOf(raw, /^PREGUNTA\b/i)) {
    const f = labelled(lines, ['TEXTO', 'OPERACIÓN', 'OPERACION', 'RESULTADO']);
    const text = f['TEXTO'];
    if (!text) continue;
    const expression = f['OPERACIÓN'] ?? f['OPERACION'];
    const statedAnswer = f['RESULTADO'];
    out.push({
      text: text.trim(),
      ...(expression ? { expression: strip(expression) } : {}),
      ...(statedAnswer ? { statedAnswer: strip(statedAnswer) } : {}),
    });
  }
  return out;
}

/** A trailing full stop on a number or an expression is punctuation, not content. */
const strip = (s: string): string => s.trim().replace(/\.$/, '');
