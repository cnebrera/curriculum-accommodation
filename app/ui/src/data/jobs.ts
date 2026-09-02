import { useEffect } from 'react';
import { useAsync, useCommand, type Loadable } from './async.js';

export interface Progress {
  stage: string;
  detail?: string;
  /**
   * A real fraction, where the work knows its own size (`024` T012).
   *
   * Numbers rather than a sentence to parse. The pictogram download used to send
   * «3.140 de 13.802» in `detail` and nothing rendered it — the thirteenth field in
   * this project written by one place and read by nobody, and the one I had already
   * ticked off as done. `ui/test/props-are-read.test.ts` now fails if a field here
   * goes unread.
   */
  done?: number;
  total?: number;
}

/**
 * Adapting a worksheet (013 FR-1107).
 *
 * `useJobProgress` is a subscription rather than a fetch, and the unsubscribe is
 * the whole reason it exists as a hook: the raw `onProgress` returns a teardown
 * function that two screens returned from `useEffect` correctly and one dropped,
 * so its handler kept firing into an unmounted component after she navigated
 * away mid-adaptation.
 */
export function useJobProgress(onProgress: (p: Progress) => void): void {
  useEffect(() => window.rampa.job.onProgress(onProgress), [onProgress]);
}

export function useReportData(jobId: string | null, learner: string | null): Loadable<unknown> {
  return useAsync(
    () => (jobId && learner ? window.rampa.job.reportData(jobId, learner) : Promise.resolve(null)),
    [jobId, learner],
  );
}

export function useSignedOff(jobId: string | null, learner: string | null): Loadable<boolean> {
  return useAsync(
    () => (jobId && learner
      ? window.rampa.job.isSignedOff(jobId, learner) as Promise<boolean>
      : Promise.resolve(false)),
    [jobId, learner],
  );
}

/**
 * The review screen loads these inside its own effect, keyed on a job it is
 * handed rather than one it discovers, so it wants functions rather than hooks.
 */
export function useReportDataCommand() {
  return useCommand((jobId: string, learner: string) => window.rampa.job.reportData(jobId, learner));
}

export function useSignedOffCommand() {
  return useCommand((jobId: string, learner: string) =>
    window.rampa.job.isSignedOff(jobId, learner) as Promise<boolean>);
}

export function useCreateJob() {
  return useCommand((id: string, text: string, kind: string, lang?: string) =>
    window.rampa.job.create(id, text, kind, lang));
}

export function useVerifyJob() {
  return useCommand((id: string) => window.rampa.job.verify(id));
}

/** What one learner's adaptation produced. */
export interface AdaptResult {
  reportData?: unknown;
  notices?: Array<{ block: string | null; notice: { kind: string; quote: string; message: string } }>;
  recipes?: string[];
  retried?: boolean;
  costCents?: number;
}

export type LearnerOutcome =
  | { learner: string; ok: true; result: AdaptResult }
  | { learner: string; ok: false; kind: string; message: string };

export interface BatchOutcome { jobId: string; results: LearnerOutcome[] }

/**
 * Adapt one job for one or more learners (005 FR-501).
 *
 * The outcome is per learner and there is deliberately no "did the batch
 * succeed?" on it. A screen holding this cannot say "it failed" without saying
 * whose — which is FR-507 enforced by the type rather than by a reviewer
 * noticing.
 *
 * Note what does **not** happen here: `useCommand`'s `error` stays for the case
 * where the whole call could not be made at all. A learner failing is a value,
 * not an error, because the other two sheets are real and hers.
 */
export function useAdapt() {
  return useCommand((id: string, learners: string | string[]) =>
    window.rampa.job.adapt(id, learners) as Promise<BatchOutcome>);
}

/**
 * Sheets made from a reading that has since changed (005 T027, FR-520).
 *
 * The name is joined **here**, in the renderer, because this is where the name map
 * already lives (`013` FR-1107). The shell decides which sheets are stale and knows
 * only codes, so no part of that decision can put a child's name into a file.
 *
 * Fresh rows are dropped and the name map is not fetched at all when there is
 * nothing to say — the common case is a job whose sheets are all current, and
 * decrypting the roster to tell her nothing would be work done to say nothing.
 */
export interface StaleSheet {
  learner: string;
  name: string;
  freshness: 'stale' | 'unknown';
}

export function useStaleSheetsCommand() {
  return useCommand(async (jobId: string): Promise<StaleSheet[]> => {
    const rows = await window.rampa.job.staleSheets(jobId) as Array<
      { learner: string; freshness: 'fresh' | 'stale' | 'unknown' }>;
    const notFresh = rows.filter((r): r is { learner: string; freshness: 'stale' | 'unknown' } =>
      r.freshness !== 'fresh');
    if (notFresh.length === 0) return [];
    const names = await window.rampa.names.all() as Record<string, string>;
    return notFresh.map((r) => ({ ...r, name: names[r.learner] ?? r.learner }));
  });
}

/**
 * The document, for the viewer (`021` T014).
 *
 * A command rather than a hook keyed on the job, because the viewer is opened by an
 * action and closed again — a hook would fetch on every mount of the screen behind it.
 */
export function useDocumentHtml() {
  return useCommand((id: string, learner: string) =>
    window.rampa.job.documentHtml(id, learner) as Promise<string>);
}

/** The teacher's copy. Its own document — see the note in `sheet.ts`. */
export function useAnswerKeyHtml() {
  return useCommand((id: string) => window.rampa.job.answerKeyHtml(id) as Promise<string>);
}

export function useRevise() {
  return useCommand((id: string, learner: string, corrections: Array<{ text: string; scope: string }>) =>
    window.rampa.job.revise(id, learner, corrections) as Promise<{ reportData?: unknown; revision: number }>);
}

export function useRender() {
  return useCommand((id: string, learner: string) =>
    window.rampa.job.render(id, learner) as Promise<{ photocopy?: Array<{ message: string }> }>);
}

export function usePdf() {
  return useCommand((id: string, learner: string) =>
    window.rampa.job.pdf(id, learner) as Promise<string>);
}

/** The editable export (019 US1). */
export function useOdt() {
  return useCommand((id: string, learner: string) =>
    window.rampa.job.odt(id, learner) as Promise<string>);
}

/**
 * For listening (019 US2) and for a transcriber (US3).
 *
 * Neither produces audio or braille, and the names say so: `019` promises
 * audio-*ready*. `announced` comes back so the screen can show what could not be
 * read in order — buried in a text file she may hand to somebody else, that becomes
 * a thing only the learner discovers.
 */
export interface LinearExport {
  path: string;
  announced: Array<{ id: string; because: string }>;
}

export function useAudioReady() {
  return useCommand((id: string, learner: string) =>
    window.rampa.job.audio(id, learner) as Promise<LinearExport>);
}

export function useBrailleReady() {
  return useCommand((id: string, learner: string) =>
    window.rampa.job.brailleReady(id, learner) as Promise<LinearExport>);
}

export function useOpenForEditing() {
  return useCommand((id: string, learner: string) => window.rampa.job.openForEditing(id, learner));
}

/**
 * The signature. Principle VII: this is the only thing in the application that
 * can remove the draft mark, and it takes her role because the record has to say
 * who signed, not merely that someone did.
 */
export function useSignOff() {
  return useCommand((id: string, learner: string, role: string) =>
    window.rampa.job.signOff(id, learner, role));
}
