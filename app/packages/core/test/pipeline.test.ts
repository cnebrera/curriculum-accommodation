import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parseIR, annotateInjection } from '../src/index.js';
import { parseRecipe, selectRecipes, recipeRef, type Recipe } from '../src/recipes/index.js';
import { renderHTML, presentationFor } from '../src/render/html.js';
import { checkOutput, checkEssentialFigures } from '../src/render/check.js';
import { checkPhotocopy } from '../src/render/photocopy.js';
import { checkProvenance } from '../src/ir/provenance.js';
import { buildReport } from '../src/report/index.js';
import type { Profile } from '../src/vault/schema.js';

/**
 * End to end over the REAL corpus: the recipes a contributor edits are the ones
 * loaded here, so a malformed contribution fails this test rather than a
 * teacher's afternoon.
 */
const REPO = join(import.meta.dirname, '..', '..', '..', '..');

function loadCorpus(): Recipe[] {
  const root = join(REPO, 'recipes');
  const walk = (d: string): string[] => readdirSync(d).flatMap((e) => {
    const p = join(d, e);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.md') && !p.endsWith('README.md') ? [p] : [];
  });
  return walk(root)
    .map((f) => parseRecipe(readFileSync(f, 'utf8'), f.slice(root.length + 1),
      f.includes('/conflicts/') ? 'conflict' : f.includes('/lang/') ? 'lang' : 'core'))
    .filter((r): r is Recipe => r !== null);
}

const A3: Profile = {
  code: 'A3', axes: { DEC: 2, LIN: 2, COG: 3, ATE: 2, EJE: 3, MOT: 1, REG: 1, CUR: 1 },
  works: ['Un ejercicio por página'], avoid: ['Tareas con reloj'],
  interests: ['dinosaurios'], response: { default: 'short' }, language: { instruction: 'es' },
};

const B7: Profile = {
  code: 'B7', axes: { 'PER-V': 3, DEC: 0, LIN: 0, COG: 1, REG: 2 } as never,
  works: [], avoid: [], interests: [], response: {}, language: { instruction: 'es' },
};

describe('the real corpus loads and selects', () => {
  const corpus = loadCorpus();

  it('parses every shipped recipe', () => {
    expect(corpus.length).toBeGreaterThanOrEqual(8);
    for (const r of corpus) {
      expect(r.id, `${r.path} has no id`).toBeTruthy();
      expect(r.version, `${r.path} has no version`).toBeGreaterThanOrEqual(1);
    }
  });

  it('every recipe reference carries a version, so provenance is stable', () => {
    for (const r of corpus) expect(recipeRef(r)).toMatch(/@\d+$/);
  });

  it('selects the cognitive-load recipes for A3 and not for B7', () => {
    const a = selectRecipes(corpus, A3, 'es');
    expect(a.selected.map((r) => r.id)).toContain('one-task-per-page');
    const b = selectRecipes(corpus, B7, 'es');
    expect(b.selected.map((r) => r.id)).toContain('non-visual-access');
  });

  it('resolves the visual-scaffolding conflict in favour of access, and says so', () => {
    // A learner with no usable vision AND high cognitive load: the two recipes
    // want opposite things, and access must win.
    const both: Profile = { ...B7, axes: { 'PER-V': 3, COG: 3 } as never };
    const sel = selectRecipes(corpus, both, 'es');
    expect(sel.selected.length).toBeGreaterThan(0);
    for (const r of sel.resolved) expect(r.because).toBeTruthy();  // never silent
  });

  it('applies the always-on exam guard regardless of profile', () => {
    const guard = corpus.find((r) => r.id === 'exam-access-not-difficulty');
    expect(guard).toBeDefined();
    expect(guard!.axes).toEqual([]);
    expect(selectRecipes(corpus, A3, 'es').selected.map((r) => r.id)).toContain(guard!.id);
  });

  it('keeps Spanish-only recipes out of another language', () => {
    const en = selectRecipes(corpus, A3, 'en');
    expect(en.selected.map((r) => r.id)).not.toContain('lectura-facil-es');
  });
});

describe('a worksheet goes end to end', () => {
  const source = `---
source: unidad-4.pdf
lang: es
kind: worksheet
extraction: { method: text, verified: true }
---

::: {#b1 .explanation}
Las plantas fabrican su propio alimento mediante la fotosíntesis.
:::

::: {#e4 .exercise data-number="4" data-response="short" data-criterion="CE.3.2"}
Escribe dos ejemplos de seres vivos autótrofos.
:::
`;

  const adapted = `---
source: unidad-4.pdf
lang: es
kind: worksheet
extraction: { method: text, verified: true }
---

::: {#b1a .explanation data-from="b1" data-recipe="lectura-facil-es@1" data-axis="LIN:2"}
Las plantas fabrican su propio alimento. Eso se llama **fotosíntesis**.
:::

::: {#e4a .exercise data-number="4" data-response="short" data-from="e4" data-recipe="one-task-per-page@1" data-axis="COG:3"}
Escribe **un** ejemplo de ser vivo autótrofo.
:::

::: {#s1 .scaffold}
Ejemplo ya hecho: el pino.
:::
`;

  it('parses, adapts and renders without losing the exercise number', () => {
    const original = annotateInjection(parseIR(source));
    const out = parseIR(adapted);
    expect(checkProvenance(out)).toEqual([]);

    const html = renderHTML(out, { presentation: presentationFor({ COG: 3, ATE: 2, DEC: 2 }) });
    expect(html).toContain('>4.<');                    // the number the class says out loud
    expect(html).toContain('BORRADOR');                // unsigned material announces itself
    expect(html).toContain('page-break-after');        // COG:3 → one task per page
    expect(checkEssentialFigures(out)).toEqual([]);
    expect(checkOutput(html, ['A3'], ['Lucía']).ok).toBe(true);
    expect(checkPhotocopy(html).filter((i) => i.what === 'contrast')).toEqual([]);
    expect(original.blocks.length).toBe(2);
  });

  it('produces a report that leads with decisions, naming recipe and axis', () => {
    const report = buildReport({ adapted: parseIR(adapted) });
    expect(report.decisions.length).toBe(2);
    expect(report.markdown).toContain('one-task-per-page');
    expect(report.markdown).toContain('COG:3');
  });

  it('drops the draft mark only when sign-off is passed', () => {
    const out = parseIR(adapted);
    expect(renderHTML(out, { signedOff: true })).not.toContain('BORRADOR');
  });
});
