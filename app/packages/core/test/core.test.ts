import { describe, it, expect } from 'vitest';
import { redact, findProbableNames, isClean } from '../src/redact/names.js';
import { parseRecipe, selectRecipes, applies, recipeRef } from '../src/recipes/index.js';
import { parseIR } from '../src/ir/parse.js';
import { checkProvenance, findUnaccountedBlocks, parseRecipeRef } from '../src/ir/provenance.js';
import { renderHTML, presentationFor } from '../src/render/html.js';
import { checkOutput, checkEssentialFigures } from '../src/render/check.js';
import { checkPhotocopy, contrastRatio } from '../src/render/photocopy.js';
import { costCents, formatCost, isUnusuallyExpensive } from '../src/cost/index.js';
import { buildReport } from '../src/report/index.js';
import { buildIndex } from '../src/memory/index.js';
import { buildPacket, packetToMarkdown, toShareable, isStale } from '../src/memory/handover.js';
import type { Profile } from '../src/vault/schema.js';

const profile = (axes: Record<string, 0|1|2|3>): Profile => ({
  code: 'A3', axes, works: [], avoid: [], interests: [], response: {}, language: {},
});

describe('redaction — the promise the harness could not keep', () => {
  const known = new Map([['A3', 'Lucía García'], ['B7', 'Martín']]);

  it('replaces a full name and each of its parts', () => {
    const r = redact('Lucía García no arranca. A Lucía le cuesta empezar.', known);
    expect(r.text).not.toMatch(/Luc[íi]a/);
    expect(r.text).not.toContain('García');
    expect(r.text).toContain('A3');
  });

  it('is accent- and case-insensitive, because teachers type quickly', () => {
    const r = redact('lucia y LUCÍA y Lucia', known);
    expect(r.text).not.toMatch(/luc[íi]a/i);
  });

  it('does not half-replace a longer name with a shorter one', () => {
    const r = redact('Martín Ruiz trabaja bien', new Map([['B7', 'Martín Ruiz'], ['C4', 'Martín']]));
    expect(r.text).toContain('B7');
    expect(r.text).not.toContain('Martín');
  });

  it('flags a probable name it does not know, and never rewrites it', () => {
    const r = redact('Creo que Nerea necesita lo mismo.', known);
    expect(r.flagged).toContain('Nerea');
    expect(r.text).toContain('Nerea');   // asked about, not silently changed
  });

  it('does not flag ordinary capitalised classroom words', () => {
    const found = findProbableNames('El lunes en Lengua hicimos la Unidad 4 sobre Historia.');
    expect(found).toEqual([]);
  });

  it('confirms a payload is clean', () => {
    expect(isClean(redact('Lucía va bien', known).text, known)).toBe(true);
    expect(isClean('Lucía va bien', known)).toBe(false);
  });
});

describe('recipe selection', () => {
  const mk = (id: string, axes: string, conflicts = '') => parseRecipe(
    `---\nid: ${id}\nversion: 2\naxes: [${axes}]\nscope: [exercise]\nconflicts: [${conflicts}]\nevidence: "x"\n---\nbody`,
    `${id}.md`, 'core')!;

  it('an unobserved axis keeps its recipes off — null is not zero', () => {
    const r = mk('one-task-per-page', 'COG>=2');
    expect(applies(r, profile({ COG: 3 }))).toBe(true);
    expect(applies(r, profile({ DEC: 2 }))).toBe(false);   // COG unobserved
  });

  it('records how a conflict was resolved instead of resolving it silently', () => {
    const visual = mk('visual-scaffold', 'COG>=2', 'non-visual');
    const access = mk('non-visual', 'PER-V>=2');
    const sel = selectRecipes([visual, access], profile({ COG: 3, 'PER-V': 3 } as never));
    expect(sel.resolved.length).toBe(1);
    expect(sel.resolved[0]!.kept).toBe('non-visual');
    expect(sel.resolved[0]!.because).toContain('acceso vence');
  });

  it('references a recipe by id and version, so provenance is not a moving target', () => {
    expect(recipeRef(mk('x', 'COG>=2'))).toBe('x@2');
    expect(parseRecipeRef('lectura-facil-es@3')).toEqual({ id: 'lectura-facil-es', version: 3 });
  });
});

describe('provenance doubles as an injection detector', () => {
  it('fails a block that changed without saying why', () => {
    const doc = parseIR('::: {#e1 .exercise data-from="e0"}\ntexto\n:::\n');
    const issues = checkProvenance(doc);
    expect(issues.map((i) => i.reason)).toContain('missing-recipe');
    expect(issues.map((i) => i.reason)).toContain('missing-axis');
  });

  it('accepts an untouched block and accepts marked scaffolding', () => {
    expect(checkProvenance(parseIR('::: {#b1 .explanation}\nx\n:::\n'))).toEqual([]);
    expect(checkProvenance(parseIR('::: {#s1 .scaffold}\nx\n:::\n'))).toEqual([]);
  });

  it('catches a block that derives from nothing in the original', () => {
    const original = parseIR('::: {#e1 .exercise}\na\n:::\n');
    const adapted = parseIR('::: {#e1 .exercise data-from="e1" data-recipe="r@1" data-axis="COG:3"}\na\n:::\n\n::: {#x9 .exercise}\ninjected\n:::\n');
    expect(findUnaccountedBlocks(original, adapted).map((b) => b.id)).toEqual(['x9']);
  });
});

