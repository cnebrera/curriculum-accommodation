import { useEffect, useState } from 'react';
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
  /** Composed and not yet adapted for this learner (`016` T006). */
  pending?: boolean;
  source: RecordSource;
  documents: {
    ir: string;
    /** Absent while a composed job is still unadapted. */
    adapted?: string;
    report?: string;
    /** A composed job's own two documents (`002`). */
    answers?: string;
    composeReport?: string;
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

/**
 * Which school years she has worked in, per learner (015 T004, over `014`).
 *
 * One hook for the whole caseload rather than one per learner: the filter needs
 * the answer for everybody before it can offer the years as options, and forty
 * separate hooks would be forty scans of the vault in an order nobody controls.
 *
 * Empty until it arrives, and the filter then offers no year — which is right.
 * Offering «2024-2025» before we know who it applies to produces a filter that
 * matches nobody and looks broken.
 */
export function useWorkedYears(codes: readonly string[]): Record<string, string[]> {
  const [years, setYears] = useState<Record<string, string[]>>({});
  // The identity of the request, not the array: a new array with the same codes
  // must not re-scan the vault.
  const key = [...codes].sort().join(',');

  useEffect(() => {
    if (codes.length === 0) { setYears({}); return; }
    let live = true;
    void Promise.all(codes.map(async (code) => {
      const entries = await window.rampa.record.forLearner(code) as Array<{ schoolYear: string }>;
      return [code, [...new Set(entries.map((e) => e.schoolYear).filter(Boolean))]] as [string, string[]];
    })).then((pairs) => { if (live) setYears(Object.fromEntries(pairs)); });
    return () => { live = false; };
  }, [key]);

  return years;
}
