import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { Vault } from '../src/vault/io.js';
import { loadLearner, saveProfile } from '../src/vault/profile.js';
import { learnerProfile } from '../src/vault/paths.js';
import { axisLevelOf, AXES, type Profile } from '../src/vault/schema.js';
import { parseRecipe, selectRecipes, type Recipe } from '../src/recipes/index.js';
import { buildAdaptPrompt } from '../src/prompt/adapt.js';

/**
 * What a profile with a single CUR does **today** (032 T001, SC-3002, FR-3005).
 *
 * ## Why this is written before the field exists
 *
 * `032` adds `cur_areas` — a per-area curricular level beside the general one — and
 * promises that a profile which does not use it behaves exactly as it does now. A
 * promise about «exactly as now» is testable only against a record of now, and this file
 * is that record: written green against code that has never heard of areas, and **never
 * edited afterwards**. A baseline written once the field exists is a baseline written to
 * fit what the field already does, which is how a regression gets ratified.
 *
 * The same argument `selection-baseline.test.ts` made for `012` T001 and `021` made for
 * the answer key. It is not a test of correctness — several expectations below are merely
 * what is. That is the point: what changes becomes visible in the diff.
 *
 * ## The five surfaces a CUR value reaches
 *
 * Found by following `axisLevelOf`'s callers, which is the whole set: the lookup itself,
 * recipe selection over the real corpus, the prompt's profile line, the presentation map
 * the renderer receives, and the file on disk. If `032` changes any of these for a
 * profile with no `cur_areas`, one of these cases fails.
 *
 * `jobs/print.ts` is a shell module and cannot be imported here (it pulls in Electron),
 * so its map is pinned by reproducing the one expression it uses — `Object.fromEntries(
 * AXES.map(...))` — beside an assertion that the expression is still what `print.ts`
 * contains. A copied expression that silently stops matching its original is worse than
 * no test, so the file is read and matched.
 */
const repoRoot = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');

const profile = (axes: Record<string, 0 | 1 | 2 | 3>): Profile => ({
  code: 'C01', axes, works: [], avoid: [], interests: [],
  response: {}, language: {},
} as Profile);

describe('the lookup, for a profile with one CUR', () => {
  it('answers the general value, and null where nobody observed', () => {
    const p = profile({ CUR: 2, COG: 1 });
    expect(axisLevelOf(p, 'CUR')).toBe(2);
    expect(axisLevelOf(p, 'COG')).toBe(1);
    // Never 0 for «unknown»: `011`'s no-guessing rule, and the reason an absent
    // per-area pair must fall back rather than read as zero (FR-3001).
    expect(axisLevelOf(p, 'ATE')).toBeNull();
  });

  it('CUR 0 is a value and not an absence', () => {
    expect(axisLevelOf(profile({ CUR: 0 }), 'CUR')).toBe(0);
  });
});

/* ── Recipe selection, over the corpus that ships ────────────────────────────── */

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((e) => {
    const p = join(dir, e);
    return statSync(p).isDirectory() ? walk(p)
      : (p.endsWith('.md') && !p.endsWith('README.md') ? [p] : []);
  });
}

const corpus: Recipe[] = (() => {
  const root = join(repoRoot, 'recipes');
  const out: Recipe[] = [];
  for (const f of walk(root)) {
    const origin = f.includes('/conflicts/') ? 'conflict' : f.includes('/lang/') ? 'lang' : 'core';
    const r = parseRecipe(readFileSync(f, 'utf8'), f.slice(root.length + 1), origin);
    if (r) out.push(r);
  }
  return out;
})();

const selected = (p: Profile): string[] =>
  selectRecipes(corpus, p, 'es').selected.map((r) => r.id).sort();

describe('recipe selection, for a profile with one CUR', () => {
  it('the corpus is loaded at all', () => {
    // A baseline over an empty corpus records nothing and passes for ever.
    expect(corpus.length).toBeGreaterThanOrEqual(8);
  });

  /*
   * Pinned by comparison rather than by a snapshot of ids.
   *
   * What SC-3002 promises is that the CUR value keeps producing the selection it
   * produces now — and the sharpest statement of that is that CUR at 0, 2 and 3 over
   * an otherwise identical profile select the *same* recipes, because no recipe in the
   * corpus is keyed on CUR at all. If `032` accidentally makes a per-area lookup change
   * what the general value selects, these stop being equal.
   */
  it('CUR does not move the selection today, at any level', () => {
    const base = selected(profile({ COG: 2, ATE: 2 }));
    expect(base.length).toBeGreaterThan(0);
    for (const level of [0, 1, 2, 3] as const) {
      expect(selected(profile({ COG: 2, ATE: 2, CUR: level })),
        `CUR ${level} must select what it selects today`).toEqual(base);
    }
  });

  it('and no recipe in the corpus is conditioned on CUR', () => {
    /*
     * Recorded because it is the premise of the case above, and because `032`'s T022
     * asks for a BACKLOG note about a future CUR-conditioned recipe: the day one exists,
     * this fails and whoever wrote it has to answer «which area?» before it may ship.
     */
    const keyed = corpus.filter((r) => r.axes.some((c) => c.axis === 'CUR')).map((r) => r.id);
    expect(keyed).toEqual([]);
  });
});

