import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

/**
 * The turn's wiring, and the order that makes «complete or absent» true
 * (026 T007-T012, T017-T020, FR-2402/2403/2405/2406/2409/2411).
 *
 * `runTurn` needs a provider, a key, a vault and a window, so what is asserted here is
 * the **order of operations** — which is the whole design. Every guarantee in this
 * feature is a consequence of «the gates run on a candidate in memory; only then is
 * anything written», and an order is a property of the source, not of one execution.
 */
const repoRoot = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');
vi.mock('../src/corpus/bundle.js', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  /*
   * `governingRoot` and not `corpusRoot` (`034` T006).
   *
   * Every reader of recipes and instructions now asks «which corpus **governs**» rather
   * than «where is the bundle», because an accepted update has to reach all of them or
   * none. Mocking the old name silently stopped reaching these callers — which is the
   * seam moving, and the tests following it.
   */
  corpusRoot: () => repoRoot,
  governingRoot: async () => repoRoot,
}));

const read = (...parts: string[]): string =>
  readFileSync(join(repoRoot, 'app', ...parts), 'utf8');
const src = read('packages', 'shell', 'src', 'jobs', 'turn.ts');
const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
const at = (needle: string): number => code.indexOf(needle);

describe('verify before write, which is where every guarantee comes from', () => {
  it('nothing is written before the gates have run', () => {
    /*
     * A provider failure, a refusal, a rejected output or a crash mid-turn must leave the
     * vault byte-identical (FR-2409). That is a property of this order and not of a
     * cleanup path — a cleanup path is a thing that has to run.
     */
    const write = at('archivePrevious(vault, site)');
    expect(write).toBeGreaterThan(at('checkStructurallyComplete'));
    expect(write).toBeGreaterThan(at('findUnaccountedBlocks'));
    expect(write).toBeGreaterThan(at('declaredRefusal'));
    expect(write).toBeGreaterThan(at('revisionDiff'));
  });

  it('a refusal returns before the write, and mints nothing', () => {
    const refusal = code.slice(at('if (refusal !== null)'), at('if (truncated)'));
    expect(refusal).toContain('return fail(');
    expect(refusal).not.toContain('writeRaw');
  });

  it('an identical document mints no revision either', () => {
    // A new number on identical content would make the revision list lie about how many
    // times the document changed — and that list is what she uses to decide to walk back.
    const noChange = code.slice(at('if (diff.empty)'), at('const annotated'));
    expect(noChange).toContain("kind: 'no-change'");
    expect(noChange).not.toContain('writeRaw');
  });

  it('and the cost is recorded before any of them, because spent is spent', () => {
    expect(at('recordCost(args.job, cents)')).toBeLessThan(at('const refusal'));
  });
});

describe('the draft mark is restored structurally (FR-2403)', () => {
  it('any review block is stripped from the turn’s output', () => {
    expect(code).toContain('stripReview(stripFence(out))');
    expect(at('stripReview')).toBeLessThan(at('archivePrevious(vault, site)'));
  });

  it('and the reading fingerprint carries over, because the turn did not re-read', () => {
    // Which is what keeps `005` FR-520's stale detection honest across turns: a turn on
    // a stale sheet must stay stale, not quietly become fresh.
    expect(code).toContain('readingFingerprint(previous)');
    expect(code).toContain('stampReading(dated, readingFingerprint(previous))');
  });
});

describe('what the turn re-checks itself (FR-2405)', () => {
  it('every quantity, from the exercise, with the same verifier', () => {
    expect(code).toContain('recheckQuantities(annotated)');
    expect(code).toContain('verify(arithmetic, skill');
  });

  it('and it reports rather than repairs', () => {
    /*
     * Silently rewriting a child's exercise to fit a key is the falsification Principle
     * III forbids. The numbers on the page are hers to look at, so a mismatch is a notice
     * on the block.
     */
    const check = code.slice(at('function recheckQuantities'), at('const bareExpression'));
    expect(check).toContain('out.push');
    expect(check).not.toMatch(/content\s*=/);
  });

  it('the key is rebuilt for a composed document, in the same step', () => {
    // `021` FR-1919: a key describing exercises that no longer exist is worse than none,
    // because she marks against it in class with thirty children waiting.
    expect(code).toContain("found.of === 'composed'");
    expect(code).toContain('rewriteKey(vault, args.job');
    expect(at('rewriteKey')).toBeGreaterThan(at('await vault.writeRaw(`${site.dir}'));
  });

  it('and its answers come from the verifier, never from the turn’s output', () => {
    const key = code.slice(at('async function rewriteKey'));
    expect(key).toContain('arithmetic.solve({ expression })');
    expect(key).toContain("if (answer === 'unknown') continue");
  });
});

