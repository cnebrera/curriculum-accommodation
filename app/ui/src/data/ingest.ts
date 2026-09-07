import { useEffect } from 'react';
import { useAsync, useCommand, type Loadable } from './async.js';

export interface IngestProgress { stage: string; detail?: string; page?: number; of?: number }

/**
 * Reading a photograph, a PDF or a Word file (013 FR-1107).
 *
 * The domain with the most failure modes a teacher can actually cause — a photo
 * too dark, two worksheets in one frame, a service that cannot see images — and
 * each has its own `kind` and its own Spanish sentence. Routing them through
 * `useCommand` is what makes that map apply rather than merely exist.
 */
export function useIngestProgress(onProgress: (p: IngestProgress) => void): void {
  useEffect(() => window.rampa.ingest.onProgress(onProgress), [onProgress]);
}

/**
 * Extractions she started and has not finished confirming (`020` T007).
 *
 * Typed rather than `unknown` because two screens now read it — `Preparar` inside a
 * learner and her caseload — and «cuánto le falta» has to mean the same thing on both.
 *
 * `learner` is optional and stays optional: every job in every vault today has no such
 * field, so «nobody claimed this» is a normal answer and not a broken record. It is what
 * FR-1827's whole user story is about.
 */
export interface PendingIngest {
  jobId: string;
  pages: number;
  confirmed: number;
  source: string;
  learner?: string;
}

export function usePendingIngest(): Loadable<PendingIngest[]> {
  return useAsync(() => window.rampa.ingest.pending() as Promise<PendingIngest[]>, []);
}

/** Whose this half-finished job is, once she has said (`020` T027, FR-1827). */
export function useClaimIngest() {
  return useCommand((jobId: string, learner: string) =>
    window.rampa.ingest.claim(jobId, learner));
}

export function useAcceptedFormats(): Loadable<unknown> {
  return useAsync(() => window.rampa.ingest.accepted(), []);
}

export function useExtraction(jobId: string | null): Loadable<unknown> {
  return useAsync(() => (jobId ? window.rampa.ingest.extraction(jobId) : Promise.resolve(null)), [jobId]);
}

export function useBlocks(jobId: string | null): Loadable<unknown> {
  return useAsync(() => (jobId ? window.rampa.ingest.blocks(jobId) : Promise.resolve(null)), [jobId]);
}

export function usePageImage(jobId: string | null, page: number): Loadable<string | null> {
  return useAsync(
    () => (jobId ? window.rampa.ingest.pageImage(jobId, page) as Promise<string | null> : Promise.resolve(null)),
    [jobId, page],
  );
}

export function usePhotoWarningSeen(): Loadable<boolean> {
  return useAsync(() => window.rampa.ingest.photoWarningSeen() as Promise<boolean>, []);
}

/**
 * The verification screen re-reads all three after every confirmation, so it
 * needs functions it can sequence rather than hooks it has to invalidate.
 */
export function useExtractionCommand() {
  return useCommand((jobId: string) => window.rampa.ingest.extraction(jobId));
}

export function useBlocksCommand() {
  return useCommand((jobId: string) => window.rampa.ingest.blocks(jobId));
}

export function usePageImageCommand() {
  return useCommand((jobId: string, page: number) =>
    window.rampa.ingest.pageImage(jobId, page) as Promise<string | null>);
}

export function useChooseFiles() {
  return useCommand(() => window.rampa.ingest.choose() as Promise<string[] | null>);
}

export function useRunIngest() {
  return useCommand((jobId: string, paths: string[], forLearner?: string) =>
    window.rampa.ingest.run(jobId, paths, forLearner));
}

export function useIngestEstimate() {
  return useCommand((pageCount: number) => window.rampa.ingest.estimate(pageCount));
}

export function useCorrectAndConfirm() {
  return useCommand((jobId: string, page: number, corrections: Array<{ id: string; content: string }>) =>
    window.rampa.ingest.correctAndConfirm(jobId, page, corrections));
}

export function useUnconfirmPage() {
  return useCommand((jobId: string, page: number) => window.rampa.ingest.unconfirmPage(jobId, page));
}

export function useAcknowledgePhotoWarning() {
  return useCommand(() => window.rampa.ingest.acknowledgePhotoWarning());
}
