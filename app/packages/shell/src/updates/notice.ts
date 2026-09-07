import { handle } from '../ipc/wrap.js';
import { loadSettings, saveSettings } from '../ipc/vault-settings.js';

/**
 * What she has dismissed, and whether she lets Rampa look (034 T011/T013, FR-3203).
 *
 * ## Off the Electron surface, like everything that only needs one path
 *
 * The settings directory is **injected once at startup**. `boundary.test.ts` refused
 * these four handlers inside `corpus/links.ts` — which is right twice over: `links.ts`
 * is «the handlers that leave the machine» and none of these do, and the bound is what
 * turned that into a move rather than an opinion. Fourth time this bound has produced
 * the better shape (`018`, `035`, `034` T006, and now this).
 *
 * ## Dismissed means dismissed, for that version
 *
 * The notice returns only for something **newer**. That is the difference between a
 * notice and a nag, and a nag in this application is worse than in most: the thing being
 * announced is a fix she may need, so a teacher who has learned to click past the update
 * banner is a teacher who will click past the one that matters.
 *
 * ## And the launch check is off until she says otherwise
 *
 * A version check is a phone-home. `releases.ts` says `checkedAutomatically` «does not
 * exist and must not be added» — the status of a check is not where a permission lives —
 * so the permission is here, absent by default, and the screen that offers it says what
 * leaves the machine before she turns it on.
 */
export function registerNoticeIpc(settingsDir: () => string): void {
  /*
   * No `updates:dismissed`. It existed, nothing ever called it, and `updates:notice`
   * below makes it redundant by design — it answers «is there a notice» with her
   * dismissal already applied, so a screen never has to combine two reads.
   */
  /**
   * What the last launch check found, if it found something (FR-3201/FR-3203).
   *
   * A read of a file and **not** a check: a screen that connected on mount would turn
   * every visit into a phone-home, which is the thing the consent exists to prevent.
   *
   * `null` once she has dismissed that version, so the answer to «is there a notice»
   * already carries her decision — a screen that had to fetch the notice and then fetch
   * the dismissal separately is two reads that can disagree about the same question.
   */
  handle('updates:notice', async () => {
    const s = await loadSettings(settingsDir());
    const notice = s.lastRelease ?? null;
    if (!notice) return null;
    return s.dismissedRelease === notice.latest ? null : notice;
  });

  handle('updates:dismiss', async (version: unknown) => {
    if (typeof version !== 'string' || version.trim() === '') return false;
    const dir = settingsDir();
    await saveSettings(dir, {
      ...(await loadSettings(dir)), dismissedRelease: version.trim(),
    });
    return true;
  });

  handle('updates:consent', async () =>
    (await loadSettings(settingsDir())).checkAtLaunch === true);

  handle('updates:setConsent', async (on: unknown) => {
    const dir = settingsDir();
    await saveSettings(dir, { ...(await loadSettings(dir)), checkAtLaunch: on === true });
    return on === true;
  });
}

/**
 * May a launch check run right now? (034 T024, FR-3202, research R5.)
 *
 * Pure, so the three things that make this safe are testable without a clock and without
 * a window:
 *
 * - **Consent, absent by default.** Not «has she seen the setting» — has she turned it
 *   on. A version check is a phone-home from a machine holding data about children.
 * - **At most weekly.** «At launch» in a school means every morning, and a daily
 *   outbound request on a schedule nobody asked for is the thing the consent was for.
 * - **Never mid-job**, which is the caller's half: this says «allowed», and the caller
 *   only asks at launch.
 *
 * And it fails **silent**. A check that surfaces «no he podido comprobarlo» on a morning
 * with no network is a check that teaches her the application is broken.
 */
