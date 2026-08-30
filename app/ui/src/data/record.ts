import { useAsync, useCommand, type Loadable } from './async.js';

/** Mirrors `packages/core/src/record/entry.ts`. */
export type RecordSource =
  | { of: 'file'; paths: string[] }
  | { of: 'pasted' }
  | { of: 'composed'; objectives: string[]; anchor?: string };

export interface RecordEntry {
  jobId: string;
  learner: string;
  date: string;
  schoolYear: string;
  kind: string;
  subject?: string;
  objectives?: string[];
  signedOff: boolean;
  revision: number;
  source: RecordSource;
  documents: {
    ir: string; adapted: string; report?: string;
    revisions: string[]; rendered: string[];
  };
  missing: string[];
}

/**
 * Everything ever made for one learner (014).
 *
 * Reading this writes nothing — not `record.md`, not a cache. FR-1215: a screen
 * that wrote a file every time it was opened would put a vault on OneDrive into
 * conflict from being looked at.
 */
export function useRecord(code: string | null): Loadable<RecordEntry[]> {
  return useAsync(
    () => (code ? window.rampa.record.forLearner(code) as Promise<RecordEntry[]> : Promise.resolve([])),
    [code],
  );
}

export function useRecordSearch() {
  return useCommand((q: {
    learner: string; schoolYear?: string; kind?: string; text?: string;
  }) => window.rampa.record.search(q) as Promise<RecordEntry[]>);
}

/** Regenerate `record.md` on demand — she deleted it, or wants it fresh. */
export function useRebuildRecord() {
  return useCommand((code: string) => window.rampa.record.rebuild(code) as Promise<string>);
}
