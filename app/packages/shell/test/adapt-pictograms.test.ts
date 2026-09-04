import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseIR } from '@rampa/core';

/**
 * The seam: does anything actually pass the names and her vocabulary? (2026-09-02.)
 *
 * ## Why this file exists
 *
 * An independent review mutated two lines in `jobs/adapt.ts` and ran the whole suite:
 *
 * - `names: await nameWordSet()` → `names: new Set()` — FR-1610, «a learner's name
 *   never gets a pictogram», deleted. **1.458/1.458 passed.**
 * - `chosen: await chosenWords(lang)` → `new Map()` — `024`'s «lo eliges una vez y vale
 *   para todos» disconnected. **1.458/1.458 passed.**
 *
 * `nameWords` had unit tests. `matchWord` had unit tests given a hand-built name set.
 * Nothing asserted that the two were ever joined — and the accent defect this feature
 * fixed lived *in that join*, not in either end of it.
 *
 * The comments in `adapt.ts` above both lines explain why they must not be removed. A
 * comment is not a test.
 */

const NAMES = new Set(['maria', 'nebrera']);
const CHOSEN = new Map([['casa', '2317']]);

const SET = {
  root: '/set',
  byLanguage: new Map([['es', new Map([
    ['maria', ['7']],            // the set genuinely has a pictogram for the name
    ['casa', ['1001', '2317']],  // ambiguous: only her choice can resolve it
    ['perro', ['9']],            // the set is sure
  ])]]),
  images: new Set(['7', '9', '1001', '2317']), from: new Map(), popularity: new Map(),
};

/* Everything that needs Electron or a vault, replaced. */
vi.mock('../src/ipc/names.js', () => ({
  nameWordSet: async () => NAMES,
  knownNames: async () => new Map(),
  unknownNamesIn: async () => [],
}));
vi.mock('../src/pictograms/bring.js', () => ({
  chosenWords: async () => CHOSEN,
}));
vi.mock('../src/pictograms/access.js', () => ({
  currentPictogramSet: async () => SET,
  pictogramImagesFor: async () => new Map(),
  configuredRoot: async () => ({ root: '/set', missing: false }),
  fsReader: { list: async () => [], readText: async () => null },
  pictogramSettingsDir: () => '/tmp',
  usePictogramSettingsDir: () => {},
  imageReader: { list: async () => [], readBytes: async () => null },
}));

const doc = () => parseIR([
  '---', 'lang: es', '---', '',
  '::: {#b1 .instruction}',
  'María lleva la casa del perro.', ':::',
].join('\n'));

const learner = (over: Record<string, unknown> = {}) => ({
  code: 'K42',
  profile: {
    pictograms: { enabled: true, scope: 'all' as const },
    ...over,
  },
} as never);

let apply: typeof import('../src/jobs/adapt.js').applyPictogramsIfSheSaidSo;

beforeEach(async () => {
  ({ applyPictogramsIfSheSaidSo: apply } = await import('../src/jobs/adapt.js'));
});

describe('the names actually reach the matcher (FR-1610)', () => {
  it('gives «María» no pictogram, though the set has one for it', async () => {
    const out = await apply(doc(), learner(), doc());
    expect(out).not.toBeNull();
    const words = out!.used.map((u) => u.word.toLowerCase());
    expect(words, 'a child\'s name must never carry a pictogram').not.toContain('maría');
    expect(words).not.toContain('maria');
    // And the id the set holds for it never lands anywhere.
    expect(out!.used.map((u) => u.id)).not.toContain('7');
  });

  it('still does the rest of the sheet', async () => {
    // Or the test above would pass with pictograms turned off entirely.
    const out = await apply(doc(), learner(), doc());
    expect(out!.used.map((u) => u.word)).toContain('perro');
  });
});

describe('her vocabulary actually reaches the matcher (024 FR-2214)', () => {
  it('uses the drawing she chose for an ambiguous word', async () => {
    const out = await apply(doc(), learner(), doc());
    const casa = out!.used.find((u) => u.word === 'casa');
    expect(casa, '«casa» is ambiguous; only her choice can resolve it').toBeDefined();
    expect(casa!.id).toBe('2317');
  });

  it('and records that the choice is where it came from (Principle VI)', async () => {
    const out = await apply(doc(), learner(), doc());
    const casa = out!.used.find((u) => u.word === 'casa') as unknown as { source: string };
    // A wrong pictogram has to trace back to *which* decision made it.
    expect(casa.source).toBe('vocabulary');
  });
});

describe('and it still refuses in the three ways it always did', () => {
  it('says nothing at all when she never turned it on', async () => {
    expect(await apply(doc(), learner({ pictograms: { enabled: false } }), doc())).toBeNull();
  });

  it('tells her in the report when there is no set', async () => {
    vi.doMock('../src/pictograms/access.js', () => ({
      currentPictogramSet: async () => null,
      pictogramImagesFor: async () => new Map(),
      configuredRoot: async () => null,
      fsReader: { list: async () => [], readText: async () => null },
      pictogramSettingsDir: () => '/tmp',
      usePictogramSettingsDir: () => {},
      imageReader: { list: async () => [], readBytes: async () => null },
    }));
    vi.resetModules();
    const { applyPictogramsIfSheSaidSo: fresh } = await import('../src/jobs/adapt.js');
    const out = await fresh(doc(), learner(), doc());
    expect(out!.used).toEqual([]);
    expect(out!.skipped.join(' ')).toMatch(/juego de pictogramas/);
    vi.doUnmock('../src/pictograms/access.js');
  });
});
