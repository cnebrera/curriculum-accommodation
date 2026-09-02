import { describe, it, expect } from 'vitest';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';

/**
 * Every prop a screen declares is read (the eighth instance, caught structurally).
 *
 * This project's most persistent defect is **a field written, typed, and read by
 * nothing**: the corpus journal dates, `planForget`, the injection notices,
 * `evidence:`, `recipe.scope`, the `MOT` axis, `handles`' over-claim — and then
 * `presetJobId`, which `App.tsx` passed to `AdaptScreen` after every ingest while
 * the screen ignored it. The consequence there was not cosmetic: a teacher who
 * photographed a worksheet, waited for the extraction and confirmed every page
 * landed on a screen with an empty paste box and no job. The photograph path could
 * not reach an adaptation at all, and it type-checked.
 *
 * A prop that is destructured and never mentioned again is that defect's exact
 * signature, and unlike the others it is mechanically detectable. So it is
 * detected.
 *
 * **What this cannot catch**: a prop that is read but read wrongly. That still
 * needs a test of the behaviour. This is the cheap half.
 */
const uiRoot = join(dirname(new URL(import.meta.url).pathname), '..', 'src');

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir)) {
    const p = join(dir, e);
    if ((await stat(p)).isDirectory()) out.push(...await walk(p));
    else if (p.endsWith('.tsx')) out.push(p);
  }
  return out;
}

/**
 * `export function Name({ a, b, c }` → the destructured names.
 *
 * Only the first destructuring line of an exported component, because that is
 * where props arrive. Renames (`{ t: es }`) count as read under their new name,
 * which is correct: `es` is what the body uses.
 */
function declaredProps(src: string): Array<{ component: string; props: string[] }> {
  const out: Array<{ component: string; props: string[] }> = [];
  const re = /export function (\w+)\(\{([^}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const props = m[2]!
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      // A rename binds the right-hand name; a default binds the left.
      .map((p) => (p.includes(':') ? p.split(':')[1]! : p.split('=')[0]!).trim())
      .filter((p) => /^\w+$/.test(p));
    out.push({ component: m[1]!, props });
  }
  return out;
}

describe('a declared prop is a used prop', () => {
  it('holds for every screen and component in the interface', async () => {
    const files = await walk(uiRoot);
    const offenders: string[] = [];

    for (const file of files) {
      const src = await readFile(file, 'utf8');
      for (const { component, props } of declaredProps(src)) {
        for (const prop of props) {
          // The declaration itself is one occurrence; a read is a second.
          const uses = src.match(new RegExp(`\\b${prop}\\b`, 'g'))?.length ?? 0;
          // Two: the destructuring and the type. A third is the first real read.
          if (uses < 3) offenders.push(`${relative(uiRoot, file)} · ${component} · ${prop}`);
        }
      }
    }

    expect(offenders, 'declared, typed, and read by nothing').toEqual([]);
  });

  /** The test's own regex, asserted — a scan that matches nothing passes silently. */
  it('actually finds the components it claims to scan', async () => {
    const src = await readFile(join(uiRoot, 'adapt', 'AdaptScreen.tsx'), 'utf8');
    const found = declaredProps(src);
    expect(found.map((f) => f.component)).toContain('AdaptScreen');
    expect(found[0]!.props).toContain('presetJobId');
  });
});

/**
 * The payload-field guard was deleted. Here is why, and what replaced it.
 *
 * `024` sent the download's progress over `job:progress` and `PictogramSetSection` never
 * subscribed — 2 min 45 s of «Trayéndolos…» with no bar, found by Carlos asking for one.
 * I wrote a text guard here: for each field of `Progress`, does it appear in the UI?
 *
 * A review measured it. It caught `etaSeconds` and `total2`; it missed `label`, `value`
 * and `count`, and — fatally — it missed **deleting the subscription**, which is the
 * defect it existed for. Scoping it to subscriber files improved two of those and still
 * missed the one that mattered, because the `useJobProgress` import remains in the file
 * and `at.done` keeps matching.
 *
 * A text heuristic cannot distinguish a read of *this* payload from a read of anything
 * with the same field name. Two attempts at it produced a test that looked like a
 * guarantee and was not, which is worse than no test — so it is gone, and the behaviour
 * is asserted directly in `ui/test/download-progress.test.tsx`: given a progress event,
 * the screen must render a `role="progressbar"`. That one fails when the subscription is
 * removed, which is the whole point.
 *
 * The general problem — "is this declared field ever read?" — needs the type checker,
 * not a regular expression. Recorded as backlog G36.
 */