describe('the absences (FR-2408, FR-2411)', () => {
  it('a turn writes nothing under memory/', () => {
    // Principle VIII: nothing is remembered as a side effect. Anything worth keeping is
    // offered through the human-routed door, which is `003`'s machinery and not this.
    for (const forbidden of ['VAULT.journal', 'VAULT.memory', 'memory/', 'writeJournal']) {
      expect(code, forbidden).not.toContain(forbidden);
    }
  });

  it('her text is scanned before anything is sent', () => {
    // The **call site**, not the import — `at('sendRedacted')` finds the import line at
    // the top of the file and the assertion passes for the wrong reason.
    expect(at('unknownNamesIn([text])'))
      .toBeLessThan(at('const { stream } = sendRedacted('));
  });

  it('and the document is fenced by the one shared fence', () => {
    expect(code).toContain('buildTurnPrompt');
    expect(code).not.toContain('MATERIAL-');
  });
});

describe('the conversation file (FR-2401)', () => {
  const conversation = read('packages', 'shell', 'src', 'jobs', 'conversation.ts');

  it('lives beside the document, so the erasure already walks it', () => {
    // `003`: a conversation about a child's sheet **is** the child's data. Putting it in
    // the document's own directory makes that true by construction — no list to add it
    // to, no rule to remember.
    expect(conversation).toContain('`${site.dir}/conversation.md`');
  });

  it('is append-only and quotes no part of the document', () => {
    expect(conversation).toContain('head + lines.join');
    // A conversation carrying the document would be a second copy of it, going stale
    // line by line, in a file nobody thinks to check.
    expect(conversation).not.toContain('doc.blocks');
    expect(conversation).not.toContain('markdown');
  });

  it('and records a turn whatever its outcome, including a refusal', () => {
    expect(code).toContain('appendTurn(vault, site, { at: stamp(), text, outcome');
  });
});

describe('what the turn refuses to spend on (T013)', () => {
  it('a stale sheet, before the provider is called', () => {
    /*
     * `005` FR-520. Iterating a stale sheet bakes the stale reading in deeper — the next
     * revision inherits the fingerprint — so every turn moves her further from the
     * material she actually photographed. A refusal rather than a notice, because a
     * notice arrives with the bill.
     */
    expect(at('notFromCurrentReading')).toBeLessThan(at('const active = await activeProvider'));
    expect(code).toContain("throw new RampaError('stale-reading'");
  });

  it('and only for an adapted sheet, because a composition has no reading to be stale against', () => {
    expect(code).toContain("if (found.of === 'adapted') {");
  });
});

/**
 * A diagram never survives a turn with the old numbers (T019, `022` FR-2016).
 *
 * Reached through `022`'s mechanism rather than re-implemented: the render-time
 * cross-check compares a figure's stamped quantities against the exercise it names, and a
 * turn that changed the numbers makes them disagree — so the diagram is refused with its
 * sentence, in every modality, and the sheet survives without it.
 *
 * That is the honest outcome rather than a redraw: a diagram is drawn from a **verified**
 * exercise, and after a turn nothing has re-verified the new numbers except the notice
 * `recheckQuantities` raises. Drawing a confident picture from an unchecked change is
 * exactly what `022` FR-2003 forbids.
 */
describe('a diagram after a turn', () => {
  it('is refused rather than redrawn from numbers nothing checked', () => {
    const render = read('packages', 'core', 'src', 'render', 'figures', 'render.ts');
    expect(render).toContain('sus cantidades ya no son las del');
    // And the turn does not reach past that check to redraw anything itself.
    expect(code).not.toContain('drawFigure');
  });
});