describe('rendering', () => {
  const doc = parseIR('---\nlang: es\n---\n\n::: {#e1 .exercise data-number="4"}\nEscribe dos ejemplos.\n:::\n');

  it('carries the draft mark until sign-off, and only then drops it', () => {
    expect(renderHTML(doc)).toContain('BORRADOR');
    expect(renderHTML(doc, { signedOff: true })).not.toContain('BORRADOR');
  });

  it('preserves the original exercise number the class says out loud', () => {
    expect(renderHTML(doc)).toContain('>4.<');
  });

  it('derives presentation from axis levels, never from a profile object', () => {
    const p = presentationFor({ 'PER-V': 2, COG: 3 });
    expect(p.fontSize).toBe('24pt');
    expect(p.oneTaskPerPage).toBe(true);
  });

  it('catches learner data reaching learner-facing output', () => {
    const bad = renderHTML(parseIR('::: {#b1 .explanation}\nPerfil de A3: COG 3\n:::\n'));
    expect(checkOutput(bad, ['A3']).ok).toBe(false);
    expect(checkOutput(renderHTML(doc), ['A3']).ok).toBe(true);
  });

  it('blocks an essential figure with no description', () => {
    const d = parseIR('::: {#f1 .figure data-role="essential"}\n![x](a.png)\n:::\n');
    expect(checkEssentialFigures(d).length).toBe(1);
  });
});

describe('the photocopier', () => {
  it('flags colours that collapse to the same grey', () => {
    const issues = checkPhotocopy('<style>--ink:#111;--paper:#fff; a{color:#c62828} b{color:#2e7d32}</style>');
    expect(issues.some((i) => i.what === 'colour-collapse')).toBe(true);
  });
  it('flags text contrast below 4.5:1', () => {
    expect(checkPhotocopy('<style>--ink:#999;--paper:#fff;</style>').some((i) => i.what === 'contrast')).toBe(true);
  });
  it('passes the default palette', () => {
    expect(contrastRatio('#111', '#fff')).toBeGreaterThan(4.5);
  });
});

describe('cost is shown in the units of the worry', () => {
  it('prices a worksheet in cents', () => {
    const c = costCents({ model: 'claude-sonnet-5', inputTokens: 15_000, outputTokens: 4_000 });
    expect(c).toBeGreaterThan(0);
    expect(c).toBeLessThan(20);
    expect(formatCost(c)).toMatch(/céntimo/);
  });
  it('never reports tokens', () => {
    expect(formatCost(129)).toBe('1,29 €');
    expect(formatCost(0)).toBe('gratis');
  });
  it('warns before a job far above the usual', () => {
    const ledger = { month: '2026-09', jobs: [1, 2, 3].map((n) => ({ job: `j${n}`, cents: 5, at: '' })) };
    expect(isUnusuallyExpensive(200, ledger)).toBe(true);
    expect(isUnusuallyExpensive(6, ledger)).toBe(false);
  });
});

describe('the report leads with what was not done', () => {
  it('puts omissions before changes', () => {
    const adapted = parseIR('::: {#e1 .exercise data-from="e1" data-recipe="one-task-per-page@1" data-axis="COG:3"}\nx\n:::\n');
    const r = buildReport({ adapted, dropped: [{ id: 'e9', why: 'no pude describir la figura' }] });
    expect(r.markdown.indexOf('Lo que NO he hecho')).toBeLessThan(r.markdown.indexOf('one-task-per-page'));
    expect(r.decisions.length).toBe(1);
  });
});

describe('memory index and handover', () => {
  it('indexes the journal by recipe', () => {
    const idx = buildIndex([
      { date: '2026-09-04', recipes: ['lectura-facil-es'], scope: 'corpus', status: 'open', path: 'memory/journal/a.md', body: '' },
    ]);
    expect(idx).toContain('## lectura-facil-es');
    expect(idx).toContain('journal/a.md (corpus, open)');
  });

  it('hands over claims as unconfirmed hypotheses, never as fact', () => {
    const packet = buildPacket(
      { profile: profile({ COG: 3 }), notes: '', overlay: null, repairs: [] },
      '2026-27', 'Arranca sola si le dejas el primer ítem hecho.');
    const md = packetToMarkdown(packet);
    expect(md).toContain('no un diagnóstico');
    expect(md).toContain('sin confirmar');
    expect(md).toContain('acompaña');
  });

  it('strips every learner-scoped claim from a shareable packet', () => {
    const p = buildPacket({ profile: profile({ COG: 3 }), notes: '', overlay: null, repairs: [] }, '2026-27', 'x');
    const s = toShareable(p);
    expect(s.claims).toEqual([]);
    expect(s.containsLearnerScope).toBe(false);
  });

  it('marks a packet older than an academic year as stale', () => {
    const p = buildPacket({ profile: profile({}), notes: '', overlay: null, repairs: [] }, '2024-25', 'x');
    expect(isStale(p, '2026-27')).toBe(true);
    expect(isStale(p, '2024-25')).toBe(false);
  });
});
