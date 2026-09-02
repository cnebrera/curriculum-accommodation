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
 * The same defect, one layer down: a **payload field** nobody reads (the thirteenth).
 *
 * `024` sent the pictogram download's progress over `job:progress` as
 * «3.140 de 13.802» and `PictogramSetSection` never subscribed. The consequence was
 * 2 min 45 s of «Trayéndolos…» with no bar, on a 157 MB download — and it was found by
 * Carlos asking for a progress bar, not by any test. The task for it was already
 * ticked.
 *
 * A prop is destructured, so the guard above can see it. An IPC payload field is a
 * property on an interface, sent by the main process and read — or not — by whatever
 * subscribes. Same signature, one layer down, and just as mechanical: every field the
 * renderer *declares* it receives must appear somewhere in the renderer.
 */
describe('every field the renderer declares it receives is read', () => {
  it('reads every field of Progress', async () => {
    const jobs = await readFile(join(uiRoot, 'data', 'jobs.ts'), 'utf8');
    const block = /export interface Progress \{([\s\S]*?)\n\}/.exec(jobs)?.[1] ?? '';
    expect(block, 'the Progress interface must be findable').not.toBe('');

    const fields = [...block.matchAll(/^\s{2}(\w+)\??:/gm)].map((m) => m[1]!);
    expect(fields.length, 'and must have fields').toBeGreaterThan(2);

    const all = (await Promise.all((await walk(uiRoot)).concat(
      join(uiRoot, 'data', 'jobs.ts'), join(uiRoot, 'data', 'ingest.ts'),
    ).map((f) => readFile(f, 'utf8')))).join('\n');

    const unread = fields.filter((f) => {
      // Read as `p.done`, destructured as `{ done }`, or named in a payload literal.
      const uses = new RegExp(`[.{,\\s]${f}\\b`, 'g');
      const hits = [...all.matchAll(uses)].length;
      // One hit is the declaration itself.
      return hits <= 1;
    });
    expect(unread,
      'a progress field the main process sends and no screen reads').toEqual([]);
  });
});
