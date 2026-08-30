import { useEffect } from 'react';
import { useAsync, useCommand, type Loadable } from './async.js';

export interface Progress { stage: string; detail?: string }

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
  return useCommand((id: string, text: string, lang?: string) =>
    window.rampa.job.create(id, text, lang));
}

export function useVerifyJob() {
  return useCommand((id: string) => window.rampa.job.verify(id));
}

export function useAdapt() {
  return useCommand((id: string, learner: string) => window.rampa.job.adapt(id, learner) as Promise<{
    reportData?: unknown;
    notices?: Array<{ block: string | null; notice: { kind: string; quote: string; message: string } }>;
    recipes?: string[];
    retried?: boolean;
    costCents?: number;
  }>);
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
