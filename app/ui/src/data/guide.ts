import { useAsync, useCommand, type Loadable } from './async.js';

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
  costCents: number | null;
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
  return useCommand((
    learner: string, measures: Measure[], document: string,
    omitted?: string[], kind?: 'acns' | 'acs',
  ) =>
    window.rampa.guide.apply(learner, measures, document, omitted, kind) as
      Promise<{ path: string; written: number }>);
}

export function useDraftAcns() {
  return useCommand((learner: string) => window.rampa.guide.acns(learner) as Promise<AcnsDraft>);
}

/**
 * The ACNS as a document (FR-1516, decision P46).
 *
 * `useDraftAcns` above stays what it was — a **preview that writes nothing**, so the
 * gaps and the sources can be read before she decides to keep it. These four are the
 * document: saved, read back, printed, signed.
 */
export interface SavedAcns {
  path: string;
  markdown: string;
  missing: string[];
  sources: string[];
  /** Set when a **signed** one was moved aside rather than overwritten. */
  kept?: string;
}

export function useSaveAcns() {
  return useCommand((learner: string) =>
    window.rampa.guide.acnsSave(learner) as Promise<SavedAcns>);
}

/** What is in her folder right now, or `null`. Reloadable, because signing changes it. */
export function useStoredAcns(learner: string): Loadable<{ markdown: string; signed: boolean } | null> {
  return useAsync(
    () => window.rampa.guide.acnsRead(learner) as Promise<{ markdown: string; signed: boolean } | null>,
    [learner]);
}

export function useAcnsHtml() {
  return useCommand((learner: string) => window.rampa.guide.acnsHtml(learner) as Promise<string>);
}

export function useAcnsPdf() {
  return useCommand((learner: string) => window.rampa.guide.acnsPdf(learner) as Promise<string>);
}

/** The signature, and the only thing that takes the draft mark off. */
export function useSignOffAcns() {
  return useCommand((learner: string, role: string) =>
    window.rampa.guide.acnsSignOff(learner, role) as Promise<{ signed: true; date: string }>);
}

export interface Turn { question: string; answer: string }

export function useAskGuide() {
  return useCommand((jobId: string, question: string, history?: Turn[]) =>
    window.rampa.guide.ask(jobId, question, history) as Promise<
      { answer: string; declined: boolean; costCents: number | null }>);
}

export function useHelpWithAcs() {
  return useCommand((learner: string, evaluationRecorded: boolean, decided: string) =>
    window.rampa.guide.acs(learner, evaluationRecorded, decided) as Promise<
      { answer: string; declined: boolean; costCents: number | null }>);
}
