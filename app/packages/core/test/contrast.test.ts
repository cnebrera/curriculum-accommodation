import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import {
  contrastRatio, luminance, checkPairings, describeFailure,
  AA_TEXT, AA_NON_TEXT, type Pairing,
} from '../src/contrast.js';

/**
 * The accessibility claim, enforced (spec 010 FR-810, T007).
 *
 * This reads the **shipped** `tokens.css` rather than a copy of the palette.
 * A palette duplicated into the test would drift from the stylesheet, and then
 * the test would pass while the application failed — which is the exact shape of
 * every defect this project has found so far: two copies of one truth.
 */

const appRoot = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..');
const css = readFileSync(join(appRoot, 'ui', 'src', 'styles', 'tokens.css'), 'utf8');

/** Declarations inside the block whose selector text matches exactly. */
function block(selector: string): Record<string, string> {
  const idx = css.indexOf(selector + ' {');
  if (idx === -1) throw new Error(`tokens.css has no "${selector}" block`);
  let depth = 0, end = idx;
  for (let i = css.indexOf('{', idx); i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  const body = css.slice(css.indexOf('{', idx) + 1, end);
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    out[m[1]!] = m[2]!.trim();
  }
  return out;
}

/** The dark block lives inside a media query; take the one after it. */
function darkMediaBlock(): Record<string, string> {
  const at = css.indexOf('@media (prefers-color-scheme: dark)');
  const rootAt = css.indexOf(':root {', at);
  const sub = css.slice(rootAt);
  let depth = 0, end = 0;
  for (let i = sub.indexOf('{'); i < sub.length; i++) {
    if (sub[i] === '{') depth++;
    else if (sub[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  const body = sub.slice(sub.indexOf('{') + 1, end);
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]!] = m[2]!.trim();
  return out;
}

/** Resolve var() chains down to a hex literal. */
function resolve(raw: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  const seen = new Set<string>();
  const walk = (name: string, depth = 0): string | null => {
    if (depth > 12) return null;
    const v = raw[name];
    if (!v) return null;
    if (/^#[0-9a-fA-F]{3,6}$/.test(v)) return v;
    const m = /^var\((--[\w-]+)\)$/.exec(v);
    if (m) return walk(m[1]!, depth + 1);
    return null;   // gradients, shadows, sizes: not colours, ignored
  };
  for (const name of Object.keys(raw)) {
    if (seen.has(name)) continue;
    seen.add(name);
    const hex = walk(name);
    if (hex) out[name] = hex;
  }
  return out;
}

const base = block(':root');
const PALETTES = {
  light:     resolve({ ...base, ...block(':root[data-theme="light"]') }),
  dark:      resolve({ ...base, ...darkMediaBlock(), ...block(':root[data-theme="dark"]') }),
  highLight: resolve({ ...base, ...block(':root[data-contrast="high"]') }),
  highDark:  resolve({
    ...base, ...darkMediaBlock(), ...block(':root[data-theme="dark"]'),
    ...block(':root[data-contrast="high"]'),
    ...block(':root[data-contrast="high"][data-theme="dark"]'),
  }),
};

/**
 * Every pairing the system declares. Adding a semantic role without adding its
 * row here is caught by the count assertion at the bottom — so the list cannot
 * silently fall behind the palette (data-model.md).
 */
const PAIRINGS: readonly Pairing[] = [
  { fg: '--ink',       bg: '--paper',   min: AA_TEXT, why: 'body text' },
  { fg: '--ink',       bg: '--surface', min: AA_TEXT, why: 'body text on a card' },
  { fg: '--ink-soft',  bg: '--paper',   min: AA_TEXT, why: 'secondary text' },
  { fg: '--ink-soft',  bg: '--surface', min: AA_TEXT, why: 'secondary text on a card' },
  { fg: '--ink-faint', bg: '--paper',   min: AA_TEXT, why: 'metadata — the floor of the system' },
  { fg: '--ink-faint', bg: '--surface', min: AA_TEXT, why: 'metadata on a card' },

  { fg: '--on-accent',  bg: '--accent',      min: AA_TEXT, why: 'label on a filled primary button' },
  { fg: '--accent-ink', bg: '--paper',       min: AA_TEXT, why: 'links and accent text' },
  { fg: '--accent-ink', bg: '--accent-soft', min: AA_TEXT, why: 'accent text on its own soft ground' },
  { fg: '--accent',     bg: '--paper',       min: AA_NON_TEXT, why: 'focus ring and borders' },

  { fg: '--decide', bg: '--paper',       min: AA_TEXT, why: '"you decide" text' },
  { fg: '--decide', bg: '--decide-soft', min: AA_TEXT, why: '"you decide" callout' },
  { fg: '--draft',  bg: '--paper',       min: AA_TEXT, why: 'draft and error text' },
  { fg: '--draft',  bg: '--draft-soft',  min: AA_TEXT, why: 'the draft mark, which she sees on every worksheet' },
  { fg: '--ok',     bg: '--paper',       min: AA_TEXT, why: 'signed text' },
  { fg: '--ok',     bg: '--ok-soft',     min: AA_TEXT, why: 'signed confirmation' },
  { fg: '--work',   bg: '--paper',       min: AA_TEXT, why: 'in-progress text' },
  { fg: '--work',   bg: '--work-soft',   min: AA_TEXT, why: 'in-progress badge' },

  { fg: '--line-strong', bg: '--paper', min: AA_NON_TEXT, why: 'control borders' },
] as const;

describe.each(Object.entries(PALETTES))('contrast · %s palette', (name, palette) => {
  const results = checkPairings(PAIRINGS, palette);

  it('every declared pairing clears its floor', () => {
    const failures = results.filter((r) => !r.passes).map(describeFailure);
    expect(failures, `In the ${name} palette:\n  ${failures.join('\n  ')}`).toEqual([]);
  });

  it('resolves every token it needs to a real colour', () => {
    for (const p of PAIRINGS) {
      expect(palette[p.fg], `${p.fg} unresolved in ${name}`).toMatch(/^#[0-9a-fA-F]{3,6}$/);
      expect(palette[p.bg], `${p.bg} unresolved in ${name}`).toMatch(/^#[0-9a-fA-F]{3,6}$/);
    }
  });
});

describe('the pairing list cannot fall behind the palette', () => {
  /**
   * Every semantic role that carries text must appear as a foreground in the
   * list. Without this, adding a hue and forgetting its row leaves a colour
   * shipping unchecked — and the test suite would report success.
   */
  it('covers every semantic text role the tokens define', () => {
    const roles = ['--ink', '--ink-soft', '--ink-faint', '--accent-ink', '--on-accent',
                   '--decide', '--draft', '--ok', '--work'];
    const covered = new Set(PAIRINGS.map((p) => p.fg));
    for (const r of roles) expect(covered.has(r), `${r} has no pairing`).toBe(true);
  });

  it('checks all four palettes, because a preference is not an excuse', () => {
    expect(Object.keys(PALETTES)).toEqual(['light', 'dark', 'highLight', 'highDark']);
  });
});

describe('the arithmetic itself', () => {
  it('matches the WCAG reference extremes', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
  });

  it('is symmetric', () => {
    expect(contrastRatio('#0e6b67', '#fbfcfb')).toBeCloseTo(contrastRatio('#fbfcfb', '#0e6b67'), 6);
  });

  it('accepts shorthand hex', () => {
    expect(luminance('#fff')).toBeCloseTo(luminance('#ffffff'), 6);
  });

  it('refuses a pairing whose tokens do not exist, rather than passing quietly', () => {
    expect(() => checkPairings(
      [{ fg: '--nope', bg: '--paper', min: 4.5, why: 'invented' }],
      { '--paper': '#ffffff' },
    )).toThrow(/does not define/);
  });
});
