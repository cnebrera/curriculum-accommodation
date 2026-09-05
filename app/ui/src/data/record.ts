import type { DocumentFreshness } from '../../../packages/core/src/ir/freshness.js';
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
  /**
   * Both axes of freshness (`031` FR-2901): the reading it was made from, and the
   * drawings it used.
   *
   * **Imported from `core` rather than restated here**, and that took a defect to
   * learn. This file declared `'fresh' | 'stale' | 'unknown'` by hand, so when `031`
   * changed `RecordEntry.freshness` in core the compiler said nothing — the whole
   * argument for changing the type instead of adding a field was «the compiler finds
   * every reader», and a restatement is exactly what stops it doing that.
   *
   * `unknown` on either axis is honest and not a fault: it is every sheet made before
   * Rampa recorded that fact.
   */
  freshness?: DocumentFreshness;
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
export interface CaseloadFacts {
  /** School years she has worked in with this learner, for the filter. */
  years: string[];
  /**
   * How many pieces of work she has made for him (`022`… no: from use, 2026-09-01).
   *
   * A count of **her work**, never of him. `015` FR-1311 forbids a total that summarises
   * a learner, and `014` draws the same line: the record lists work and never the child.
   * «Le he preparado tres cosas» is a fact about her month; «necesita tres veces más que
   * los demás» is a claim about a nine-year-old, and this must never read as the second.
   *
   * Which is also why it is here rather than in the profile: it is derived from what is
   * in her folder, and it changes when she works, not when he does.
   */
  made: number;
}

export function useCaseloadFacts(codes: readonly string[]): Record<string, CaseloadFacts> {
  const [facts, setFacts] = useState<Record<string, CaseloadFacts>>({});
  // The identity of the request, not the array: a new array with the same codes
  // must not re-scan the vault.
  const key = [...codes].sort().join(',');

  useEffect(() => {
    if (codes.length === 0) { setFacts({}); return; }
    let live = true;
    void Promise.all(codes.map(async (code) => {
      const entries = await window.rampa.record.forLearner(code) as Array<{ schoolYear: string }>;
      // One scan, both answers: the years were already being read here and the count
      // was in the same array all along.
      return [code, {
        years: [...new Set(entries.map((e) => e.schoolYear).filter(Boolean))],
        made: entries.length,
      }] as [string, CaseloadFacts];
    })).then((pairs) => { if (live) setFacts(Object.fromEntries(pairs)); });
    return () => { live = false; };
  }, [key]);

  return facts;
}
