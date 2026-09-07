import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';

/**
 * Nothing exported is read by nothing (the guard this repository needed).
 *
 * ## Why it exists, and what it would have caught
 *
 * «A field written, typed and read by nothing» is this project's signature defect
 * (BACKLOG G36). It has been found by hand at least fifteen times: twelve unread profile
 * fields, `route.flow`, `PrepareFlow.name`, `HandoverReview.name`, `isBringing`, the
 * pictogram download's progress, and — on 2026-09-07, one day after I wrote it —
 * **`launchCheck`**, a whole requirement's implementation with no caller.
 *
 * `props-are-read.test.ts` covers React props. This covers the other shape: an exported
 * function, constant or component that no other module reaches.
 *
 * ## Tests are **not** readers
 *
 * That is the point. `launchCheck` was written, documented **and tested**, and the tests
 * passed while the feature did not exist. So a symbol reached only from a test is still
 * an orphan here — the claim is «the product reaches this», not «something does».
 *
 * A symbol used inside its own file is not an orphan: that is an export for testing, a
 * pattern this project uses deliberately («a function a test cannot call is a function
 * that survives being deleted»).
 *
 * ## An inventory, not a rule
 *
 * There are 28 orphans today and I cannot honestly write 28 reasons — I do not know why
 * most of them exist. So this is the `verifier-inventory.test.ts` shape: the list is
 * frozen, a **new** orphan fails, and the ones whose story I do know carry it. The list
 * may shrink and may not grow. Freezing debt is worse than fixing it and far better than
 * not seeing it.
 */
const uiRoot = join(dirname(new URL(import.meta.url).pathname), '..');
const appRoot = join(uiRoot, '..');

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name))
      : /\.tsx?$/.test(e.name) ? [join(dir, e.name)] : []);

/** The product: the renderer and the main process. Not core, whose consumers are these. */
const productFiles = [
  ...walk(join(uiRoot, 'src')),
  ...walk(join(appRoot, 'packages', 'shell', 'src')),
];
const product = new Map(productFiles.map((f) => [f, readFileSync(f, 'utf8')] as const));

const DECL = /^export\s+(?:async\s+)?(?:function|const|class)\s+([A-Za-z_$][\w$]*)/gm;

/**
 * Orphans, as `name @ path`.
 *
 * Counted over **references that are not the declaration**, so a symbol its own file uses
 * is not an orphan — see the note above.
 */
function orphans(): string[] {
  const declared = new Map<string, string>();
  for (const [file, src] of product) {
    for (const m of src.matchAll(DECL)) declared.set(m[1]!, file);
  }

  const out: string[] = [];
  for (const [name, home] of declared) {
    const word = new RegExp(`\\b${name.replace(/\$/g, '\\$')}\\b`, 'g');
    const decl = new RegExp(
      `^export\\s+(?:async\\s+)?(?:function|const|class)\\s+${name.replace(/\$/g, '\\$')}\\b`, 'gm');
    let read = false;
    for (const [file, src] of product) {
      const hits = (src.match(word) ?? []).length
        - (file === home ? (src.match(decl) ?? []).length : 0);
      if (hits > 0) { read = true; break; }
    }
    if (!read) out.push(`${name} @ ${relative(appRoot, home)}`);
  }
  return out.sort();
}

/**
 * The debt, enumerated. **This list may shrink and may not grow.**
 *
 * Grouped by what is actually going on, because «28 unused exports» is a number and
 * these are three different problems:
 */
