import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { skippedWords as inRenderer } from '../src/data/pictograms.js';
import { skippedWords as inCore, reportSkipped } from '../../packages/core/src/pictograms/match.js';

/**
 * The two copies of `skippedWords` must agree (024 T019).
 *
 * The renderer cannot import `@rampa/core` — it talks to the main process over IPC —
 * so the function that reads the report's «hay N dibujos posibles» lines exists twice.
 * A second copy of one truth is the defect this project has found five times, and the
 * only version of «they agree» worth anything is a test that runs both.
 *
 * What it protects: `core`'s copy lives beside `reportSkipped`, the function that
 * *writes* those sentences, so improving the wording there is safe. Without this test
 * it would silently stop the chooser offering anything in the renderer, and no test
 * would fail — the twelve-unread-fields failure with a string instead of a field.
 */
describe('both copies read the same sentence', () => {
  const cases = [
    ['«casa»: hay 4 dibujos posibles (1, 2, 3, 4). No he puesto ninguno — elige tú.'],
    ['«Rana»: hay 2 dibujos posibles (5, 6). No he puesto ninguno — elige tú.'],
    ['Necesita que lo decidas tú: algo', 'No he tocado el enunciado.', ''],
    [],
  ];

  for (const lines of cases) {
    it(`agree on ${JSON.stringify(lines).slice(0, 48)}`, () => {
      expect(inRenderer(lines)).toEqual(inCore(lines));
    });
  }

  it('both read what reportSkipped actually writes', () => {
    const written = reportSkipped([
      { kind: 'ambiguous', word: 'Casa', candidates: ['1', '2'] },
      { kind: 'ambiguous', word: 'ratón', candidates: ['3', '4', '5'] },
      { kind: 'none', word: 'x' },
    ]);
    expect(inCore(written)).toEqual(['casa', 'raton']);
    expect(inRenderer(written)).toEqual(['casa', 'raton']);
  });

  it('the renderer copy carries the note saying why it is a copy', () => {
    /*
     * A duplicate with no explanation is how the next person deletes the wrong one, or
     * "fixes" one and not the other.
     */
    const src = readFileSync(new URL('../src/data/pictograms.ts', import.meta.url), 'utf8');
    expect(src).toMatch(/Duplicated from `@rampa\/core`/);
    expect(src).toMatch(/pictogram-report\.test\.tsx/);
  });
});
