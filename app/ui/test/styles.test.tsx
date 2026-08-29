import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';

/**
 * The seam between the components and the stylesheets (spec 010, T031).
 *
 * This test exists because of a defect it would have caught on the day it was
 * introduced. The v2 design system renamed the button class from `.primary` to
 * `.btn .btn-primary`. The stylesheets were rewritten; fifteen `<button>` tags
 * across nine components kept the old name. Nothing failed. Typecheck cannot
 * see inside a string, the contrast test reads only the tokens, and every one of
 * those buttons rendered as 22px of unstyled browser default — below the 24×24
 * minimum of WCAG 2.2 SC 2.5.8 — for as long as nobody looked.
 *
 * A class name in a `className` and a class name in a stylesheet are two copies
 * of one truth, which is where every defect in this project has lived. So they
 * are checked against each other rather than trusted to stay in step.
 */
const uiRoot = join(dirname(new URL(import.meta.url).pathname), '..');

function walk(dir: string, ext: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full, ext);
    return full.endsWith(ext) ? [full] : [];
  });
}

const css = walk(join(uiRoot, 'src', 'styles'), '.css').map((f) => readFileSync(f, 'utf8')).join('\n');
const tsxFiles = walk(join(uiRoot, 'src'), '.tsx');

/** Every class the stylesheets define, wherever it appears in a selector. */
const defined = new Set<string>();
for (const m of css.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) defined.add(m[1]!);

/** Every class the components ask for, from static `className="..."` only. */
const used = new Map<string, string[]>();
for (const file of tsxFiles) {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(/className="([^"{}]*)"/g)) {
    for (const cls of m[1]!.split(/\s+/).filter(Boolean)) {
      used.set(cls, [...(used.get(cls) ?? []), file.replace(uiRoot + '/', '')]);
    }
  }
}

describe('components and stylesheets agree on class names', () => {
  it('uses no class the stylesheets do not define', () => {
    const orphans = [...used.entries()]
      .filter(([cls]) => !defined.has(cls))
      .map(([cls, files]) => `.${cls} — used in ${[...new Set(files)].join(', ')}, defined nowhere`);
    expect(orphans).toEqual([]);
  });

  it('found something to check, so a broken matcher cannot pass silently', () => {
    // Every assertion above is vacuously true if the walk returns nothing.
    expect(tsxFiles.length).toBeGreaterThan(10);
    expect(used.size).toBeGreaterThan(20);
    expect(defined.size).toBeGreaterThan(40);
    // And the class it was written for is genuinely gone.
    expect(defined.has('primary')).toBe(false);
  });
});

/**
 * The token contract, checked rather than reviewed (T031).
 *
 * `plan.md` states it as four rules for a human reviewer. A human reviewer read
 * the v2 rewrite and missed fifteen stale class names, so the rules that can be
 * machine-checked are machine-checked here.
 */
describe('the token contract holds in the stylesheets', () => {
  const componentCss = walk(join(uiRoot, 'src', 'styles'), '.css')
    .filter((f) => !f.endsWith('tokens.css'))
    .map((f) => ({ file: f.replace(uiRoot + '/', ''), body: readFileSync(f, 'utf8') }));

  it('declares literal colour only in the token file', () => {
    const offences: string[] = [];
    for (const { file, body } of componentCss) {
      body.split('\n').forEach((line, i) => {
        if (line.trimStart().startsWith('/*') || line.trimStart().startsWith('*')) return;
        // A literal hex or rgb() in a component rule is a value that no
        // preference and no theme can reach.
        if (/#[0-9a-fA-F]{3,8}\b/.test(line) || /\b(rgba?|hsla?)\(/.test(line)) {
          offences.push(`${file}:${i + 1} ${line.trim()}`);
        }
      });
    }
    expect(offences).toEqual([]);
  });

  it('never disables the focus ring', () => {
    // `outline: none` is how a keyboard user loses their place. Restyling the
    // ring is fine; removing it is not (SC-803).
    for (const { file, body } of componentCss) {
      const bad = body.match(/outline\s*:\s*(none|0)\s*;/g) ?? [];
      expect(bad, `${file} disables the focus ring`).toEqual([]);
    }
    expect(css).toContain(':focus-visible');
  });

  it('sizes and spaces from the scale, not from arbitrary pixels', () => {
    const offences: string[] = [];
    // Sub-pixel structural values (borders, hairlines, ring offsets) are not on
    // a spacing scale and never will be; anything larger should be a token.
    for (const { file, body } of componentCss) {
      body.split('\n').forEach((line, i) => {
        if (line.trimStart().startsWith('/*') || line.trimStart().startsWith('*')) return;
        for (const m of line.matchAll(/(?:padding|margin|gap|top|left|right|bottom)\s*:\s*([^;]+);/g)) {
          for (const px of m[1]!.matchAll(/(\d+(?:\.\d+)?)px/g)) {
            if (Number(px[1]) > 8) offences.push(`${file}:${i + 1} ${line.trim()}`);
          }
        }
      });
    }
    expect([...new Set(offences)]).toEqual([]);
  });
});
