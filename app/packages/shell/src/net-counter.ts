/**
 * Counting every request that leaves, under test only (035 T001 runtime half, SC-3302).
 *
 * ## Two stacks, because there are two
 *
 * Chromium's session is what a `webRequest` listener sees, and **provider calls do not go
 * through it**: they leave the main process through Node's `fetch`, which is undici. A
 * counter on one of them would sit at zero through a whole rehearsal while a request
 * escaped through the other — a green test asserting the opposite of the truth, which is
 * worse than no test at all.
 *
 * So both are wrapped, and the count is their sum.
 *
 * ## Under `RAMPA_TEST` and nowhere else
 *
 * This monkey-patches `globalThis.fetch`. That is acceptable in a test harness and not in
 * a teacher's application — a shipped build must not have an extra layer between it and
 * the network, however small, because the layer is one more thing that can be wrong on
 * the day a provider call matters.
 */

let requests = 0;
const seen: string[] = [];

/** Every URL the process asked for, in order. Empty is the rehearsal's whole claim. */
export const networkLog = (): { count: number; urls: string[] } =>
  ({ count: requests, urls: [...seen] });

export const resetNetworkLog = (): void => { requests = 0; seen.length = 0; };

/**
 * Wrap both stacks. Call once, from `main.ts`, only under test.
 *
 * `session` is passed in rather than imported so this file needs no Electron: it is
 * counted by `boundary.test.ts` like everything else, and a counter that pulled in the
 * whole framework to watch one listener would be the wrong shape for what it does.
 */
/**
 * Install it, or do not — the decision lives here rather than in `main.ts`.
 *
 * `boundary.test.ts` bounds how many lines of this package may touch Electron, and
 * `main.ts` is most of that budget. Ten lines of «if under test, wrap the network» there
 * pushed it past, which is the bound doing its job: what belongs in `main.ts` is *that*
 * something is installed, not the reasoning about when.
 */
export function watchNetworkIfTesting(session: Parameters<typeof watchNetwork>[0]): void {
  if (process.env['RAMPA_TEST'] === '1') watchNetwork(session);
}

export function watchNetwork(session: {
  webRequest: { onBeforeRequest: (fn: (d: { url: string }, cb: (r: object) => void) => void) => void };
}): void {
  session.webRequest.onBeforeRequest((details, callback) => {
    /*
     * `devtools:` and `file:` are the application loading itself. Counting them would make
     * the number meaningless and the test would be silenced rather than obeyed — which is
     * how a network guard stops guarding.
     */
    if (!/^(devtools|file|chrome-extension|blob|data):/.test(details.url)) {
      requests += 1;
      seen.push(details.url);
    }
    callback({});
  });

  const original = globalThis.fetch;
  globalThis.fetch = ((input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    const url = typeof input === 'string' ? input
      : input instanceof URL ? input.toString() : (input as Request).url;
    requests += 1;
    seen.push(url);
    return original(input, init);
  }) as typeof fetch;
}
