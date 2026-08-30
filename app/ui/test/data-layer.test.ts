import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';

/**
 * The seam between the screens and the IPC surface (013 T017, FR-1107, SC-1103).
 *
 * 19 of about 25 components called `window.rampa.*` directly. That is not a
 * tidiness complaint — it produced three concrete defects, each of which had to
 * be fixed once per component and was therefore fixed in some of them:
 *
 *   * **No loading state.** `useState([])` plus `.then(setState)` renders an
 *     empty control while the data is in flight, and an empty control when there
 *     genuinely is nothing. A teacher reads both as "I have no learners".
 *   * **No error state.** A bare `void promise.then(...)` turns a rejection into
 *     an unhandled rejection nobody sees. The screen stays blank for ever.
 *   * **Undecoded errors** (FR-1109). The domain `kind` crosses IPC encoded in
 *     the message, so a caller must run `fromWire` and then look the kind up in
 *     her language. Three components did. The rest showed Electron's own
 *     wrapper: English, with the channel name in it.
 *
 * Fixing those in one place only works if there IS one place, and nothing but a
 * test keeps it that way — the next screen is one `window.rampa.` away from
 * starting the pattern again, and it will typecheck, lint and render fine.
 */
const uiSrc = join(dirname(new URL(import.meta.url).pathname), '..', 'src');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.tsx?$/.test(full) ? [full] : [];
  });
}

const files = walk(uiSrc).map((path) => ({
  path: relative(uiSrc, path),
  source: readFileSync(path, 'utf8'),
}));

/** The one directory allowed to know that IPC exists. */
const isDataLayer = (path: string): boolean => path.startsWith('data/');

describe('the data layer is the only thing that talks to the main process', () => {
  it('has files to check at all', () => {
    // A walk that silently found nothing would make every assertion below pass.
    expect(files.length).toBeGreaterThan(20);
    expect(files.some((f) => isDataLayer(f.path))).toBe(true);
  });

  it('no screen or component reaches for window.rampa', () => {
    const offenders = files
      .filter((f) => !isDataLayer(f.path))
      .filter((f) => /window\.rampa\./.test(f.source))
      .map((f) => f.path);
    expect(offenders, 'these must go through a hook in ui/src/data/').toEqual([]);
  });

  /**
   * FR-1109, stated as the thing that actually went wrong rather than as the
   * rule. A component importing `fromWire` is a component that has taken on
   * remembering to decode — and the ones that had not taken it on were the
   * defect, so the fix is that nobody outside the data layer may.
   *
   * The *import*, not the word. The first version matched any occurrence and
   * flagged two screens whose only mention of `fromWire` was a comment saying
   * they no longer call it. A test that fails on its own explanation teaches
   * people to delete the explanation.
   */
  it('no component decodes a wire error itself', () => {
    const imported = /^\s*import\s[^;]*\bfromWire\b/m;
    const offenders = files
      .filter((f) => !isDataLayer(f.path))
      .filter((f) => imported.test(f.source))
      .map((f) => f.path);
    expect(offenders, 'errors arrive already decoded — see ui/src/data/async.ts').toEqual([]);
  });

  /**
   * The data layer is allowed to touch IPC; it is not allowed to render. A hook
   * that returns JSX would be a screen in the wrong drawer, and the loading,
   * error and empty states have exactly one place they may be drawn (`Loaded`).
   *
   * Checked by extension rather than by looking for tags: the first version of
   * this scanned for `<Something>` and flagged every `Async<T>` and
   * `Promise<string | null>` in the layer. Markup needs `.tsx`, so `.tsx` is the
   * honest question.
   */
  it('the data layer holds no markup except the one component that renders the three states', () => {
    const offenders = files
      .filter((f) => isDataLayer(f.path))
      .filter((f) => f.path.endsWith('.tsx'))
      .map((f) => f.path)
      .filter((p) => p !== join('data', 'Loaded.tsx'));
    expect(offenders).toEqual([]);
  });
});
