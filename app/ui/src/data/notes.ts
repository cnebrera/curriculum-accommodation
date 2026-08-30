import { useAsync, useCommand, type Loadable } from './async.js';

/**
 * Her notes — the `memory:` channels (013 FR-1107).
 *
 * Named `notes` here rather than `memory` because that is what they are to her,
 * and because Principle VIII routes every one of them through a human: nothing
 * in this module writes to a learner's profile without her saying so. The IPC
 * names stay `memory:` because renaming a channel is a different change.
 */
export function useNotesIndex(): Loadable<unknown> {
  return useAsync(() => window.rampa.memory.index(), []);
}

export function useHouseStyle(): Loadable<unknown> {
  return useAsync(() => window.rampa.memory.house(), []);
}

/**
 * What erasure would remove, shown before anything is removed.
 *
 * A command and not a hook on purpose: she presses "ver qué se borraría", and
 * computing a deletion plan for a child the moment a screen mounts is the wrong
 * default for the one irreversible operation in the application.
 */
export function useForgetPlan() {
  return useCommand((code: string) => window.rampa.memory.forgetPlan(code));
}

export function useCaptureNote() {
  return useCommand((payload: unknown) => window.rampa.memory.capture(payload));
}

export function useConsolidateNotes() {
  return useCommand(() => window.rampa.memory.consolidate());
}

export function useArchiveNote() {
  return useCommand((path: string) => window.rampa.memory.archive(path));
}

export function useHandoverWrite() {
  return useCommand((code: string, year: string, summary: string, keep: string[]) =>
    window.rampa.memory.handoverWrite(code, year, summary, keep));
}

export function useHandoverDraft() {
  return useCommand((code: string, year: string, summary: string) =>
    window.rampa.memory.handoverDraft(code, year, summary));
}

/** Erasure. The one command in the application that is genuinely irreversible. */
export function useForgetLearner() {
  return useCommand((code: string) => window.rampa.memory.forget(code));
}