/* ── The prompt ─────────────────────────────────────────────────────────────── */

describe('the prompt line, for a profile with one CUR', () => {
  const promptFor = (p: Profile): string => buildAdaptPrompt({
    profile: p,
    recipes: [],
    material: '::: {#b1 .exercise}\n1. 2 × 3 =\n:::\n',
  }).prompt;

  it('names every axis once, with CUR among them, and «sin observar» for the rest', () => {
    const out = promptFor(profile({ CUR: 2 }));
    expect(out).toContain('CUR: 2');
    for (const axis of AXES) {
      if (axis === 'CUR') continue;
      expect(out, `${axis} must still be reported unobserved`).toContain(`${axis}: sin observar`);
    }
  });

  it('the axis line is one line, in AXES order, and separated by « · »', () => {
    /*
     * The shape and not only the content: `032` T013 makes this line carry the effective
     * per-area value plus the pairs as data, and «the general still reads the same way»
     * is a claim about the line a model sees, not about a substring existing somewhere.
     */
    const line = promptFor(profile({ CUR: 1, COG: 3 }))
      .split('\n').find((l) => l.includes('CUR: 1') && l.includes(' · '));
    expect(line).toBe(AXES.map((a) => `${a}: ${a === 'CUR' ? 1 : a === 'COG' ? 3 : 'sin observar'}`)
      .join(' · '));
  });
});

/* ── The presentation map the renderer receives ─────────────────────────────── */

describe('the levels map handed to the renderer', () => {
  it('is one entry per axis, with null for the unobserved', () => {
    const p = profile({ CUR: 3, 'PER-V': 1 });
    const levels = Object.fromEntries(AXES.map((a) => [a, axisLevelOf(p, a)]));
    expect(Object.keys(levels).sort()).toEqual([...AXES].sort());
    expect(levels['CUR']).toBe(3);
    expect(levels['PER-V']).toBe(1);
    expect(levels['COG']).toBeNull();
  });

  it('and that is still the expression `jobs/print.ts` uses', () => {
    // The copied expression above is only a baseline while it is the same expression.
    const src = readFileSync(join(repoRoot, 'app/packages/shell/src/jobs/print.ts'), 'utf8');
    expect(src).toContain('Object.fromEntries(AXES.map((a) => [a, axisLevelOf(learner.profile, a)]))');
  });
});

/* ── The file on disk ───────────────────────────────────────────────────────── */

describe('a profile nobody detailed is not touched by loading and saving it', () => {
  const handWritten = `---
code: C09
axes:
  CUR: 2
  COG: 1
works:
  - Le funciona empezar el primero conmigo
avoid:
  - Nada con cuenta atrás
interests:
  - dinosaurios
response:
  default: short
language:
  instruction: es
---
`;

  it('load → save leaves the same fields, with no cur_areas invented', async () => {
    const v = new Vault(await mkdtemp(join(tmpdir(), 'rampa-curcompat-')));
    await v.writeRaw(learnerProfile('C09'), handWritten);

    const { profile: loaded } = await loadLearner(v, 'C09');
    expect(axisLevelOf(loaded, 'CUR')).toBe(2);

    await saveProfile(v, loaded);
    const after = (await v.readRaw(learnerProfile('C09'))) ?? '';

    /*
     * Not byte-identical: `writeDoc` re-serialises the front matter, so key order and
     * quoting are the writer's, and asserting on bytes would be asserting on YAML's
     * formatting rather than on her data. What must hold is that every field survives
     * and **nothing new appears** — `cur_areas` must not be written into a profile
     * nobody detailed, because a written empty map is what would bump her vault's
     * schema version for no reason (FR-3005, quickstart §6.4).
     */
    expect(after).not.toContain('cur_areas');
    for (const fragment of ['CUR: 2', 'COG: 1', 'dinosaurios', 'cuenta atrás',
                            'Le funciona empezar el primero conmigo']) {
      expect(after, `«${fragment}» must survive a round-trip`).toContain(fragment);
    }

    // And it re-loads to the same answers, which is the property the round-trip is for.
    const { profile: again } = await loadLearner(v, 'C09');
    expect(axisLevelOf(again, 'CUR')).toBe(2);
    expect(again.interests).toEqual(['dinosaurios']);
  });
});
