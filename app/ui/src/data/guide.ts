import { useCommand } from './async.js';

/**
 * The adaptación curricular, from the renderer (017).
 *
 * **No `ingest` here on purpose.** A guide comes in through `job:ingest` and through
 * `008`'s per-page verification gate, unchanged — a second path would be the pipeline
 * Principle IV forbids, and the document where a misreading matters most would be the
 * one nobody had checked.
 */

export interface Measure {
  text: string;
  source: string;
  actionable: boolean;
}

export interface GuideRead {
  jobId: string;
  measures: Measure[];
  /** What was deliberately left out, in her words. Never a count. */
  omitted: string[];
  missingSections: string[];
  kind: 'acns' | 'acs' | 'unknown';
  costCents: number;
  notices: Array<{ block: string | null; notice: { kind: string; quote: string; message: string } }>;
}

export interface AcnsDraft {
  markdown: string;
  /** Sections Rampa could not source, named rather than filled. */
  missing: string[];
  sources: string[];
}

export function useReadGuide() {
  return useCommand((jobId: string) => window.rampa.guide.read(jobId) as Promise<GuideRead>);
}

/** The measures **she confirmed**, which may be fewer than the ones read. */
export function useApplyGuide() {
  return useCommand((learner: string, measures: Measure[], document: string, omitted?: string[]) =>
    window.rampa.guide.apply(learner, measures, document, omitted) as Promise<{ path: string; written: number }>);
}

export function useDraftAcns() {
  return useCommand((learner: string) => window.rampa.guide.acns(learner) as Promise<AcnsDraft>);
}

export interface Turn { question: string; answer: string }

export function useAskGuide() {
  return useCommand((jobId: string, question: string, history?: Turn[]) =>
    window.rampa.guide.ask(jobId, question, history) as Promise<
      { answer: string; declined: boolean; costCents: number }>);
}

export function useHelpWithAcs() {
  return useCommand((learner: string, evaluationRecorded: boolean, decided: string) =>
    window.rampa.guide.acs(learner, evaluationRecorded, decided) as Promise<
      { answer: string; declined: boolean; costCents: number }>);
}
