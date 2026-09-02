import { useAsync, useCommand, type Loadable } from './async.js';

/**
 * Her pictogram set, from the renderer (018).
 *
 * `023` added the download. What makes it legitimate is not in this file: the
 * acceptance is checked in the **main process**, because a gate in a hook is a gate
 * the second caller walks past.
 *
 * What Rampa still does not do is bundle or redistribute them (FR-2101).
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

export interface PublisherView {
  id: string;
  label: string;
  site: string;
  licence: string;
  licenceUrl: string;
  languages: string[];
  attribution: { author: string; owner: string; source: string };
}

export interface PublisherState {
  publishers: PublisherView[];
  accepted: { publisher: string; licence: string; acceptedOn: string } | null;
  wordsPerFetch: number;
}

/**
 * Who pictograms can come from, and whether she has accepted (FR-2104/2105).
 *
 * The attribution and the licence URL come from here rather than being written into
 * the component, so the one text a licence obliges us to get right has a single
 * source — `instructions/pictograms.md`.
 */
export function usePublishers(): Loadable<PublisherState> {
  return useAsync(() => window.rampa.pictograms.publishers() as Promise<PublisherState>, []);
}

export function useAcceptLicence() {
  return useCommand((publisherId: string) =>
    window.rampa.pictograms.acceptLicence(publisherId) as Promise<boolean>);
}

export function useWithdrawLicence() {
  return useCommand(() => window.rampa.pictograms.withdrawLicence() as Promise<boolean>);
}

export interface FetchResult {
  outcome: {
    found: string[]; missing: string[]; present: string[]; cut: string[];
    failed: string[]; images: number; namesRemoved: number; ambiguous: string[];
  };
  /** Already in her language, from `describeOutcome`. */
  lines: string[];
  root: string;
}

/** Words in, pictograms on disk. One word per request; names never leave. */
export function useFetchPictograms() {
  return useCommand((words: string[], language: string = 'es') =>
    window.rampa.pictograms.fetch({ words, language }) as Promise<FetchResult>);
}
