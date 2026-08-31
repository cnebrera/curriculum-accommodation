import { useAsync, useCommand, type Loadable } from './async.js';

/**
 * Her pictogram set, from the renderer (018).
 *
 * **There is no `download` here, and there is none in the preload either.** The
 * relationship with the licence is hers: ARASAAC's pictograms are CC BY-NC-SA and
 * Rampa is Apache-2.0, so a download button would make us the distributor of
 * content whose terms contradict our own — and a sheet with one embedded is a
 * derivative work, so **her** material would inherit BY-NC-SA silently.
 */

export interface CurrentSet {
  root: string;
  licence?: string;
  summary?: string;
  configuredOn: string;
  /** The folder is gone or moved. Reported rather than remembered (FR-1616). */
  missing: boolean;
}

export interface SetInspection {
  ok: boolean;
  summary: string;
  problems: Array<{ kind: string; message: string }>;
  languages: string[];
  licence: string | null;
  folder: string;
}

export function useCurrentSet(): Loadable<CurrentSet | null> {
  return useAsync(() => window.rampa.pictograms.current() as Promise<CurrentSet | null>, []);
}

export function useChooseSet() {
  return useCommand(() => window.rampa.pictograms.choose() as Promise<string | null>);
}

/** Read a folder and say what is in it, **before** configuring anything. */
export function useInspectSet() {
  return useCommand((root: string) =>
    window.rampa.pictograms.inspect(root) as Promise<SetInspection>);
}

export function useUseSet() {
  return useCommand((root: string) =>
    window.rampa.pictograms.use(root) as Promise<{ ok: boolean; summary?: string }>);
}
