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

/**
 * Every class the components ask for — static **and** conditional.
 *
 * ## Why the conditional half was added
 *
 * This read `className="…"` only. On 2026-09-01 Carlos reported that the compose screen
 * «no me deja seleccionar el que quiero que prepare» — it did, but nothing on screen
 * changed. Looking for others found `ScopeQuestion` doing
 * `className={scope === 'learner' ? 'primary' : ''}`, and **`.primary` has not existed
 * since the v2 rewrite renamed it to `.btn .btn-primary`** — the very rename this file's
 * header is about. So the chosen scope was marked in the accessibility tree and nowhere
 * a person could see, in the box where she tells Rampa what to change.
 *
 * It survived two years of this test because a conditional class is exactly where a
 * **selected state** lives, and a selected state is exactly what a stylesheet rename
 * breaks invisibly: the control still works, so nothing fails, and only somebody looking
 * at it notices.
 *
 * String literals inside `className={…}` are collected too. Deliberately crude — it
 * cannot follow a variable — so a class assembled from one is still invisible here. What
 * it catches is the common shape, which is the one that has now caused this twice.
 */
const used = new Map<string, string[]>();
for (const file of tsxFiles) {
  const src = readFileSync(file, 'utf8');
  const record = (raw: string): void => {
    for (const cls of raw.split(/\s+/).filter(Boolean)) {
      used.set(cls, [...(used.get(cls) ?? []), file.replace(uiRoot + '/', '')]);
    }
  };
  /*
   * Comments stripped, for **both** passes.
   *
   * The static pass read the raw file, so it had always been counting classes *quoted in
   * prose* as classes in use — invisible until a comment explaining this very fix cited
   * the broken `className="…"` it replaced, and the detector reported `.…` as an
   * undefined class. Thirteenth time a test in this project tripped over its own
   * documentation.
   */
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  for (const m of code.matchAll(/className="([^"{}]*)"/g)) record(m[1]!);
  for (const m of code.matchAll(/className=\{([^}]*)\}/g)) {
    /*
     * Only literals in **result** position — after a `?` or a `:`.
     *
     * The first version took every literal inside the braces and reported three
     * non-classes: `variant === 'wide'`, `tone === 'neutral'`. Those are values being
     * compared, not classes being applied, and a detector that cries about them is one
     * somebody switches off. The ternary is the shape that matters and this is it.
     */
    for (const lit of m[1]!.matchAll(/[?:]\s*'([^']*)'|[?:]\s*"([^"]*)"|[?:]\s*`([^`${}]*)`/g)) {
      record(lit[1] ?? lit[2] ?? lit[3] ?? '');
    }
  }
  /*
   * And the literal segments of a template — `className={`notice ${kind}`}`.
   *
   * ## Why this third pass exists (041, research R2)
   *
   * `Notice.tsx` rendered `notice ${kind}` for two years, and **none of those classes
   * existed in any stylesheet**: `.notice`, `.info`, `.warn`. Ten notices across the
   * interface painted as bare text — the learner's code explanation on «Quién es» was
   * one — and this file said nothing, because the `[^}]*` above stops at the `}` inside
   * `${kind}` and the template never reached the ternary matcher. The interpolated part
   * cannot be checked statically; the literal words around it can, and `notice` was one.
   */
  for (const m of code.matchAll(/className=\{`([^`]*)`\}/g)) {
    // `callout-${intent}`: the prefix before an interpolation is not a class, the
    // words beside it are.
    const literal = m[1]!.replace(/[\w-]*\$\{[^}]*\}[\w-]*/g, ' ');
    record(literal);
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
 * What a component may not decide for itself (041 FR-3903, FR-3904).
 *
 * 143 `style={{…}}` lived in 25 files: each a layout decision taken outside the shell
 * and outside this file's sight, and one of them — `borderTop: '1px solid var(--rule)'`
 * in `App.tsx` — named a token that no stylesheet defines, so a separator silently did
 * not draw. Every one of them mapped to a class the shell was missing
 * (`specs/041-el-acabado-visual/contracts/shell-additions.md`), so the shell gained the
 * classes and this test keeps the count at the handful that are **data**: a width that is
 * a percentage, a size that is a prop. Anything else is a fact about the shell.
 */
describe('components decide what they are, not how they are laid out', () => {
  const tsx = tsxFiles.map((f) => ({
    file: f.replace(uiRoot + '/', ''),
    code: readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''),
  }));

  /**
   * The exceptions, each with the reason it is a value rather than a decision. A file
   * here may carry exactly the number of inline styles named; one more is a failure,
   * so an exception cannot quietly grow into a habit.
   */
  const DATA_STYLES: Record<string, { count: number; why: string }> = {
    'src/components/Progress.tsx': { count: 2, why: 'width: pct% — a measurement of how far the work has got' },
    'src/components/Logo.tsx':     { count: 1, why: 'the wordmark drawn at the size its prop asks; a drawing, not a layout' },
  };

  it('writes no inline style except the ones that are data', () => {
    const offences: string[] = [];
    for (const { file, code } of tsx) {
      const n = (code.match(/style=\{\{/g) ?? []).length;
      const allowed = DATA_STYLES[file]?.count ?? 0;
      if (n > allowed) offences.push(`${file}: ${n} inline style(s), ${allowed} allowed`);
    }
    expect(offences).toEqual([]);
  });

  it('keeps the exception list honest', () => {
    for (const [file, { count }] of Object.entries(DATA_STYLES)) {
      const found = tsx.find((t) => t.file === file);
      expect(found, `${file} is in the exception list and does not exist`).toBeDefined();
      const n = (found!.code.match(/style=\{\{/g) ?? []).length;
      // Fewer is fine — the exception then shrinks here. Zero means the row is stale.
      expect(n, `${file} carries ${n} inline styles, listed as ${count}`).toBeGreaterThan(0);
      expect(n).toBeLessThanOrEqual(count);
    }
  });

  it('references no custom property the token files do not define', () => {
    const tokenCss = walk(join(uiRoot, 'src', 'styles'), '.css').map((f) => readFileSync(f, 'utf8')).join('\n');
    const definedVars = new Set<string>();
    for (const m of tokenCss.matchAll(/(--[\w-]+)\s*:/g)) definedVars.add(m[1]!);
    // Per-component custom properties set on the element itself (`--btn-h`) count too.
    const offences: string[] = [];
    const sources = [
      ...tsx,
      ...walk(join(uiRoot, 'src', 'styles'), '.css').map((f) => ({
        file: f.replace(uiRoot + '/', ''),
        code: readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''),
      })),
    ];
    for (const { file, code } of sources) {
      for (const m of code.matchAll(/var\((--[\w-]+)/g)) {
        if (!definedVars.has(m[1]!)) offences.push(`${file}: var(${m[1]}) is defined nowhere`);
      }
    }
    expect([...new Set(offences)]).toEqual([]);
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
