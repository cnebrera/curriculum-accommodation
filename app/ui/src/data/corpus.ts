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
export function useUpdateCheck() {
  return useCommand(() => window.rampa.corpus.checkForUpdate() as Promise<{
    current: string; latest?: string; newer: boolean; page: string; problem?: string;
  }>);
}

export function useRecommendService() {
  return useCommand((answers: unknown) => window.rampa.corpus.recommend(answers));
}

export function useOpenKeyPage() {
  return useCommand((serviceId: string) => window.rampa.corpus.openKeyPage(serviceId));
}
