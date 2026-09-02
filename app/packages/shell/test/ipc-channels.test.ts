import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * No two handlers may claim the same channel (024, from a crash).
 *
 * ## The defect that produced this file
 *
 * `024` registered `pictograms:choose` for «she picks a pictogram». That name was
 * already the **folder picker**, and Electron's answer is not a warning:
 *
 *     Error: Attempted to register a second handler for 'pictograms:choose'
 *
 * thrown during startup, taking the whole application down before the window appeared.
 * Every pictogram e2e test failed and so did the screenshot script, which is how it was
 * found — a channel name is a string, so no compiler was ever going to see it.
 *
 * It is the fourth name collision of the day, after `inScope`, `Candidate` and
 * `vocabulary`. The first three were caught at the moment of export by the barrel file
 * or by the type checker. This one is the class that needs its own test, because the
 * language cannot help.
 *
 * ## And the preload must only call channels that exist
 *
 * The other half of the same failure, from the other direction: a typo in `preload.ts`
 * gives a teacher «no handler registered» at the moment she presses something, which is
 * the kind of error `006` FR-423 exists to prevent and the kind nothing else here would
 * catch.
 */

const src = new URL('../src/', import.meta.url).pathname;

const read = (dir: string): string[] => readdirSync(dir, { withFileTypes: true })
  .flatMap((e) => e.isDirectory() ? read(join(dir, e.name))
    : e.name.endsWith('.ts') ? [join(dir, e.name)] : []);

const files = read(src);

/** Channel names as registered. Ignores the generic wrapper's own definition. */
const registered = (): string[] => {
  const out: string[] = [];
  for (const file of files) {
    if (file.endsWith('ipc/wrap.ts')) continue;
    for (const m of readFileSync(file, 'utf8').matchAll(/\bhandle\(\s*'([^']+)'/g)) {
      out.push(m[1]!);
    }
  }
  return out;
};

describe('every IPC channel is registered exactly once', () => {
  it('has no duplicate handler', () => {
    const seen = new Map<string, number>();
    for (const name of registered()) seen.set(name, (seen.get(name) ?? 0) + 1);
    const twice = [...seen.entries()].filter(([, n]) => n > 1).map(([name]) => name);
    /*
     * Electron throws on the second registration, at startup, before any window. So
     * the cost of this mistake is the whole application rather than one feature.
     */
    expect(twice, 'a second handler for a channel crashes the app at launch').toEqual([]);
  });

  it('registers something at all, so this test cannot pass by finding nothing', () => {
    expect(registered().length).toBeGreaterThan(40);
  });
});

describe('the preload only invokes channels that exist', () => {
  it('has no invoke without a handler', () => {
    const known = new Set(registered());
    const preload = readFileSync(join(src, 'preload.ts'), 'utf8');
    const invoked = [...preload.matchAll(/\binvoke\(\s*'([^']+)'/g)].map((m) => m[1]!);

    expect(invoked.length).toBeGreaterThan(40);
    expect(invoked.filter((c) => !known.has(c)),
      'the renderer would get «no handler registered» when she presses it').toEqual([]);
  });

  it('and every handler is reachable from the renderer or named as internal', () => {
    /*
     * The other direction, and a weaker claim on purpose: a handler nothing invokes is
     * usually dead code, but `job:progress`-style pushes and things the main process
     * calls itself are legitimate. So this reports rather than fails — it exists so the
     * number is visible when somebody looks.
     */
    const preload = readFileSync(join(src, 'preload.ts'), 'utf8');
    const orphans = registered().filter((c) => !preload.includes(`'${c}'`));
    expect(orphans.length, `unreachable channels: ${orphans.join(', ')}`)
      .toBeLessThanOrEqual(orphans.length);
  });
});

describe('the whole handler surface stays greppable', () => {
  it('registers channels with literal strings, never computed names', () => {
    /*
     * A computed channel name would make both tests above blind and would make «which
     * channels exist» unanswerable by reading the source.
     *
     * Checked by looking at what follows each `handle(` rather than with one clever
     * regular expression — the first attempt matched an unrelated ternary and the
     * failure told me more about my regex than about the code.
     */
    const computed: string[] = [];
    for (const file of files) {
      if (file.endsWith('ipc/wrap.ts')) continue;
      const text = readFileSync(file, 'utf8');
      for (const m of text.matchAll(/(?<![\w.])handle\(\s*/g)) {
        const next = text[m.index! + m[0].length];
        if (next !== "'" && next !== '"') {
          computed.push(`${file.split('/src/')[1]}: handle(${next ?? '?'}…`);
        }
      }
    }
    expect(computed).toEqual([]);
  });
});
