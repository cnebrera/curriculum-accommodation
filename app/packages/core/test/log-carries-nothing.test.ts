import { describe, it, expect } from 'vitest';
import { sanitise, formatLine, Logger, type LogRecord } from '../src/log.js';

/**
 * The log carries nothing about a learner (036 T001/T002, FR-3401).
 *
 * ## Why this is written down now, for code that shipped weeks ago
 *
 * `packages/core/src/log.ts` has obeyed one hard rule since it was written — «a log line
 * may never contain learner data, her material, or a name» — and **no specification said
 * so and no test asserted it**. `036` exists because a privacy-relevant subsystem whose
 * rules live only in a comment is one that changes the day somebody refactors a comment
 * away.
 *
 * It matters more now than it did: `036` puts the log on a screen and in her clipboard.
 *
 * ## The defence is structural, and that is worth asserting as such
 *
 * `sanitise()` runs inside `Logger.log`, so every one of the 114 call sites goes through
 * it whatever it passes. Principle IX asks for exactly that — «where a rule protecting
 * this can be enforced by code that does not consult the model, it MUST be; structural
 * defences outrank instructional ones» — and the first test here is that the chokepoint
 * is a chokepoint rather than a helper somebody may remember to call.
 */

describe('the sanitiser is at the chokepoint, not at the call sites', () => {
  /**
   * Through the logger, not through `sanitise` directly.
   *
   * A test that called `sanitise` would assert the function works and say nothing about
   * whether the logger uses it — which is the whole question. So this goes in through
   * `logger.info` and reads what the sink received.
   */
  it('sanitises what a call site passes, without the call site doing anything', () => {
    const seen: LogRecord[] = [];
    const log = new Logger('info');
    log.addSink((r) => seen.push(r));

    log.info('adapt.done', { name: 'Lucía', code: 'C47', pages: 3 });

    expect(seen[0]!.data).toEqual({ name: '[omitido]', code: 'C47', pages: 3 });
  });

  /** A broken sink must never break the application (FR-3405, at this level). */
  it('a sink that throws does not reach the caller', () => {
    const log = new Logger('info');
    log.addSink(() => { throw new Error('disk full'); });
    expect(() => log.info('anything')).not.toThrow();
  });

  /** Below the level, nothing is even sanitised — there is no record to leak. */
  it('writes nothing below its level', () => {
    const seen: LogRecord[] = [];
    const log = new Logger('info');
    log.addSink((r) => seen.push(r));
    log.debug('noisy', { name: 'Lucía' });
    expect(seen).toEqual([]);
  });
});

describe('what sanitise removes, and what it deliberately keeps', () => {
  /** The forbidden keys, enumerated — because the list *is* the defence. */
  it('replaces every forbidden key whatever it holds', () => {
    for (const k of ['name', 'nombre', 'content', 'contenido', 'text', 'texto',
                     'body', 'payload', 'prompt', 'material', 'quote', 'source']) {
      expect(sanitise({ [k]: 'Lucía' })?.[k], k).toBe('[omitido]');
    }
  });

  /** And case does not save it: `Name` is `name`. */
  it('does not care about case', () => {
    expect(sanitise({ Name: 'Lucía' })?.['Name']).toBe('[omitido]');
    expect(sanitise({ MATERIAL: 'x' })?.['MATERIAL']).toBe('[omitido]');
  });

  /**
   * Long free text is material until proven otherwise, and becomes its length.
   *
   * Its length rather than nothing: «the prompt was 4.000 characters» is a fact a
   * diagnostic needs and carries nothing. The threshold is 120, so both sides are
   * asserted — a test that only checked the long side would pass with the rule inverted.
   */
  it('replaces long free text with its length, and leaves short values alone', () => {
    const long = 'a'.repeat(121);
    expect(sanitise({ detail: long })?.['detail']).toBe('[121 caracteres]');
    expect(sanitise({ detail: 'a'.repeat(120) })?.['detail']).toBe('a'.repeat(120));
  });

  /**
   * **A code survives, and that is the subtlety to protect.**
   *
   * A code is the pseudonym (`003`): it is what a learner is called everywhere that is
   * not her screen, and it is the only way a log line can say *which* job or *which*
   * profile it is about. Forbidding it would blind the diagnostic to the one identifier
   * it is entitled to have — so «codes, error kinds, counts, durations and vault-relative
   * paths» is the allowed set, and this asserts the first of them.
   */
  it('keeps the code, because the code is the pseudonym and not the name', () => {
    expect(sanitise({ code: 'C47', learner: 'C47' })).toEqual({ code: 'C47', learner: 'C47' });
  });

  /** Anything that is not a primitive is stringified and cut, never carried whole. */
  it('cuts a non-primitive rather than serialising it', () => {
    const out = sanitise({ profile: { axes: { COG: 3 }, name: 'Lucía' } })?.['profile'];
    expect(typeof out).toBe('string');
    expect(String(out).length).toBeLessThanOrEqual(60);
  });

  it('passes undefined through, so an eventless line has no data key', () => {
    expect(sanitise(undefined)).toBeUndefined();
  });
});

/**
 * The edge the Constitution Check found (T002).
 *
 * The forbidden-key list is **structural for the keys it knows and advisory for the ones
 * it does not**. A short string under an unlisted key is neither long enough for the
 * length rule nor named in the list, so it is written through.
 *
 * Asserted as the **current behaviour**, with the reason, rather than fixed here:
 * extending the key list is a change to the logger and `036` FR-3414 puts that out of
 * scope — «a specification that quietly redesigned the thing it was written to describe
 * would be worse than none». Recorded in research R1 so it arrives as its own decision.
 *
 * What stands between this edge and a real leak is not this function: it is `036` T013,
 * which asserts over a **real session** that no name reached the file. That is the
 * difference between «the sanitiser has a good list» and «nothing slipped».
 */
describe('the edge: a short string under a key the list does not know', () => {
  it('is written through, and the guard against that is T013 and not this list', () => {
    expect(sanitise({ child: 'Lucía' })?.['child']).toBe('Lucía');
    expect(sanitise({ alumno: 'Lucía' })?.['alumno']).toBe('Lucía');
  });
});

describe('a line is one line, whatever it carries', () => {
  /**
   * `formatLine` is what the file receives, so a value containing a newline must not
   * become two entries — a tail that starts mid-record is a tail whose first line is a
   * fragment (contracts/diagnostics.md).
   */
  it('never emits an embedded newline from a short value', () => {
    const line = formatLine({
      at: '2026-09-07T10:00:00.000Z', level: 'warn', event: 'x',
      data: sanitise({ detail: 'uno\ndos' }),
    });
    expect(line.split('\n')).toHaveLength(1);
  });

  it('omits the data section entirely when there is none', () => {
    expect(formatLine({ at: '2026-09-07T10:00:00.000Z', level: 'info', event: 'app.started' }))
      .toBe('2026-09-07T10:00:00.000Z INFO  app.started');
  });
});
