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
  expectedTotal: number;
  /** From the corpus, and measured rather than sampled — see `instructions`. */
  expectedMegabytes: number;
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
  brought: number;
  present: number;
  total: number;
  failed: number;
  stopped: boolean;
  /** Already in her language, from the shell. */
  lines: string[];
  root: string;
}

/**
 * One press, the whole set (`024` FR-2201). **She types nothing.**
 *
 * `023` had a `words: string[]` here and a textarea above it. Carlos, twice: «que se lo
 * baje solo». He was right — she does not know which words the next worksheet contains,
 * and asking her was asking for the wrong thing.
 */
export function useFetchPictograms() {
  return useCommand((language: string = 'es') =>
    window.rampa.pictograms.fetch({ language }) as Promise<FetchResult>);
}

export interface SetInventory {
  publisher: string;
  language: string;
  images: number;
  total: number;
  highWater: string;
  broughtOn: string;
  declined?: string;
}

export type UpdateStatus =
  | { state: 'complete' }
  | { state: 'incomplete'; missing: number }
  | { state: 'update'; added: number; highWater: string }
  | { state: 'unknown' };

/**
 * What she has — **and it costs no request** (`024` FR-2209/2210).
 *
 * Answered from disk, so opening this screen a hundred times reaches nobody. «Que no me
 * lo vuelva a preguntar salvo que haya una actualización» is a requirement about
 * silence, and silence means not asking anyone anything.
 */
export function useSetState(): Loadable<{
  status: UpdateStatus; inventory: SetInventory | null; root: string;
}> {
  return useAsync(() => window.rampa.pictograms.state() as Promise<{
    status: UpdateStatus; inventory: SetInventory | null; root: string;
  }>, []);
}

/** One request, and only because she pressed something (`024` FR-2211). */
export function useCheckUpdate() {
  return useCommand(() => window.rampa.pictograms.checkUpdate() as Promise<UpdateStatus>);
}

export function useDeclineUpdate() {
  return useCommand((highWater: string) =>
    window.rampa.pictograms.declineUpdate(highWater) as Promise<boolean>);
}

export interface WordChoice {
  word: string;
  chosen?: string;
  candidates: Array<{ id: string; image: string | null }>;
}

/**
 * The words the set cannot decide, with their pictures (`024` FR-2217).
 *
 * Only the genuinely ambiguous ones come back: a word with one candidate needs no
 * decision, and a word with none is the ordinary case for most words in most sentences.
 */
export function useCandidates(words: string[], language = 'es'): Loadable<WordChoice[]> {
  const key = words.join('|');
  return useAsync(() => window.rampa.pictograms.candidates({ words, language }) as
    Promise<WordChoice[]>, [key, language]);
}

/**
 * She stops choosing, and the word goes back to being reported as ambiguous.
 *
 * `unchooseWord` existed in `core`, in the shell, as an IPC handler **and** in the
 * preload — four layers, no hook, no component. Its doc comment described her doing
 * something she could not do. Found by a review; it is a legitimate capability, so it
 * gets a caller rather than being deleted.
 */
export function useUnchooseWord() {
  return useCommand((args: { word: string; language?: string }) =>
    window.rampa.pictograms.unchooseWord(args) as Promise<boolean>);
}

/** Her choice. Once, for every learner (`024` FR-2214). */
export function useChooseWord() {
  return useCommand((args: { word: string; id: string; language?: string }) =>
    window.rampa.pictograms.chooseWord(args) as Promise<boolean>);
}

/**
 * The words out of the report's own «hay N dibujos posibles» lines.
 *
 * ## Duplicated from `@rampa/core`, deliberately and with a test
 *
 * `packages/core/src/pictograms/match.ts` has this beside `reportSkipped`, which is the
 * function that writes those sentences — that is where it belongs, so the pattern and
 * the prose move together. The renderer cannot import `@rampa/core` (it talks to the
 * main process over IPC), so this is a second copy.
 *
 * A second copy of one truth is the defect this project has found five times, so it is
 * not left to trust: `ui/test/styles.test.tsx`'s sibling assertion in
 * `pictogram-report.test.tsx` runs both against the same input and fails if they
 * disagree.
 */
export function skippedWords(lines: readonly string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    const m = /^«([^»]+)»: hay \d+ dibujos posibles/.exec(line);
    if (m?.[1]) {
      out.push(m[1].normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/\s+/g, ' ').trim());
    }
  }
  return [...new Set(out)];
}

export interface Bringing { running: boolean; done: number; total: number }

/**
 * A download already going, so a reopened screen shows it (`025` FR-2309).
 *
 * The bar and «Parar» were the component's own state, so navigating out of Configuración
 * and back lost both while the fetch carried on — and re-enabled the button, which made
 * a second concurrent run reachable by accident. `isBringing` had been written for
 * exactly this and read by nobody (the fifteenth).
 */
export function useBringing(): Loadable<Bringing> {
  return useAsync(() => window.rampa.pictograms.bringing() as Promise<Bringing>, []);
}

/** She pressed «Parar». What arrived is already usable (`024` FR-2118). */
export function useStopBringing() {
  return useCommand(() => window.rampa.pictograms.stop() as Promise<boolean>);
}

/**
 * Everything she has chosen, for review (`025` FR-2308).
 *
 * `useCandidates` asks about the words a *report* just skipped; this asks what she has
 * already decided. Until `025` there was no second question — her vocabulary could be
 * answered and never re-read, which made it a file she owned and could not see.
 */
export function useChosenSoFar(language = 'es'): Loadable<WordChoice[]> {
  return useAsync(() =>
    window.rampa.pictograms.chosenSoFar(language) as Promise<WordChoice[]>, [language]);
}

/**
 * The `stage` the pictogram download reports, mirrored from `@rampa/core`.
 *
 * The renderer cannot import `@rampa/core` (it talks to the main process over IPC), and
 * this string is compared on both sides to decide whether a progress event belongs to
 * this download. It was a literal in three places; a typo in any of them silently killed
 * the bar, which is how the thirteenth unread field happened.
 *
 * `ui/test/download-progress.test.tsx` asserts this equals the core constant, so the
 * two cannot drift — the same arrangement `skippedWords` above has, and for the same
 * reason.
 */
export const PICTOGRAM_PROGRESS_STAGE = 'Trayendo pictogramas';
