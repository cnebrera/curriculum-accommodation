import { useAsync, useCommand, type Loadable } from './async.js';

/**
 * The rehearsal, from the renderer's side (`035` T009).
 *
 * Components never call `window.rampa` — `ui/test/data-layer.test.ts` asserts it and this
 * is the layer that makes it true here too. Worth stating for the rehearsal in
 * particular: its screens are the ones a new contributor is most likely to write quickly,
 * because they are «just a demo», and a demo that reaches past the data layer is a demo
 * that reaches past everything else the data layer is for.
 */
export interface EnsayoState {
  step: 'brought' | 'verified' | 'adapted' | 'reviewed' | 'signed' | 'printed';
  startedAt: string;
}

export function useEnsayoState(): Loadable<EnsayoState | null> {
  return useAsync(() => window.rampa.ensayo.state() as Promise<EnsayoState | null>, []);
}

export function useStartEnsayo() {
  return useCommand((startedAt: string) =>
    window.rampa.ensayo.start(startedAt) as Promise<EnsayoState | null>);
}

export function useDiscardEnsayo() {
  return useCommand(() => window.rampa.ensayo.discard() as Promise<boolean>);
}

export function useAdvanceEnsayo() {
  return useCommand((step: EnsayoState['step']) =>
    window.rampa.ensayo.advance(step) as Promise<boolean>);
}

/** The reading, with its one authored flaw waiting to be found. */
export function useEnsayoReading(startedAt: string | null):
    Loadable<{ markdown: string; blocks: number } | null> {
  return useAsync(async () => {
    if (!startedAt) return null;
    return (await window.rampa.ensayo.reading(startedAt)) as
      { markdown: string; blocks: number };
  }, [startedAt]);
}

/** The pre-computed adaptation and its genuine report. */
export function useEnsayoAdaptation(startedAt: string | null):
    Loadable<{ path: string; markdown: string; report: string } | null> {
  return useAsync(async () => {
    if (!startedAt) return null;
    return (await window.rampa.ensayo.adaptation(startedAt)) as
      { path: string; markdown: string; report: string };
  }, [startedAt]);
}

/**
 * What an equivalent real run would cost.
 *
 * «Would», and the screens that show it say so. It is written to no ledger: her real
 * month badge does not move, because a charge that did not happen is not a charge.
 */
export function useWouldCost(): Loadable<{ readCents: number; adaptCents: number }> {
  return useAsync(() => window.rampa.ensayo.wouldCost() as
    Promise<{ readCents: number; adaptCents: number }>, []);
}

export function useCheckNames() {
  return useCommand((text: string) =>
    window.rampa.ensayo.checkNames(text) as Promise<{ found: string[] }>);
}

/**
 * Sign it, and print it — for real, over the rehearsal root.
 *
 * The gesture is the real one on purpose. A signature in this application means somebody
 * read the sheet; a rehearsal that skipped it would teach her that the signature is a
 * formality, which is the one thing it must never be.
 */
export function useSignEnsayo() {
  return useCommand((startedAt: string, role: string) =>
    window.rampa.ensayo.sign(startedAt, role) as Promise<{ signedOff: boolean; date: string }>);
}

export function useRenderEnsayo() {
  return useCommand((startedAt: string) =>
    window.rampa.ensayo.render(startedAt) as Promise<string>);
}
