import { useAsync, useCommand, type Loadable } from './async.js';
import type { StructureKind } from '../../../packages/core/src/structure/build.js';
import type { Match } from '../../../packages/core/src/pictograms/match.js';

/**
 * Structure material (`028`): agendas, sequences, social stories.
 *
 * The types come from `core` rather than being restated here — `028` had to fix exactly
 * that mistake in `data/record.ts`, where a hand-written copy with a «mirrors core»
 * comment went silently stale the moment core gained a case.
 */
export type { Match, StructureKind };

export interface SavedStructure {
  jobId: string;
  path: string;
  /** Words that got no drawing, so the screen can offer the chooser (FR-2606). */
  gaps: Match[];
}

export function useSaveStructure() {
  return useCommand((args: {
    jobId: string;
    learnerCode: string;
    kind: StructureKind;
    title?: string;
    items: Array<{ word: string; label?: string }>;
    language?: string;
    created: string;
  }) => window.rampa.structure.save(args) as Promise<SavedStructure>);
}

/**
 * The words her set cannot decide, with their pictures (`024`'s own chooser).
 *
 * The same call the adapt flow makes, deliberately: a choice she makes here is written to
 * her vocabulary through `pictograms.chooseWord`, so it serves her worksheets too. A
 * chooser of its own would have been a second vocabulary answering the same word
 * differently depending on which screen she happened to be on.
 */
export function useStructureCandidates(words: string[], language = 'es'):
    Loadable<Array<{ word: string; candidates: Array<{ id: string; image?: string }> }>> {
  return useAsync(async () => {
    if (words.length === 0) return [];
    return (await window.rampa.structure.candidates({ words, language })) as
      Array<{ word: string; candidates: Array<{ id: string; image?: string }> }>;
  }, [words.join('|'), language]);
}
