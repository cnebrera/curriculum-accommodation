import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { buildReport, buildAdaptPrompt, parseIR } from '../src/index.js';

/**
 * Where pictograms are off, nothing proposes them (018 T018, FR-1607).
 *
 * A tool that keeps suggesting pictograms is a tool arguing with her about how a
 * child is seen. She has answered; the answer stands until she changes it.
 */
const adapted = () => parseIR([
  '---', 'lang: es', '---', '',
  '::: {#b1 .instruction}', 'Rodea la casa.', ':::',
].join('\n'));

describe('the report is silent unless she turned them on', () => {
  it('says nothing at all when the field is absent', () => {
    const r = buildReport({ adapted: adapted() });
    expect(r.markdown).not.toMatch(/pictogram/i);
  });

  it('reports the ambiguities first when they are on', () => {
    // «He puesto 12» is a count. «Hay dos dibujos para "rana" y no he puesto
    // ninguno» is a decision she can make.
    const r = buildReport({
      adapted: adapted(),
      pictograms: {
        used: [{ blockId: 'b1', word: 'casa', id: '1001' }],
        skipped: ['«rana»: hay 2 dibujos posibles. No he puesto ninguno — elige tú.'],
      },
    });

    expect(r.markdown).toContain('## Pictogramas');
    expect(r.markdown.indexOf('elige tú')).toBeLessThan(r.markdown.indexOf('He puesto pictograma'));
    // And the licence condition, said where she reads what happened.
    expect(r.markdown).toContain('no se puede quitar');
  });

  it('says so plainly when they are on and no word matched', () => {
    const r = buildReport({ adapted: adapted(), pictograms: { used: [], skipped: [] } });
    expect(r.markdown).toContain('No he encontrado ninguna palabra');
  });
});

describe('the model is never asked about pictograms', () => {
  /**
   * Insertion is a lookup, not judgement (FR-1608). A prompt that mentioned
   * pictograms would be a model choosing pictures — the wrong-pictogram failure
   * with no traceability — and it would also let a model *suggest* them for a
   * learner whose teacher had said no.
   */
  it('the adapt prompt says nothing about them', () => {
    const { prompt } = buildAdaptPrompt({
      profile: {
        code: 'A1', axes: { COG: 3 }, works: [], avoid: [], interests: [],
        response: {}, language: {},
      } as never,
      recipes: [],
      material: '::: {#b1 .instruction}\nRodea la casa.\n:::',
    } as never);

    expect(prompt).not.toMatch(/pictogram/i);
  });

  it('nor does any recipe, which is why this is not a recipe family', () => {
    const root = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');
    const found: string[] = [];
    const walk = (dir: string): void => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) { walk(p); continue; }
        if (e.name.endsWith('.md') && /pictogram/i.test(readFileSync(p, 'utf8'))) found.push(e.name);
      }
    };
    walk(join(root, 'recipes'));
    expect(found).toEqual([]);
  });
});
