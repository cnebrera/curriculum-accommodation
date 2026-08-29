/**
 * Is there a newer Rampa? (006 T073, FR-414, research R11.)
 *
 * The corpus ships inside the release (FR-413), so **updating the corpus means
 * updating the application**. There is no separate corpus feed, and inventing
 * one would be inventing infrastructure nobody runs. R11 already decided the
 * channel: GitHub Releases, which costs nothing and is not infrastructure the
 * project has to operate.
 *
 * ## Why this is never automatic
 *
 * A version check is a phone-home. In a tool that handles children's data in
 * state schools, an automatic outbound request on launch is precisely what a
 * data protection officer objects to — and rightly: it tells a third party that
 * this machine, at this address, is running this tool, on a schedule nobody
 * asked for.
 *
 * So it runs **only when she presses the button**, and the interface says what
 * pressing it does before she does. `checkedAutomatically` does not exist and
 * must not be added.
 *
 * ## Why it lives in the provider layer
 *
 * Not because it calls a model — it does not. Because `@rampa/providers` is the
 * only network-capable package in the application, and that sentence has to stay
 * true for the redaction guarantee to mean anything. A `fetch` in the shell
 * would make it false, quietly, in the file least likely to be read again.
 *
 * ## Why it does not install anything
 *
 * The installers are unsigned (R14), so an in-place update on macOS or Windows
 * would fail in a way that looks like the application breaking. It reports, and
 * points at the release page. Nothing is downloaded and nothing is replaced.
 */
const RELEASES_API = 'https://api.github.com/repos/cnebrera/curriculum-accommodation/releases/latest';
const RELEASES_PAGE = 'https://github.com/cnebrera/curriculum-accommodation/releases';

export interface UpdateStatus {
  /** What she is running now. */
  current: string;
  /** The newest published version, when it could be read. */
  latest?: string;
  /** True only when `latest` is genuinely newer than `current`. */
  newer: boolean;
  /** Where to get it. Always the releases page, never a binary URL. */
  page: string;
  /**
   * Why there is no answer, when there is none. Never a status code: this is
   * shown to a teacher (006 US5).
   */
  problem?: 'offline' | 'not-published' | 'unreadable';
}

/**
 * Semver comparison, tolerant of a `v` prefix and of extra components.
 *
 * Deliberately not a string comparison: `0.10.0` sorts before `0.9.0`
 * lexically, which would tell her she is up to date for the whole of a
 * ten-release stretch and then never mention it again.
 */
export function isNewer(latest: string, current: string): boolean {
  const parse = (v: string) =>
    v.replace(/^v/, '').split('-')[0]!.split('.').map((n) => Number(n) || 0);
  const a = parse(latest);
  const b = parse(current);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x > y;
  }
  return false;
}

export interface CheckOptions {
  /** Injected in tests. Never called anywhere else. */
  api?: string;
  timeoutMs?: number;
}

/**
 * Ask once, on her instruction. Never throws: a failed check is a sentence, not
 * an error dialog.
 */
export async function checkForUpdate(
  currentVersion: string,
  opts: CheckOptions = {},
): Promise<UpdateStatus> {
  const base: UpdateStatus = { current: currentVersion, newer: false, page: RELEASES_PAGE };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 8000);

  try {
    const res = await fetch(opts.api ?? RELEASES_API, {
      // No token, no cookies, nothing identifying beyond what any HTTP request
      // carries. The User-Agent is required by the API and says only what this is.
      headers: { accept: 'application/vnd.github+json', 'user-agent': 'Rampa' },
      signal: controller.signal,
    });

    // No release yet is a legitimate answer, not a failure. The project has
    // published none at the time of writing, and saying "no he podido
    // comprobarlo" would be wrong.
    if (res.status === 404) return { ...base, problem: 'not-published' };
    if (!res.ok) return { ...base, problem: 'unreadable' };

    const body = await res.json() as { tag_name?: unknown; name?: unknown };
    const tag = typeof body.tag_name === 'string' ? body.tag_name
      : typeof body.name === 'string' ? body.name : null;
    if (!tag) return { ...base, problem: 'unreadable' };

    const latest = tag.replace(/^v/, '');
    return { ...base, latest, newer: isNewer(latest, currentVersion) };
  } catch {
    // Aborted, refused, or no DNS. All the same thing to her: not now.
    return { ...base, problem: 'offline' };
  } finally {
    clearTimeout(timer);
  }
}
