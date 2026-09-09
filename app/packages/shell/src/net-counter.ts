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

/**
 * A URL with no credential in it (backlog G66).
 *
 * Google's API takes the key in the query string —
 * `…/gemini-2.5-flash:generateContent?key=AQ.Ab8…` — so this log held the credential in
 * clear, in a channel built to be read and pasted into a report. It was found the stupidest
 * way possible: a test script printed the log and a real key landed in a transcript.
 *
 * The project already has this rule on the other side. `009` FR-729 keeps the key out of
 * the renderer, with the reasoning written down: a screen that receives a credential in
 * order to draw four asterisks is a screen that has the credential. This channel is the
 * same problem with a different reader.
 *
 * The origin and the path survive, because that is what tells you *where* something went;
 * every query value goes. Not just `key`: a provider added tomorrow may call it `api_key`
 * or `access_token`, and a list of parameter names to redact is a list that will be wrong
 * exactly once. And what SC-3302 needs — «how many requests left this process, and to
 * whom» — loses nothing.
 */
export function withoutSecrets(raw: string): string {
  try {
    const u = new URL(raw);
    if (!u.search) return raw;
    for (const name of [...u.searchParams.keys()]) u.searchParams.set(name, '…');
    return u.toString();
  } catch {
    // Not a parseable URL: drop anything after `?` rather than guess at its shape.
    const q = raw.indexOf('?');
    return q === -1 ? raw : `${raw.slice(0, q)}?…`;
  }
}

/** Every URL the process asked for, in order. Empty is the rehearsal's whole claim. */
export const networkLog = (): { count: number; urls: string[] } =>
  ({ count: requests, urls: seen.map(withoutSecrets) });

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