export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function mayCheckAtLaunch(
  settings: { checkAtLaunch?: boolean; lastLaunchCheck?: string },
  nowIso: string,
): boolean {
  if (settings.checkAtLaunch !== true) return false;
  const last = settings.lastLaunchCheck;
  if (!last) return true;
  const since = Date.parse(nowIso) - Date.parse(last);
  /*
   * `NaN` — an unparseable stamp — reads as «no lo sé» and allows the check rather than
   * blocking it for ever. The failure directions are not symmetric: a check too many is
   * one anonymous request, and a check never again is a teacher who never learns about
   * the fix she is stranded on.
   */
  return Number.isNaN(since) || since >= WEEK_MS;
}

/**
 * Run it if allowed, record that it ran, and say nothing either way.
 *
 * One implementation shared with the button — `check` is the same handler's work —
 * so there is exactly one place a check can start from, which is what makes «only these
 * destinations, only when asked» a property rather than a habit.
 *
 * ## And never during a rehearsal (`035` T020, `034` T024)
 *
 * `035`'s whole claim is **zero requests**: a fictional child, no connection, nothing
 * spent, counted in both stacks. A launch check firing while she is showing the sample to
 * a colleague would break that claim on the one path built to be provably offline — and
 * it would break it *silently*, since this check says nothing either way.
 *
 * So the rehearsal is a reason to **not run**, not a reason to fail: `ran: false` and no
 * stamp, so the check happens on the next launch outside a rehearsal instead of being
 * consumed by one. Recording the stamp here would mean a teacher who rehearsed on Monday
 * gets no check until the following Monday.
 *
 * `rehearsing` is injected rather than imported, for the reason this file has no Electron
 * in it: `ensayoState` reaches `app.getPath`, and pulling it in here would put the whole
 * framework behind a boolean. The caller knows.
 */
export async function launchCheck(args: {
  settingsDir: string;
  now: string;
  check: () => Promise<unknown>;
  /** Is a rehearsal in progress? A check must not interrupt one (`035` FR-3302). */
  rehearsing?: () => Promise<boolean>;
}): Promise<{ ran: boolean; because?: 'consent' | 'too-soon' | 'rehearsal'; result?: unknown }> {
  const settings = await loadSettings(args.settingsDir);
  if (!mayCheckAtLaunch(settings, args.now)) {
    /*
     * Which «no», because the two are different facts and the caller may want to log
     * one: «she has not consented» is permanent until she does, «too soon» is a week.
     */
    return { ran: false, because: settings.checkAtLaunch === true ? 'too-soon' : 'consent' };
  }
  if (await args.rehearsing?.()) return { ran: false, because: 'rehearsal' };
  /*
   * The answer comes back, because a launch check has **no screen** to answer on.
   *
   * Her press in «Acerca de» renders its reply where she pressed. A check at launch has
   * to leave what it found somewhere she will pass later — otherwise it is a request that
   * happens and tells nobody, which is the shape `launchCheck` already had for a day.
   *
   * `unknown`, and the caller decides what is worth remembering: this file knows what a
   * *check* is and deliberately not what a release looks like.
   */
  let result: unknown;
  try { result = await args.check(); } catch { /* silent, by requirement */ }
  await saveSettings(args.settingsDir, { ...settings, lastLaunchCheck: args.now });
  return { ran: true, result };
}

/**
 * Remember what a launch check found, if it is worth remembering (FR-3201/FR-3203).
 *
 * Here rather than at the call site because it needs a settings directory and nothing
 * else, and the Electron-surface bound refused it in `corpus/links.ts` — **seventh time**
 * that bound has produced the better shape by the same move: inject what the code needs
 * and it stops being bridge.
 *
 * Only when there is something **newer**. «Estás al día» is not news, and storing it
 * would put a notice on her screen that says nothing — which is how a notice becomes
 * furniture and then gets dismissed without being read.
 */
export async function rememberRelease(settingsDir: string, found: unknown): Promise<boolean> {
  const it = found as { newer?: boolean; latest?: string } | undefined;
  if (!it?.newer) return false;
  const settings = await loadSettings(settingsDir);
  await saveSettings(settingsDir, { ...settings, lastRelease: it as never });
  return true;
}
