import { useCommand } from './async.js';

/**
 * Composing, from the renderer (016 T005).
 *
 * Through `useCommand` like every other call, so a failure lands as a sentence in
 * her language rather than as a rejected promise nobody catches — `013`'s data
 * layer exists because three screens had each written their own version of that
 * and one of them swallowed the error.
 */

export interface ComposeRequest {
  learnerCode: string;
  objectives: string[];
  perObjective?: number;
  title?: string;
  /** Required the moment an objective is content (`002` FR-102). */
  anchor?: string;
  /**
   * What kind of material she wants (`021` FR-1907).
   *
   * Required by the handler and never defaulted — the same refusal `job:create` makes
   * for pasted material, because a defaulted «ficha» is how an exam gets treated as a
   * worksheet before the model ever sees it.
   */
  kind: string;
}

export interface AnswerLine {
  objective: string;
  number: number;
  expression: string;
  answer: string;
}

export interface ComposeResult {
  jobId: string;
  ir: string;
  answersPath: string;
  report: string;
  reportData: { unchecked: string[]; checked: string[]; shortfalls: string[] };
  answers: AnswerLine[];
  /** Objectives that are content and need an anchor she has not given. */
  needsAnchor: string[];
  /** Objectives nothing could check (`002` FR-125). */
  unverifiedObjectives: string[];
  /** The sentence itself, so this screen does not write its own version. */
  unverifiedNotice: string | null;
  cutObjectives: string[];
  anchorNotices: Array<{ passage: string; notice: { kind: string; quote: string; message: string } }>;
  anchorCut: { chars: number; passages: number };
  costCents: number;
}

export function useCompose() {
  return useCommand((jobId: string, request: ComposeRequest) =>
    window.rampa.job.compose(jobId, request) as Promise<ComposeResult>);
}

/** The key and the report, read back from the vault (survives a restart). */
export function useComposeDocs() {
  return useCommand((jobId: string) =>
    window.rampa.job.composeDocs(jobId) as Promise<{ answers: string | null; report: string | null }>);
}

/**
 * Correcting composed material (`021` T026).
 *
 * Separate from `useRevise` on purpose: that one adapts, this one composes again and
 * regenerates the verified answer key with it.
 */
export function useCorrectComposition() {
  return useCommand((id: string, corrections: string[]) =>
    window.rampa.job.correctComposition(id, corrections) as Promise<ComposeResult>);
}
