import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { parseAxisDefs, coversAllAxes } from '../src/axes/parse.js';
import { AXES } from '../src/vault/schema.js';

/**
 * T014 — the axis descriptors live in the corpus, and cover every axis.
 *
 * They were a literal in `AxisEditor.tsx`: calibration guidance about children,
 * in TypeScript, where no teacher could correct it. This test reads the shipped
 * corpus file, so the guidance and the schema cannot drift apart — which is the
 * failure the move would otherwise just relocate.
 */
const repoRoot = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');
const raw = readFileSync(join(repoRoot, 'instructions', 'axes.md'), 'utf8');

describe('axis descriptors come from the corpus', () => {
  const defs = parseAxisDefs(raw, 'axes.md');

  it('covers every axis the schema knows about', () => {
    expect(coversAllAxes(defs)).toBe(true);
    expect(defs).toHaveLength(AXES.length);
    // A partial file would leave an axis unlabelled on screen, which is worse
    // than a code: she would not know what she was scoring.
    for (const key of AXES) {
      expect(defs.some((d) => d.key === key), `${key} has no descriptor`).toBe(true);
    }
  });

  it('gives every axis four levels, in order, none empty', () => {
    for (const d of defs) {
      expect(d.levels, `${d.key} needs exactly four levels`).toHaveLength(4);
      d.levels.forEach((text, i) => {
        expect(text.trim().length, `${d.key} level ${i} is empty`).toBeGreaterThan(3);
      });
    }
  });

  it('names every axis in her words, never as the code', () => {
    for (const d of defs) {
      expect(d.name.length, `${d.key} has no name`).toBeGreaterThan(2);
      expect(d.name, `${d.key} is labelled with its own code`).not.toBe(d.key);
      // 006 FR-406: no project jargon anywhere she can see.
      expect(d.name).not.toMatch(/\b(axis|eje|PER-|COG|ATE|EJE|MOT|REG|CUR|DEC|LIN)\b/);
    }
  });

  it('describes observable behaviour rather than adjectives', () => {
    // The whole point of docs/axis-calibration.md: "moderate" cannot be scored
    // consistently, "loses the thread with more than three things" can. Not a
    // perfect check, but it catches a descriptor written as a bare severity.
    const adjectivesOnly = /^(leve|moderad[oa]|sever[oa]|grave|alto|bajo|medio|normal)\.?$/i;
    for (const d of defs) {
      d.levels.forEach((text, i) => {
        expect(adjectivesOnly.test(text.trim()), `${d.key} level ${i} is an adjective, not a behaviour`)
          .toBe(false);
      });
    }
  });

  it('degrades rather than throwing on a malformed file', () => {
    expect(parseAxisDefs('nada aquí')).toEqual([]);
    expect(coversAllAxes(parseAxisDefs('### `COG` · Cuántas\n0. a\n1. b\n'))).toBe(false);
  });
});
