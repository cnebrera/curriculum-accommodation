import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import {
  buildStructure, isGenerated, resolveDocument, whyNoDocument, startedFor, sourceOfEntry,
  Vault, jobIR, type PictogramSet,
} from '../src/index.js';

/**
 * The builder, and the one precedence (028 T002/T006, FR-2603/2605/2606, quickstart §2).
 *
 * ## The whole design in one sentence
 *
 * The builder resolves nothing itself. Every drawing on an agenda comes from `matchWord`
 * — override ▸ vocabulary ▸ set ▸ nothing — which is the same ladder an adapted worksheet
 * walks, so a choice she makes while building an agenda serves her worksheets too and a
 * word she overrode for one child stays overridden here.
 *
 * That is a claim about **structure**, not about care, so the last test in this file
 * asserts it at source level: no access to the set's keyword maps outside `match.ts`. A
 * second lookup is how four rungs quietly become five, and the fork would be invisible
 * until a teacher noticed that the same word got different pictures in two places.
 */
const SET: PictogramSet = {
  root: '/fixture',
  byLanguage: new Map([['es', new Map([
    ['desayuno', ['1001']],
    ['patio', ['2001']],
    ['casa', ['3001', '3002', '3003', '3004']],
    ['lucia', ['9001']],
  ])]]),
  images: new Set(['1001', '2001', '3001', '3002', '3003', '3004', '9001', '7777', '8888']),
  from: new Map(),
  popularity: new Map(),
};

const build = (
  items: Array<{ word: string; label?: string }>,
  opts: Parameters<typeof buildStructure>[0] extends infer A
    ? A extends { overrides?: infer O; chosen?: infer C; names?: infer N }
      ? { overrides?: O; chosen?: C; names?: N } : never
    : never = {},
) => buildStructure({
  kind: 'agenda', title: 'Mañana del lunes', items, language: 'es', set: SET,
  forLearner: 'AL-07', created: '2026-09-07', ...opts,
});

/** The `word=id` pairs a block records, in order. */
const pictoOf = (built: ReturnType<typeof build>, i: number): string | undefined =>
  built.doc.blocks[i]?.attrs['data-picto'];

describe('every drawing comes from the one ladder', () => {
  it('a word with a single drawing in the set is matched from the set', () => {
    const built = build([{ word: 'desayuno' }]);
    expect(pictoOf(built, 0)).toContain('1001');
    expect(built.gaps).toEqual([]);
  });

  it('her vocabulary beats the set', () => {
    const built = build([{ word: 'casa' }], { chosen: new Map([['casa', '3002']]) });
    expect(pictoOf(built, 0)).toContain('3002');
    // And it resolves what would otherwise be ambiguous, which is what choosing is for.
    expect(built.gaps).toEqual([]);
  });

  it('and a per-learner override beats her vocabulary', () => {
    const built = build([{ word: 'casa' }], {
      overrides: { casa: '7777' },
      chosen: new Map([['casa', '3002']]),
    });
    expect(pictoOf(built, 0)).toContain('7777');
  });
});

describe('refusal over guessing', () => {
  it('four candidates is a declared gap, and the word comes back for choosing', () => {
    const built = build([{ word: 'casa' }]);
    // No `data-picto` at all: a declared gap is the absence plus the block saying so,
    // never a guessed id.
    expect(pictoOf(built, 0)).toBeUndefined();
    expect(built.gaps).toHaveLength(1);
    expect(built.gaps[0]).toMatchObject({ kind: 'ambiguous', word: 'casa' });
    // Verbatim, so the screen can offer the same chooser `024` already has.
    expect((built.gaps[0] as { candidates: string[] }).candidates).toHaveLength(4);
  });

  it('a word with no candidate renders, with the gap stated and no report noise', () => {
    const built = build([{ word: 'asamblea' }]);
    expect(built.doc.blocks[0]!.content).toContain('asamblea');
    expect(pictoOf(built, 0)).toBeUndefined();
    /*
     * Reported as `none` rather than dropped: the screen needs to know the word has no
     * drawing so it can say so on the page, and «most words have none» is why this is
     * not something she is asked to fix.
     */
    expect(built.gaps[0]).toMatchObject({ kind: 'none', word: 'asamblea' });
  });

  it('a child\'s name gets nothing, and is not reported as a miss either', () => {
    /*
     * The set has a drawing for «lucia» and it must not be used (`018` FR-1610). A
     * pictogram of a girl beside a child's own name on his agenda is not something either
     * of them asked for — and reporting it as a gap would put her name in a report.
     */
    const built = build([{ word: 'Lucía' }], { names: new Set(['lucia']) });
    expect(pictoOf(built, 0)).toBeUndefined();
    expect(built.doc.blocks[0]!.content).toContain('Lucía');
    /*
     * `gaps` is **empty**, not «contains only a name».
     *
     * The first version of this asserted `gaps.some(g => g.kind !== 'name')` is false —
     * which is satisfied by pushing the name into `gaps` too, since its `kind` is
     * `'name'`. Mutation caught it: reporting a name puts a child's name in a report,
     * and the assertion that was supposed to forbid that could not tell.
     */
    expect(built.gaps).toEqual([]);
  });
});

