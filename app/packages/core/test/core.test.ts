import { describe, it, expect } from 'vitest';
import { redact, findProbableNames, isClean } from '../src/redact/names.js';
import {
  parseRecipe, selectRecipes, applies, recipeRef, profileGap,
} from '../src/recipes/index.js';
import { parseIR } from '../src/ir/parse.js';
import { checkProvenance, findUnaccountedBlocks, parseRecipeRef } from '../src/ir/provenance.js';
import { renderHTML, presentationFor } from '../src/render/html.js';
import { checkOutput, checkEssentialFigures } from '../src/render/check.js';
import { checkPhotocopy, contrastRatio } from '../src/render/photocopy.js';
import { costCents, formatCost, isUnusuallyExpensive, addCost, monthTotal,
         batchPromptChars, PER_SHEET_OVERHEAD } from '../src/cost/index.js';
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

  /**
   * AGE-01, decision P17 — the most serious leak the review found in the pipeline.
   *
   * A teacher's note starts with the child: «Fátima no arranca sin el primer paso
   * hecho». The rule was «flag a capital only when it is *not* sentence-initial»,
   * so an unlisted name in that position was never flagged, never asked about, and
   * left the machine — and the sixty-name list omitted Sofía (top three in Spain
   * for a decade), Fátima, Mohamed, Aya and Ainhoa, so the names most likely to be
   * unlisted were the migrant ones. Data about an identifiable minor, leaving the
   * computer, with the bias falling on the pupils over-represented in a PT's
   * caseload.
   */
  it('flags an unknown name at the start of a note, whatever the list holds', () => {
    // Not on any list, and first in the note: the exact case that leaked.
    expect(findProbableNames('Zurie no arranca sin el primer paso hecho.'))
      .toContain('Zurie');
    // And on every line of a multi-line note, because that is how notes are written.
    expect(findProbableNames('Va mejor.\nFátima necesita el enunciado en dos pasos.'))
      .toContain('Fátima');
  });

  it('knows the names the old list left out', () => {
    for (const name of ['Sofía', 'Fátima', 'Mohamed', 'Aya', 'Ainhoa', 'Youssef', 'Andreea']) {
      expect(findProbableNames(`En clase ${name} trabaja bien.`), `${name} is not known`)
        .toContain(name);
    }
  });

  it('a name that is also an ordinary word is still a name', () => {
    // `Abril` and `Rosa` were in the classroom stop-list as a month and a noun, so
    // a girl called either was unflaggable. The name set is consulted first now,
    // and the cost — an occasional question she did not need — was taken on
    // purpose: it is a minor's personal data on the other side.
    expect(findProbableNames('He hablado con Abril y con Rosa.')).toContain('Abril');
    expect(findProbableNames('He hablado con Abril y con Rosa.')).toContain('Rosa');
  });

  it('still does not fire on every sentence a note contains', () => {
    /*
     * The other half of the decision. A detector that fires constantly is one she
     * learns to dismiss, and then it protects nothing — so a sentence-initial
     * capital that is *not* the first word of its line is still left alone.
     */
    const found = findProbableNames('Trabaja mejor por la mañana. Necesita el primer paso hecho.');
    expect(found).not.toContain('Necesita');
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

  /**
   * FLU-12, decision P15 — the diagnosis arriving before the money.
   *
   * The design is right: `null` is not zero and recipes keyed on an unobserved
   * axis stay off. Read from a tutor's side it produces «esta herramienta no hace
   * nada» in week one, because the reason is invisible until the report — and the
   * report comes after the run.
   */
  describe('what the profile is not telling us yet', () => {
    const defs = [
      { key: 'COG' as const, name: 'Cuántas cosas a la vez', levels: ['a', 'b', 'c', 'd'] },
      { key: 'ATE' as const, name: 'Cuánto rato aguanta', levels: ['e', 'f', 'g', 'h'] },
    ];

    it('names the axes with nothing observed, in the corpus\'s own words', () => {
      const gap = profileGap([mk('x', 'COG>=2')], profile({ DEC: 1 }), defs,
        { selected: [], resolved: [] });
      const axes = gap.unobserved.map((u) => u.axis);
      expect(axes).toContain('COG');
      expect(axes).toContain('ATE');
      expect(axes).not.toContain('DEC');
      // The words she reads come from `instructions/axes.md`, not from code.
      expect(gap.unobserved.find((u) => u.axis === 'COG')?.name).toBe('Cuántas cosas a la vez');
      expect(gap.unobserved.find((u) => u.axis === 'COG')?.levels).toEqual(['a', 'b', 'c', 'd']);
    });

    it('says which recipes are held off, and by which observation', () => {
      const held = mk('one-task-per-page', 'COG>=2, ATE>=2');
      const gap = profileGap([held], profile({ DEC: 1 }), defs, { selected: [], resolved: [] });
      expect(gap.disabled).toEqual([{ recipe: 'one-task-per-page', axes: ['COG', 'ATE'] }]);
    });

    it('does not blame an observation for a recipe that is correctly off', () => {
      /*
       * The half that makes this usable. A recipe off because the axis **was**
       * observed, at a level below its threshold, is correctly off — and telling
       * her to go and observe it would send her to change a profile that is right.
       */
      const held = mk('lectura-facil', 'DEC>=2');
      const gap = profileGap([held], profile({ DEC: 1 }), defs, { selected: [], resolved: [] });
      expect(gap.disabled).toEqual([]);
    });

    it('counts what will actually be applied, which is the number she is deciding on', () => {
      const on = mk('applies', 'DEC>=1');
      const gap = profileGap([on], profile({ DEC: 1 }), defs,
        { selected: [on], resolved: [] });
      expect(gap.willApply).toBe(1);
      expect(gap.disabled).toEqual([]);
    });
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

  /**
   * The banner is one line on page one. On paper, a worksheet is several sheets
   * that get separated, and page three on its own has to say it is unreviewed
   * too — so the mark is also a per-page print watermark.
   *
   * This existed only in the Pandoc template until ADR 0006 removed it, which is
   * how a divergence between two renderers loses a safeguard quietly. Pinned here
   * so it cannot happen again.
   */
  it('watermarks every printed page while unsigned', () => {
    const draft = renderHTML(doc);
    expect(draft).toContain('@media print');
    expect(draft).toContain('main::before');
    expect(draft).toContain('PENDIENTE DE REVISIÓN');
    expect(renderHTML(doc, { signedOff: true })).not.toContain('main::before');
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
    expect(c).not.toBeNull();
    expect(c!).toBeGreaterThan(0);
    expect(c!).toBeLessThan(20);
    expect(formatCost(c!)).toMatch(/céntimo/);
  });
  it('never reports tokens', () => {
    expect(formatCost(129)).toBe('1,29 €');
    /*
     * The figure and **not** a hedge (2026-09-07).
     *
     * It returned «unos 6 céntimos», and that «unos» is an estimate's word inside the
     * function that also formats what she has already spent — so the rail's badge said
     * «Llevas **unos** 6 céntimos este mes» about a number recorded in her own cost
     * file, and both estimate call sites said «unos unos». Whoever estimates says
     * «unos»; this says the amount.
     */
    expect(formatCost(6)).toBe('6 céntimos');
    expect(formatCost(1)).toBe('1 céntimo');
    /*
     * «nada», not «gratis». This function formats what **she has spent**, and «gratis» is
     * the vocabulary of a plan somebody is selling — «Este mes: gratis» reads as a
     * promotion that expires, in an application whose whole pitch is that there is
     * nothing to sell. Carlos read it exactly that way.
     */
    expect(formatCost(0)).toBe('nada');
  });
  /*
   * The defect this closes, in three assertions (2026-09-01).
   *
   * `costCents` fell back to `{ input: 3, output: 15 }` — roughly Claude's prices — for
   * **any** model it did not know, and it knows four while the catalogue offers six
   * services. The `compatible` adapter reports the model the corpus names, so a teacher
   * on Groq (free) was shown euros she had not spent.
   */
  it('refuses to price a model it does not know, rather than inventing one', () => {
    expect(costCents({ model: 'llama-3.3-70b-versatile', inputTokens: 15_000, outputTokens: 4_000 })).toBeNull();
    expect(costCents({ model: 'mistral-large-latest', inputTokens: 15_000, outputTokens: 4_000 })).toBeNull();
    expect(costCents({ model: 'deepseek-chat', inputTokens: 15_000, outputTokens: 4_000 })).toBeNull();
  });

  it('makes one unpriced chunk make the whole job unpriced', () => {
    // `+` would read null as zero, turning «no sé» into «nada» — the same lie, quieter.
    expect(addCost(4, 3)).toBe(7);
    expect(addCost(4, null)).toBeNull();
    expect(addCost(null, 4)).toBeNull();
  });

  it('leaves the unpriced jobs out of what counts as usual', () => {
    /*
     * Counted as zero they would drag the average down and stop the gate firing when it
     * should — a free-tier month teaching the gate that everything is expensive.
     */
    const l = {
      month: '2026-09',
      jobs: [
        { job: 'a', cents: 40, at: '' }, { job: 'b', cents: 40, at: '' },
        { job: 'c', cents: 40, at: '' }, { job: 'd', cents: null, at: '' },
        { job: 'e', cents: null, at: '' },
      ],
    };
    expect(monthTotal(l)).toEqual({ cents: 120, unknown: 2 });
    expect(isUnusuallyExpensive(100, l)).toBe(false);
    expect(isUnusuallyExpensive(200, l)).toBe(true);
  });

  it('warns before a job far above the usual', () => {
    const ledger = { month: '2026-09', jobs: [1, 2, 3].map((n) => ({ job: `j${n}`, cents: 5, at: '' })) };
    expect(isUnusuallyExpensive(200, ledger)).toBe(true);
    expect(isUnusuallyExpensive(6, ledger)).toBe(false);
  });

  /**
   * `005` FR-515 · three ordinary sheets can be an unusual bill.
   *
   * The whole point of this function is the **times**: the material is read once and a
   * prompt is assembled per learner, so a batch of three costs about three times a
   * batch of one. Priced as one it would slide straight past the gate that exists for
   * exactly that case, which is why this is asserted as a ratio rather than against a
   * hard-coded total — a total would pin `PER_SHEET_OVERHEAD` and say nothing about the
   * property that matters.
   */
  it('prices a batch as one prompt per sheet, not one prompt', () => {
    const one = batchPromptChars(1_000, 1);
    const three = batchPromptChars(1_000, 3);

    expect(one).toBe(1_000 + PER_SHEET_OVERHEAD);
    expect(three).toBe(one * 3);
    // And the overhead is real: an empty batch of three is not free of prompt.
    expect(batchPromptChars(0, 3)).toBe(PER_SHEET_OVERHEAD * 3);
  });

  /**
   * Nothing to price is zero, and never a bare overhead.
   *
   * `learners.length === 0` reaches this on the way to a run that `runAdapt` refuses
   * anyway, and «unos 0,02 €» for a batch of nobody is a figure about nothing.
   */
  it('a batch of nobody costs nothing', () => {
    expect(batchPromptChars(5_000, 0)).toBe(0);
    expect(batchPromptChars(5_000, -1)).toBe(0);
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
