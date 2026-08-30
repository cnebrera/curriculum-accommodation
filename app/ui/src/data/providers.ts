import { useAsync, useCommand, type Loadable } from './async.js';

/**
 * Her AI service (013 FR-1107).
 *
 * The one domain where a failure is routine rather than exceptional: a key
 * expires, a card is declined, a school firewall eats the request. So every
 * command here goes through `useCommand`, which means each of those arrives as a
 * sentence in Spanish rather than as `Error invoking remote method
 * 'providers:validate'` — which is what a teacher saw before FR-1109, in English,
 * with the channel name in it.
 */
export function useConnections(): Loadable<unknown> {
  return useAsync(() => window.rampa.providers.connections(), []);
}

/**
 * The same read, on demand. The connection screen re-reads after every switch
 * and every removal, so what it needs is a function it can await rather than a
 * hook it has to invalidate.
 */
export function useConnectionsCommand() {
  return useCommand(() => window.rampa.providers.connections());
}

export function useCurrentProvider(): Loadable<{ configured: boolean; id?: string }> {
  return useAsync(() =>
    window.rampa.providers.current() as Promise<{ configured: boolean; id?: string }>, []);
}

/**
 * Offline first, and deliberately: everything decidable without the network is
 * decided without it. It costs nothing, it works when the school connection is
 * down, and it is why the errors she can see are five different sentences.
 */
export function useKeyShapeCheck() {
  return useCommand((id: string, raw: string) => window.rampa.providers.shapeCheck(id, raw));
}

/**
 * The provider is the authority on whether its own key is valid — see the note
 * in `packages/core/src/providers/key.ts`, written the day a perfectly good
 * Google key was rejected because it started `AQ.` instead of `AIza`.
 */
export function useValidateKey() {
  return useCommand((id: string, key: string) => window.rampa.providers.validate(id, key));
}

export function useSaveKey() {
  return useCommand((id: string, key: string) => window.rampa.providers.save(id, key));
}

export function useActivateProvider() {
  return useCommand((id: string) => window.rampa.providers.activate(id));
}

export function useForgetProvider() {
  return useCommand((id: string) => window.rampa.providers.forget(id));
}
