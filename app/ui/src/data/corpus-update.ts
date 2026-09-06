import { useAsync, useCommand, type Loadable } from './async.js';

/**
 * El criterio pedagógico, desde el renderer (`034` US2/US3).
 *
 * Two commands and one query, and the split is the feature: `look` connects and stages,
 * `accept` is what makes it govern. Nothing here can make the second happen as a side
 * effect of the first.
 */

export interface CorpusOffer {
  version: number;
  summary: string;
  /** Paths whose content differs from what governs now. «Qué cambia». */
  changed: string[];
  /** Files one of her own recipes shadows (FR-3209). Hers keeps winning. */
  conflicts: string[];
  /** Instruction-shaped text found in the files, quoted and located (FR-3211). */
  findings: Array<{ file: string; line: number; quote: string; why: string }>;
}

export interface CorpusUpdateState {
  version: number;
  source: 'bundled' | 'update';
  /** Why it is this one, when something was passed over. */
  because: 'incomplete' | 'unsupported' | 'superseded-by-bundled' | null;
  accepted: number[];
  history: Array<{ at: string; to: number | 'bundled'; act: string }>;
  offered: CorpusOffer | null;
}

export function useCorpusUpdateState(): Loadable<CorpusUpdateState> {
  return useAsync(
    () => window.rampa.corpusUpdate.state() as Promise<CorpusUpdateState>, []);
}

export type LookResult =
  | ({ of: 'offer' } & CorpusOffer)
  | { of: 'none' }
  | { of: 'refused'; say: string };

export function useLookForCorpus() {
  return useCommand(() => window.rampa.corpusUpdate.look() as Promise<LookResult>);
}

/** One file, before and after — so «enséñamelo entero» is a gesture and not a promise. */
export function useCorpusFile() {
  return useCommand((path: string) => window.rampa.corpusUpdate.file(path) as
    Promise<{ path: string; now: string | null; next: string | null } | null>);
}

export function useAcceptCorpus() {
  return useCommand(() => window.rampa.corpusUpdate.accept() as
    Promise<{ ok: boolean; version?: number }>);
}

export function useDeclineCorpus() {
  return useCommand(() => window.rampa.corpusUpdate.decline() as Promise<{ ok: boolean }>);
}

export function useRevertCorpus() {
  return useCommand((version: number | null) =>
    window.rampa.corpusUpdate.revert(version) as Promise<{ ok: boolean }>);
}
