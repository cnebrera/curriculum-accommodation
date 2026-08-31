import { describe, it, expect } from 'vitest';
import { checkObjectives, assertObjectives, assertAnchored, parseIR } from '../src/index.js';

/**
 * Generated material has to account for itself (002 T007/T008, FR-102/103/104).
 *
 * The hole this closes: `checkProvenance` exempts any block carrying
 * `data-objective`, because generated material keys to an objective rather than to
 * a source block — which is right. But it exempts it for the attribute
 * **existing**, so `data-objective="algo"` passed every check in the pipeline.
 *
 * That is an unaccounted block with the source removed, and it is worse than the
 * adapted kind: adapted material has an original to compare against, and this
 * does not.
 */
const ASKED = ['multiplicar con llevadas', 'el ciclo del agua'];

const doc = (body: string) => parseIR(body);

describe('every generated block traces to something she asked for', () => {
  it('accepts blocks whose objective is on her list', () => {
    const d = doc(
      '::: {#b1 .exercise data-objective="multiplicar con llevadas"}\n47 × 8\n:::\n\n'
      + '::: {#b2 .explanation data-objective="el ciclo del agua"}\nEl agua...\n:::\n');
    expect(checkObjectives(d, ASKED)).toEqual([]);
  });

  /** The check that did not exist. */
  it('rejects a block whose objective is not on her list', () => {
    const d = doc('::: {#b1 .exercise data-objective="dividir por dos cifras"}\n84 ÷ 12\n:::\n');
    const issues = checkObjectives(d, ASKED);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.reason).toBe('unknown-objective');
    // Names what it claimed, so she can see what the model decided to teach.
    expect(issues[0]!.message).toContain('dividir por dos cifras');
  });

  it('rejects a block that names no objective and is not scaffolding', () => {
    const d = doc(
      '::: {#b1 .exercise data-objective="multiplicar con llevadas"}\n47 × 8\n:::\n\n'
      + '::: {#b2 .explanation}\nUn párrafo que ha aparecido solo.\n:::\n');
    const issues = checkObjectives(d, ASKED);
    expect(issues.map((i) => i.reason)).toEqual(['no-objective']);
  });

  /** Scaffolding is new by definition — a worked example, a word bank, a step list. */
  it('exempts scaffolding', () => {
    const d = doc(
      '::: {#b1 .exercise data-objective="multiplicar con llevadas"}\n47 × 8\n:::\n\n'
      + '::: {#s1 .scaffold}\nAsí se hace el primero: ...\n:::\n');
    expect(checkObjectives(d, ASKED)).toEqual([]);
  });

  it('exempts the model\'s note to the teacher', () => {
    const d = doc(
      '::: {#b1 .exercise data-objective="multiplicar con llevadas"}\n47 × 8\n:::\n\n'
      + '::: {#n1 .report-notes}\nNo he podido anclar una frase.\n:::\n');
    expect(checkObjectives(d, ASKED)).toEqual([]);
  });

  it('rejects a document with no generated block at all', () => {
    const d = doc('::: {#s1 .scaffold}\nsólo apoyo\n:::\n');
    expect(checkObjectives(d, ASKED).map((i) => i.reason)).toContain('no-blocks');
  });
});

describe('the check cannot mark its own homework', () => {
  /**
   * The objectives come from **her**, not from the document. Passing the
   * document's own front matter would let a model add an objective and then
   * satisfy it.
   */
  it('ignores an objective the document declares but she never asked for', () => {
    const d = parseIR(
      '---\nkind: generated\nobjectives:\n  - "dividir por dos cifras"\n---\n\n'
      + '::: {#b1 .exercise data-objective="dividir por dos cifras"}\n84 ÷ 12\n:::\n');
    // The front matter agrees with the block. Her list does not.
    expect(checkObjectives(d, ASKED).map((i) => i.reason)).toEqual(['unknown-objective']);
  });
});

describe('comparing objectives the way she might retype them', () => {
  it('ignores case, accents and extra spaces', () => {
    const d = doc('::: {#b1 .exercise data-objective="Multiplicar  con LLEVADAS"}\n47 × 8\n:::\n');
    expect(checkObjectives(d, ASKED)).toEqual([]);
  });

  it('does not accept a different objective that merely looks similar', () => {
    const d = doc('::: {#b1 .exercise data-objective="multiplicar sin llevadas"}\n21 × 3\n:::\n');
    expect(checkObjectives(d, ASKED).map((i) => i.reason)).toEqual(['unknown-objective']);
  });
});

describe('it fails the render, like unaccounted content does', () => {
  it('throws rather than reporting', () => {
    const d = doc('::: {#b1 .exercise data-objective="otra cosa"}\nx\n:::\n');
    expect(() => assertObjectives(d, ASKED)).toThrow(/objetivos/);
  });

  it('does not throw when everything accounts for itself', () => {
    const d = doc('::: {#b1 .exercise data-objective="multiplicar con llevadas"}\n47 × 8\n:::\n');
    expect(() => assertObjectives(d, ASKED)).not.toThrow();
  });
});

describe('no anchor, no composition', () => {
  /**
   * FR-102, and the failure this specification was designed around: a model asked
   * for curricular facts produces plausible ones, and a generated worksheet that
   * teaches something wrong is worse than a dense one that teaches it right.
   */
  it('refuses rather than warning', () => {
    expect(() => assertAnchored({ kind: 'generated' })).toThrow(/apoyarlo/);
    expect(() => assertAnchored({ anchor: '   ' })).toThrow();
  });

  it('accepts the least she can give', () => {
    // «The three sentences you would say out loud in class» is an anchor.
    expect(() => assertAnchored({ anchor: 'Las plantas fabrican su alimento con la luz.' }))
      .not.toThrow();
  });
});
