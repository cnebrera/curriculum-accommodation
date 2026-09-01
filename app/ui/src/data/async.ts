import { useCallback, useEffect, useRef, useState } from 'react';
import { fromWire } from '../../../packages/core/src/errors.js';
import { useStrings } from '../i18n/context.js';

/**
 * The three states every screen has, resolved once (013 FR-1108/FR-1109).
 *
 * Before this, each screen invented its own. The common shape was:
 *
 *     const [things, setThings] = useState([]);
 *     useEffect(() => { void window.rampa.x.list().then(setThings); }, []);
 *
 * which has no loading state (an empty list and a list that has not arrived look
 * identical, and both render as a blank control), and no error state at all — a
 * rejected promise there is an unhandled rejection nobody sees. The screen shows
 * an empty select and a teacher concludes she has no learners.
 *
 * The other half is FR-1109. Errors cross IPC as strings with the domain `kind`
 * encoded into the message, so a caller has to run `fromWire` and then look the
 * kind up in her language. Three components remembered to. The rest showed
 * whatever Electron's wrapper happened to say — in English, with the remote
 * method name in it. Doing it here means a component cannot forget, because a
 * component never sees the raw failure.
 */
export type Async<T> =
  | { state: 'loading' }
  | { state: 'error'; kind: string; message: string; retry: () => void }
  | { state: 'ready'; value: T };

/**
 * What `useAsync` actually returns, named once.
 *
 * Every domain hook was annotating this by hand, and half of them wrote plain
 * `Async<T>` — which typechecks, silently drops `reload`, and then fails at the
 * one call site that wants to refresh after a mutation. Declared here so a hook
 * cannot forget half of its own return value.
 */
export type Loadable<T> = Async<T> & { reload: () => void };

/** True for the values that mean "nothing to show" rather than "not yet". */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'string') return value.trim() === '';
  return false;
}

/**
 * Translate a failure into the sentence she reads.
 *
 * `kind` first, the layer below's own message second, the catch-all last. The middle
 * rung matters: a kind we have no Spanish sentence for is still better served by
 * whatever the layer below said than by "algo ha ido mal", which tells her nothing
 * and tells us nothing either.
 *
 * ## Why `unknown` is skipped explicitly
 *
 * The middle rung was unreachable in the only case it was written for. `unknown` is
 * a key in `t.errors`, so `t.errors[kind]` **found** something for kind `unknown`
 * and the `?? message` never ran — the catch-all won precisely when we had no idea
 * what happened and the message was the last thing left.
 *
 * Found on 2026-09-01: a 404 from Google reached this function carrying «El servicio
 * devolvió un error (404).» and Carlos read «Algo ha ido mal. No he perdido nada de
 * lo tuyo.» The information existed and this line discarded it.
 *
 * So `unknown` means "no translation", not "translated as the catch-all", and the
 * catch-all is applied once, at the end, where it belongs.
 */
export function useErrorText(): (e: unknown) => { kind: string; message: string } {
  const { t } = useStrings();
  return useCallback((e: unknown) => {
    const { kind, message } = fromWire(e);
    const translated = kind === 'unknown' ? undefined : t.errors[kind];
    return {
      kind,
      message: translated ?? (message?.trim() || undefined)
        ?? t.errors['unknown'] ?? 'Algo ha ido mal.',
    };
  }, [t]);
}

/**
 * Load something across the IPC boundary.
 *
 * `deps` is the identity of what is being loaded, not a lint obligation: change
 * it and the load runs again. `reload` is the same thing on demand, and it is
 * what the error state's `retry` calls — an error a teacher cannot retry from is
 * a dead end, and every one of these failures is the kind that goes away when
 * the school connection comes back.
 */
export function useAsync<T>(load: () => Promise<T>, deps: readonly unknown[]): Loadable<T> {
  const [result, setResult] = useState<Async<T>>({ state: 'loading' });
  const [nonce, setNonce] = useState(0);
  const describe = useErrorText();
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  // `load` is a fresh closure on every render, so it cannot be a dependency
  // without re-running forever. The ref keeps the latest one callable while
  // `deps` stays the honest statement of what would change the answer.
  const latest = useRef(load);
  latest.current = load;

  useEffect(() => {
    let live = true;
    setResult({ state: 'loading' });
    latest.current().then(
      (value) => { if (live) setResult({ state: 'ready', value }); },
      (e: unknown) => { if (live) setResult({ ...describe(e), state: 'error', retry: reload }); },
    );
    // A screen she navigates away from mid-load must not write into a component
    // that is gone, and — more to the point here — must not overwrite the state
    // of the screen she navigated to.
    return () => { live = false; };
  }, [...deps, nonce]);

  return { ...result, reload };
}

/**
 * Something she does, rather than something she reads: save, forget, sign off.
 *
 * Separate from `useAsync` because the states are not the same. A command has no
 * "loading" before she asks — it has *idle*, and rendering a spinner for a
 * button she has not pressed is how a screen ends up looking busy at rest. It
 * also has no empty. What it does have is `busy`, which is what stops her
 * pressing "Firmar" twice and signing two copies.
 */
export function useCommand<A extends unknown[], R>(
  run: (...args: A) => Promise<R>,
): {
  run: (...args: A) => Promise<R | undefined>;
  busy: boolean;
  error: { kind: string; message: string } | null;
  clearError: () => void;
} {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ kind: string; message: string } | null>(null);
  const describe = useErrorText();
  const latest = useRef(run);
  latest.current = run;

  const invoke = useCallback(async (...args: A): Promise<R | undefined> => {
    setBusy(true);
    setError(null);
    try {
      return await latest.current(...args);
    } catch (e: unknown) {
      setError(describe(e));
      // Swallowed on purpose: the failure is now on screen in her language, and
      // rethrowing would only produce a second, English, uncaught copy in the
      // console. The caller distinguishes success from failure by the return
      // value being undefined.
      return undefined;
    } finally {
      setBusy(false);
    }
  }, [describe]);

  return { run: invoke, busy, error, clearError: useCallback(() => setError(null), []) };
}
