import { describe, it, expect } from 'vitest';
import { parseIR, learnerFacing } from '../src/ir/parse.js';
import { renderHTML } from '../src/render/html.js';
import { checkCompleteness, checkStructurallyComplete } from '../src/ir/completeness.js';
import { parseReportNotes } from '../src/report/notes.js';
import { buildReport } from '../src/report/index.js';
import { checkProvenance } from '../src/ir/provenance.js';

const original = parseIR(`---
lang: es
extraction:
  verified: true
---

::: {#b1 .explanation}
Las plantas fabrican su alimento.
:::

::: {#e4 .exercise data-number="4"}
Escribe dos ejemplos.
:::

::: {#e5 .exercise data-number="5"}
Rodea los autótrofos.
:::
`);

describe('silent content loss is caught by arithmetic (007 FR-516)', () => {
  /**
   * The project's oldest failure mode: curricular content quietly gone from a
   * worksheet that reads perfectly well. Nothing about it is visible in the
   * finished PDF, which is why it needs counting rather than a reviewer's eye.
   */
  it('fails when a source block simply vanishes', () => {
    const adapted = parseIR(`::: {#b1a .explanation data-from="b1" data-recipe="x@1" data-axis="LIN:2"}
Las plantas fabrican su alimento.
:::

::: {#e4a .exercise data-number="4" data-from="e4" data-recipe="x@1" data-axis="COG:3"}
Escribe un ejemplo.
:::
`);
    const issues = checkCompleteness(original, adapted);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.blockId).toBe('e5');
  });

  it('passes when the drop is declared in .report-notes', () => {
    const adapted = parseIR(`::: {#b1 .explanation data-from="b1" data-recipe="x@1" data-axis="LIN:2"}
Las plantas fabrican su alimento.
:::

::: {#e4 .exercise data-number="4" data-from="e4" data-recipe="x@1" data-axis="COG:3"}
Escribe un ejemplo.
:::

::: {#notes .report-notes}
- [dropped:e5] Necesita rodear, y este alumno no accede por vista.
:::
`);
    expect(checkCompleteness(original, adapted)).toHaveLength(0);
  });

  it('passes when a block is kept untouched', () => {
    const adapted = parseIR(`::: {#b1 .explanation}
Las plantas fabrican su alimento.
:::

::: {#e4 .exercise data-number="4"}
Escribe dos ejemplos.
:::

::: {#e5 .exercise data-number="5"}
Rodea los autótrofos.
:::
`);
    expect(checkCompleteness(original, adapted)).toHaveLength(0);
  });

  it('accepts several source blocks merged into one', () => {
    const adapted = parseIR(`::: {#m1 .exercise data-from="e4 e5" data-recipe="x@1" data-axis="COG:3"}
Junto.
:::

::: {#b1 .explanation}
Las plantas fabrican su alimento.
:::
`);
    expect(checkCompleteness(original, adapted)).toHaveLength(0);
  });
});

describe('a truncated response fails instead of being repaired shorter (007 FR-517)', () => {
  it('detects an unclosed fence', () => {
    const issues = checkStructurallyComplete(`::: {#a .exercise}
Empieza y se corta`);
    expect(issues.some((i) => i.kind === 'truncated')).toBe(true);
  });

  it('detects an empty response', () => {
    expect(checkStructurallyComplete('   ').some((i) => i.kind === 'truncated')).toBe(true);
  });

  it('accepts a well-formed document', () => {
    expect(checkStructurallyComplete(`::: {#a .exercise}\nBien.\n:::\n`)).toHaveLength(0);
  });
});

describe('the model\'s channel into the report (T087)', () => {
  const doc = parseIR(`::: {#e1 .exercise data-from="e1" data-recipe="x@1" data-axis="COG:3"}
Uno.
:::

::: {#notes .report-notes}
- [dropped:e5] La tabla necesita razonamiento espacial.
- [flag] El ejercicio 7 roza el cambio de criterio.
- Mantuve el conector "porque".
:::
`);

  it('parses drops, flags and prose separately', () => {
    const notes = parseReportNotes(doc);
    expect(notes.dropped).toEqual([{ id: 'e5', why: 'La tabla necesita razonamiento espacial.' }]);
    expect(notes.flags).toEqual(['El ejercicio 7 roza el cambio de criterio.']);
    expect(notes.other).toEqual(['Mantuve el conector "porque".']);
  });

  it('never reaches the learner\'s sheet', () => {
    const html = renderHTML(doc);
    expect(html).not.toContain('report-notes');
    expect(html).not.toContain('razonamiento espacial');
    expect(html).toContain('Uno.');
    expect(doc.blocks.filter(learnerFacing).map((b) => b.id)).toEqual(['e1']);
  });

  it('leads the report with what needs her decision', () => {
    const report = buildReport({ adapted: doc });
    expect(report.notDone[0]).toContain('Necesita que lo decidas tú');
    expect(report.notDone.some((n) => n.includes('Quité el bloque "e5"'))).toBe(true);
    expect(report.markdown).toContain('Mantuve el conector');
  });

  it('is exempt from the provenance rule, like scaffolding', () => {
    expect(checkProvenance(doc)).toHaveLength(0);
  });
});