describe('her order is the order, and the output is a fact about the input', () => {
  it('a label prints instead of the word, and the word is still what was looked up', () => {
    /*
     * «lavarse las manos» is what the drawing is found by; «Lavarse las manos con jabón»
     * is what a child reads on the strip. Losing the label silently would leave her
     * wondering why the longer text she typed never appears — and nothing in a document
     * comparison would show it, which is why this is its own case.
     */
    const built = build([{ word: 'desayuno', label: 'Desayuno en el comedor' }]);
    expect(built.doc.blocks[0]!.content).toBe('Desayuno en el comedor');
    expect(pictoOf(built, 0)).toContain('1001');
    // The pair records the word she searched by, not the label she prints.
    expect(pictoOf(built, 0)).toContain('desayuno=');
  });

  it('nothing is sorted, deduped or completed', () => {
    const built = build([
      { word: 'patio' }, { word: 'desayuno' }, { word: 'patio' },
    ]);
    expect(built.doc.blocks.map((b) => b.content.trim())).toEqual(['patio', 'desayuno', 'patio']);
  });

  it('same args, byte-identical document (SC-2602)', () => {
    /*
     * Determinism is the promise that makes «reprint it in March and it is the same
     * agenda» true, and it is also what makes this material free: no clock inside, no
     * randomness, no model. `created` is supplied by the caller for exactly that reason.
     */
    const items = [{ word: 'desayuno' }, { word: 'casa' }, { word: 'asamblea' }];
    expect(build(items).markdown).toBe(build(items).markdown);
  });

  it('the front matter carries what every consumer needs and no more', () => {
    const { doc } = build([{ word: 'desayuno' }]);
    expect(doc.frontMatter['source']).toBe('structure');
    expect(doc.frontMatter['structure']).toBe('agenda');
    expect(doc.frontMatter['for_learner']).toBe('AL-07');
    expect(doc.frontMatter['language']).toBe('es');
    expect(doc.frontMatter['created']).toBe('2026-09-07');
  });
});

