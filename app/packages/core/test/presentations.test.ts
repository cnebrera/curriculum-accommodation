import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { SHEET_PRESENTATIONS } from '../src/render/presentations.js';
import { presentationFor } from '../src/render/html.js';

/**
 * The presentations a sheet can take, enumerated once (`038` FR-3603).
 *
 * ## The drift this exists to prevent, measured before it was written
 *
 * `presentationFor(levels)` is the single place that turns barriers into typography.
 * Anything that wants to *show* a sheet needs the list of presentations it can produce,
 * and the obvious way to get one is to write the values out. That has already been done
 * once, and it has already rotted.
 *
 * `e2e/sheet-a11y.spec.ts` used to hold three literals, and its largest was
 * `{ fontSize: '24pt', lineHeight: '2', measure: '44ch' }`. Those values are reachable —
 * 24pt and 44ch from `PER-V:2`, the line height from `DEC:1` — so it looked right. What
 * a learner with both axes actually receives is:
 *
 *     { fontSize: '24pt', measure: '44ch', ink: '#000', paper: '#fff',
 *       lineHeight: '2', letterSpacing: '0.05em', wordSpacing: '0.16em' }
 *
 * Four properties more: the maximum-contrast ink and paper, and the letter and word
 * spacing that are the entire point of `DEC`. So the accessibility sweep ran over a
 * sheet **less adapted than any real learner's** — at `#111` on white rather than the
 * `#000` a `PER-V:2` learner gets — and nothing said so, because a stale literal is
 * plausible enough that nobody rereads it.
 *
 * That is ADR 0009's argument about baselines, in a place nobody thought of as a
 * baseline. So this module enumerates **inputs** and lets the renderer produce the
 * values, and these tests are what keep it that way.
 */
const src = (f: string) =>
  readFileSync(join(dirname(new URL(import.meta.url).pathname), '..', 'src', 'render', f), 'utf8');

/** Every axis `presentationFor` actually branches on, read out of the function. */
const axesTheRendererReads = (): string[] => {
  const body = src('html.ts');
  const fn = body.slice(body.indexOf('export function presentationFor'));
  return [...new Set([...fn.slice(0, fn.indexOf('\n}')).matchAll(/at\('([A-Z-]+)',/g)]
    .map((m) => m[1]!))];
};

describe('the sheet presentations are enumerated, not written out', () => {
  it('has a set to check, so nothing below is vacuous', () => {
    expect(SHEET_PRESENTATIONS.length).toBeGreaterThan(3);
  });

  /**
   * The anti-drift assertion, and the reason the type has no field for a value.
   *
   * A rule added to `presentationFor` without an input here would produce a
   * presentation no sheet in the record ever shows — a silent gap in the one artefact
   * this project uses to judge appearance.
   *
   * **The invariant is about presentations, not about axes**, and the first draft of
   * this test got that wrong. It required every axis the renderer reads to appear in
   * some member's `levels`, and went red on `ATE` — which the renderer does read, and
   * which is deliberately absent because `ATE: 2` produces exactly the same page break
   * as `COG: 2`. Demanding a member per axis would have forced a seventh picture
   * identical to the fifth.
   *
   * So the requirement is the one that actually matters: **no presentation the renderer
   * can produce is missing a picture.** An axis may be absent, but only if setting it
   * yields something a member already yields. That is strictly stronger — it permits
   * the duplicate and catches the novel.
   */
  it('leaves no presentation the renderer can produce without a picture', () => {
    const pictured = new Set(
      SHEET_PRESENTATIONS.map((p) => JSON.stringify(presentationFor(p.levels))));

    for (const axis of axesTheRendererReads()) {
      for (const level of [1, 2, 3] as const) {
        const produced = JSON.stringify(presentationFor({ [axis]: level }));
        expect(pictured,
          `presentationFor gives ${axis}:${level} a presentation no member produces — `
          + 'either add a member for it, or it is the same as one and this will pass')
          .toContain(produced);
      }
    }
  });

  it('states no presentation value of its own, only axis levels', () => {
    /*
     * Asserted over the source, because this is a property of the *shape* rather than
     * of any instance: the moment a `presentation:` field exists, somebody fills it in
     * and the drift is back. The type is the guard; this is the guard on the type.
     */
    const body = src('presentations.ts');
    for (const knob of ['fontSize', 'lineHeight', 'measure', 'letterSpacing',
      'wordSpacing', 'paraGap', 'ink', 'paper', 'accent', 'oneTaskPerPage', 'font']) {
      const code = body.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
      expect(code, `presentations.ts names the knob "${knob}" — that is a second copy`)
        .not.toContain(knob);
    }
  });

  it('gives every member a distinct presentation, so no picture is a duplicate', () => {
    const seen = new Map<string, string>();
    for (const p of SHEET_PRESENTATIONS) {
      const key = JSON.stringify(presentationFor(p.levels));
      const already = seen.get(key);
      expect(already, `"${p.id}" renders identically to "${already}"`).toBeUndefined();
      seen.set(key, p.id);
    }
  });

  /**
   * The equality that keeps the set honest, asserted rather than assumed.
   *
   * `ATE: 2` and `COG: 2` both set `oneTaskPerPage` and nothing else, so a seventh
   * member for `ATE` would be a picture identical to the fifth. Recording it as an
   * equality means a later contributor adding that member reads *waste*, not coverage —
   * and if a rule ever makes them differ, this test says so on the day it happens.
   */
  it('knows that ATE:2 and COG:2 are the same picture', () => {
    expect(presentationFor({ ATE: 2 })).toEqual(presentationFor({ COG: 2 }));
    expect(SHEET_PRESENTATIONS.filter((p) => 'ATE' in p.levels)).toHaveLength(0);
  });

  it('gives every member a filename-safe id, since the id ends up in the record', () => {
    const ids = SHEET_PRESENTATIONS.map((p) => p.id);
    expect(new Set(ids).size, 'two members share an id').toBe(ids.length);
    for (const id of ids) {
      // No digits: a filename segment with numbers in it can read as a learner code.
      expect(id, `"${id}" is not filename-safe`).toMatch(/^[a-z]+(-[a-z]+)*$/);
    }
  });

  it('says why each member exists, for whoever reads a directory listing', () => {
    for (const p of SHEET_PRESENTATIONS) {
      expect(p.because.length, `"${p.id}" does not say what it is for`)
        .toBeGreaterThan(20);
    }
  });
});
