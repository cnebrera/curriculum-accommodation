import { useAsync, useCommand, type Loadable } from './async.js';

/**
 * Her name for the child, and the wall it must never cross (013 FR-1107).
 *
 * This is the most security-relevant module in the data layer, so it is the one
 * that most needed to stop being scattered. A learner's real name lives in an
 * encrypted map on her machine and is substituted for a code at the egress
 * chokepoint; everything here is on the *display* side of that boundary.
 *
 * There was a `useLearnerName` hook here with a branded `DisplayName` type, on
 * the argument that a plain string could be handed to something that sends. It
 * had no callers — none, anywhere — so it protected nothing and the brand was
 * ornamental besides: a branded string is still assignable to `string`, so it
 * never blocked the direction it was written to block.
 *
 * Deleted. The real guarantee is the egress chokepoint and the test that pins
 * it (`packages/providers/test/chokepoint.test.ts`), which is a structural
 * defence rather than a naming convention (Principle IX).
 */

/** Every code she has a name for, for the places that list learners. */
export function useNames(): Loadable<Record<string, string>> {
  return useAsync(() => window.rampa.names.all() as Promise<Record<string, string>>, []);
}

export function useNameStatus(): Loadable<unknown> {
  return useAsync(() => window.rampa.names.status(), []);
}

/**
 * The same question asked at the moment it matters: right after she picks a
 * vault, because whether the name map can be encrypted depends on the machine's
 * keychain and she deserves to be told then rather than on some later screen.
 */
export function useNameStatusCheck() {
  return useCommand(() => window.rampa.names.status());
}

/**
 * Does this text contain what looks like a real name?
 *
 * A command rather than a hook: it runs on what she typed, when she is about to
 * send it, and never on mount.
 */
export function useNameCheck() {
  return useCommand((text: string) =>
    window.rampa.names.check(text) as Promise<{ flagged: string[] }>);
}

export function useResolveName() {
  return useCommand((code: string) => window.rampa.names.resolve(code) as Promise<string | null>);
}

export function useSetName() {
  return useCommand((code: string, name: string) => window.rampa.names.set(code, name));
}

export function useIgnoreWord() {
  return useCommand((word: string) => window.rampa.names.ignore(word));
}