const KNOWN = [
  /*
   * ## Fourteen data hooks nothing calls
   *
   * Each wraps a `window.rampa.*` channel, and for most of them the hook is the channel's
   * **only** reader — so the handler, the preload line and the hook are one dead path
   * three layers deep. They are not deleted here because several channels are also
   * called directly from `e2e/` (`page.evaluate(() => window.rampa…)`), so removing the
   * path is a change with a blast radius that wants reviewing rather than a tidy-up at
   * the end of a session.
   */
  'useAxes @ ui/src/data/corpus.ts',
  'useBlocks @ ui/src/data/ingest.ts',
  'useChecklist @ ui/src/data/corpus.ts',
  'useComposeDocs @ ui/src/data/compose.ts',
  'useConnections @ ui/src/data/providers.ts',
  'useCurrentProvider @ ui/src/data/providers.ts',
  'useEnsayoState @ ui/src/data/ensayo.ts',
  'useExtraction @ ui/src/data/ingest.ts',
  'useLearner @ ui/src/data/learners.ts',
  'useNameStatus @ ui/src/data/names.ts',
  'usePageImage @ ui/src/data/ingest.ts',
  'useRecordSearch @ ui/src/data/record.ts',
  'useReportData @ ui/src/data/jobs.ts',
  'useSaveDisplayPrefs @ ui/src/data/settings.ts',
  'useServices @ ui/src/data/corpus.ts',
  'useSignedOff @ ui/src/data/jobs.ts',
  'useStructureCandidates @ ui/src/data/structure.ts',

  /*
   * ## A whole component, and four helpers
   *
   * `Segmented` is a control nothing renders. `insideLearner` and `flowReady` are route
   * helpers left behind by `020`'s two moves — `flowReady` at least has a test, which is
   * exactly the case this guard says does not count.
   *
   * `looksLikeContent` was in this list on the first draft and the shrink assertion below
   * threw it out: my prototype sweep did not count same-file readers, so it produced
   * false positives. The guard caught its own inventory being wrong on the first run,
   * which is the argument for having written the second assertion at all.
   */
  'Segmented @ ui/src/components/Segmented.tsx',
  'insideLearner @ ui/src/nav/route.ts',
  'flowReady @ ui/src/nav/route.ts',
  'clearState @ ui/src/data/onboarding.ts',
  'DEFAULTS @ ui/src/data/preferences.ts',

  /*
   * ## Main-process helpers with no caller
   *
   * `resetNetworkLog` is the test harness's affordance and is arguably fine — but it is
   * called by nothing, including the tests, so it is listed rather than excused.
   * `allSucceeded` and `failedLearners` are batch summaries nothing summarises with.
   */
  'allSucceeded @ packages/shell/src/jobs/batch.ts',
  'currentKey @ packages/shell/src/ipc/keys.ts',
  'failedLearners @ packages/shell/src/jobs/batch.ts',
  'KEY_HEADING @ packages/shell/src/jobs/turn.ts',
  'recordPathFor @ packages/shell/src/ipc/record.ts',
  'resetNetworkLog @ packages/shell/src/net-counter.ts',
].sort();

describe('every export has a reader in the product', () => {
  /**
   * The assertion that matters: **no new orphan**.
   *
   * Written as a set difference in both directions so the message says which — a raw
   * `toEqual` on two thirty-item lists tells you they differ and makes you find out how.
   */
  it('adds none, and says which if it does', () => {
    const now = orphans();
    const fresh = now.filter((o) => !KNOWN.includes(o));
    expect(fresh, 'exported and read by nothing — wire it or delete it').toEqual([]);
  });

  /**
   * And the list shrinks: an entry that is no longer an orphan comes **out**.
   *
   * Without this the inventory rots into a list of names that used to mean something,
   * which is how `035` T020 spent a day claiming to be blocked by a feature that had
   * shipped.
   */
  it('and lists nothing that has since found a reader', () => {
    const now = orphans();
    const stale = KNOWN.filter((k) => !now.includes(k));
    expect(stale, 'no longer an orphan — take it out of KNOWN').toEqual([]);
  });

  /** The sweep itself works, asserted on a symbol this file can see is read. */
  it('does not call a read symbol an orphan', () => {
    // `downloadShown` is read by `PictogramSetSection`, in another file.
    expect(orphans()).not.toContain('downloadShown @ ui/src/data/pictograms.ts');
  });
});
