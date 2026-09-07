import { useAsync, useCommand, type Loadable } from './async.js';
import type { Service } from './services.js';

/**
 * The bundled corpus, as the renderer sees it (013 FR-1107).
 *
 * Everything here is read-only and ships inside the application, so none of it
 * can fail for a reason a teacher caused. That is exactly why it was the most
 * carelessly fetched: five screens called it with a bare `.then(setState)` and
 * no catch, because "it cannot fail". It can — a broken install raises
 * `corpus-missing`, and the screens that assumed otherwise rendered a permanent
 * blank instead of saying so.
 */
export function useAxes(): Loadable<unknown[]> {
  return useAsync(() => window.rampa.corpus.axes() as Promise<unknown[]>, []);
}

export function useServices(): Loadable<Service[]> {
  return useAsync(() => window.rampa.corpus.services() as Promise<Service[]>, []);
}

/** What the material can be (012). She picks one; nothing is preselected. */
/**
 * The material kinds (`012`), with the sentence she reads before starting.
 *
 * `before` is optional because a corpus edit may not have written one yet, and a
 * kind without one says nothing rather than having a promise invented for it.
 */
export interface MaterialKindChoice { id: string; label: string; before?: string }

export function useMaterialKinds(): Loadable<MaterialKindChoice[]> {
  return useAsync(() =>
    window.rampa.corpus.materialKinds() as Promise<MaterialKindChoice[]>, []);
}

export function useEducationSystems(): Loadable<unknown[]> {
  return useAsync(() => window.rampa.corpus.educationSystems() as Promise<unknown[]>, []);
}

export function useChecklist(name: string): Loadable<unknown> {
  return useAsync(() => window.rampa.corpus.checklist(name), [name]);
}

/** The same read on demand — the review screen asks for its own checklist. */
export function useChecklistCommand() {
  return useCommand((name: string) => window.rampa.corpus.checklist(name) as Promise<string>);
}

export function useCorpusVersion(): Loadable<Record<string, unknown>> {
  return useAsync(() => window.rampa.corpus.version() as Promise<Record<string, unknown>>, []);
}

export function useLicences(): Loadable<{ code: string; content: string; notice: string }> {
  return useAsync(() =>
    window.rampa.corpus.licences() as Promise<{ code: string; content: string; notice: string }>, []);
}

/**
 * Asked, never automatic (FR-414). A request to the internet from a machine
 * holding data about children happens when she presses the button and at no
 * other moment, which is why this is a command and not a hook.
 */
export interface UpdateStatusView {
  current: string;
  latest?: string;
  newer: boolean;
  page: string;
  problem?: string;
  /**
   * What the release says it changes, in plain language (`034` FR-3201).
   *
   * Rendered as **text**, never as Markdown: release notes come off a network response,
   * and a screen that rendered them would be a screen a release can style and link
   * (Principle IX).
   */
  summary?: string;
}

export function useUpdateCheck() {
  return useCommand(() => window.rampa.corpus.checkForUpdate() as Promise<UpdateStatusView>);
}

/**
 * The release notice she did not ask for, and its dismissal (`034` FR-3203).
 *
 * ## Why there is a notice at all
 *
 * With the launch check consented to, a check can run **at launch** and find something.
 * Her press in «Acerca de» answers itself on the screen she pressed it from; a launch
 * check has no screen, so its answer has to appear somewhere she will pass — and then it
 * has to be dismissible, or it is a nag.
 *
 * `034`'s key entity says so in as many words: «Release notice: version, summary, link,
 * **dismissed-state**». The two channels behind these hooks existed and **nothing called
 * them**, so FR-3203 was a requirement with storage, a handler, a preload line and no
 * reader — found by sweeping the 181 channels after `launchCheck`.
 *
 * ## Dismissed per version, not for ever
 *
 * The notice returns for something **newer**. That is the difference between a notice and
 * a nag, and the nag is worse here than in most applications: what is being announced is
 * a fix she may need, so a teacher who has learned to click past this banner is a teacher
 * who will click past the one that matters.
 */
/*
 * There is no `useDismissedRelease`, and the guard is why.
 *
 * I wrote one, and `ui/test/exports-have-readers.test.ts` failed within the hour: no
 * screen needs it, because `updates:notice` answers with her decision **already
 * applied**. A screen that read the notice and the dismissal separately would be two
 * reads that can disagree about one question — which is the shape this whole sweep
 * started from.
 */
export function useDismissRelease() {
  return useCommand((version: string) =>
    window.rampa.updates.dismiss(version) as Promise<boolean>);
}

/**
 * What a launch check left behind, if anything (`034` FR-3201/FR-3203).
 *
 * A plain read of the same status the button produces — the check itself already ran at
 * launch and its answer is a file, so this asks and does **not** connect. That matters:
 * a hook that checked on mount would turn every screen it appears on into a phone-home,
 * which is exactly what the consent was for.
 */
export function useReleaseNotice(): Loadable<UpdateStatusView | null> {
  return useAsync(() => window.rampa.updates.notice() as Promise<UpdateStatusView | null>, []);
}

/** Where the update channel may connect, declared in the corpus (`034` FR-3204). */
export interface UpdateDestination {
  id: string; what: string; host: string; url: string; when: string; sends: string;
}

export function useUpdateDestinations(): Loadable<UpdateDestination[]> {
  return useAsync(() => window.rampa.corpus.destinations() as Promise<UpdateDestination[]>, []);
}

/** Off until she says otherwise (`034` research R5). Absent means no. */
export function useLaunchCheckConsent(): Loadable<boolean> {
  return useAsync(() => window.rampa.updates.consent() as Promise<boolean>, []);
}

export function useSetLaunchCheckConsent() {
  return useCommand((on: boolean) => window.rampa.updates.setConsent(on) as Promise<boolean>);
}

export function useRecommendService() {
  return useCommand((answers: unknown) => window.rampa.corpus.recommend(answers));
}

export function useOpenKeyPage() {
  return useCommand((serviceId: string) => window.rampa.corpus.openKeyPage(serviceId));
}