describe('the structural rule: one lookup, in one place (T006)', () => {
  const appRoot = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..');

  const walk = (dir: string): string[] => {
    const out: string[] = [];
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules' || entry === 'out' || entry.startsWith('.')) continue;
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) out.push(...walk(path));
      else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(path);
    }
    return out;
  };

  it('the readers of the set\'s keyword index are these, and each for a stated reason', () => {
    /*
     * `set.byLanguage` is the word → ids index, and reading it to answer «what drawing
     * does this word get» is what resolving means. A second module doing that is a second
     * ladder — the one that knows about her overrides, her vocabulary and names, and
     * whichever subset the other one reimplemented. The fork shows up as one word getting
     * different pictures on an agenda and on a worksheet, and nobody suspects the code,
     * because both look right on their own.
     *
     * A list with a reason per entry rather than «nothing else touches it», because the
     * first draft of this asserted the latter and flagged three files, none of which
     * resolves anything: `vocabulary.ts` has a `byLanguage` of its **own** (her chosen
     * words, a different map with the same name), and `ipc/pictograms.ts` lists the
     * languages a folder contains. A pattern loose enough to catch those is a pattern
     * that gets silenced rather than obeyed.
     *
     * `bring.ts` is the one that genuinely reads the index, and it is allowed to for a
     * reason worth writing down: it asks **which candidates exist** so she can choose
     * between them. That is the question whose answer `matchWord` refuses to guess — so
     * it is the complement of resolution, not a second copy of it.
     */
    const readers = [join(appRoot, 'packages'), join(appRoot, 'ui')]
      .flatMap(walk)
      .filter((f) => /\bset(\?)?\.byLanguage\b|reading\.set\.byLanguage/.test(
        readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '')))
      .map((f) => f.replace(`${appRoot}/`, ''))
      .sort();

    expect(readers, 'a second lookup is how four rungs become five').toEqual([
      // Resolves a word to a drawing. The one ladder: override ▸ vocabulary ▸ set ▸ nothing.
      'packages/core/src/pictograms/match.ts',
      // Offers the candidates she chooses between — the question `matchWord` refuses.
      'packages/shell/src/pictograms/bring.ts',
      // Says which languages a folder contains. Never asks about a word.
      'packages/shell/src/ipc/pictograms.ts',
    ].sort());
  });

  it('and the builder itself contains no lookup at all', () => {
    // The contract's own sentence, asserted where it is cheapest to break: every drawing
    // on a structure document comes through `matchWord` or comes from nowhere.
    const src = readFileSync(join(appRoot, 'packages/core/src/structure/build.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
    expect(src).not.toMatch(/byLanguage/);
    expect(src).toContain('matchWord(');
  });
});

describe('a structure job is a job (T004/T005, FR-2604)', () => {
  const built = build([{ word: 'desayuno' }, { word: 'patio' }]);

  it('`isGenerated` accepts it, so every path that serves composed material serves it', () => {
    /*
     * One disjunct rather than a path of its own. Printing, sign-off, the draft mark and
     * the record all key on this — a parallel branch would be four places to keep in
     * step, and the one that got forgotten would be the one a teacher used.
     */
    expect(isGenerated(built.doc)).toBe(true);
  });

  it('and an ingested reading is still not printable', () => {
    // What the three generated sources have in common is that **Rampa produced the page**.
    // A reading is a document somebody else wrote that Rampa read, and handing it back
    // with Rampa's marks on it is not material.
    for (const source of ['photos', 'pegado', 'pdf']) {
      expect(isGenerated({ frontMatter: { source } })).toBe(false);
    }
  });

  it('resolves for its learner and is refused to another', async () => {
    const vault = new Vault(await mkdtemp(join(tmpdir(), 'rampa-struct-')));
    await vault.writeRaw(jobIR('job-a'), built.markdown);

    const mine = await resolveDocument(vault, 'job-a', 'AL-07');
    expect(mine.of).toBe('composed');
    expect(mine).toMatchObject({ learner: 'AL-07' });

    /*
     * Another child's agenda is not «not yet adapted» — it is not his. Handing back a
     * strip written for one learner when she asked about another would print.
     */
    const theirs = await resolveDocument(vault, 'job-a', 'OTRO-01');
    expect(theirs.of).toBe('none');
    expect(whyNoDocument(theirs as Extract<typeof theirs, { of: 'none' }>))
      .toContain('adapt');
  });

  it('`startedFor` reads its learner, which is what erasure and the record need', () => {
    expect(startedFor(built.doc.frontMatter)).toBe('AL-07');
  });

  it('the record calls it what it is, never «composed from objectives: —»', () => {
    /*
     * The row is what she reads to find something again. Folded into `composed`, an
     * agenda would print «Lo pedí así: » with an empty list after it: a row describing
     * the wrong kind of work, in the screen whose whole job is finding work again.
     */
    expect(sourceOfEntry(built.doc.frontMatter, []))
      .toEqual({ of: 'structure', kind: 'agenda' });
    const sequence = buildStructure({
      kind: 'secuencia', items: [{ word: 'patio' }], language: 'es', set: SET,
      forLearner: 'AL-07', created: '2026-09-07',
    });
    expect(sourceOfEntry(sequence.doc.frontMatter, []))
      .toEqual({ of: 'structure', kind: 'secuencia' });
  });
});
