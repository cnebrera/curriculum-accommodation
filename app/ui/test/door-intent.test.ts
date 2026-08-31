import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import {
  emptyIntent, reduceIntent, intentReady, whatIsMissing, type Intent,
} from '../src/door/intent.js';

/**
 * What the door produces (016 T001/T002, contracts/door.md).
 *
 * Written before the screens, because the rules that matter are rules about a
 * value rather than about a layout: no default door, no default kind, and going
 * back keeps what she typed. A screen can be reviewed into compliance; a reducer
 * either does this or fails.
 */
const src = readFileSync(
  join(dirname(new URL(import.meta.url).pathname), '..', 'src', 'door', 'intent.ts'), 'utf8');

describe('nothing is chosen for her', () => {
  it('starts with no door and no kind', () => {
    // A pre-selected «adaptar» is how `002` stays unreachable while appearing to
    // be offered.
    expect(emptyIntent()).toEqual({ learners: [], work: null, kind: null });
  });

  it('is not ready until she has said all three', () => {
    let i = emptyIntent();
    expect(intentReady(i)).toBe(false);
    i = reduceIntent(i, { type: 'learner/add', code: 'A1' });
    expect(intentReady(i)).toBe(false);
    i = reduceIntent(i, { type: 'work/set', work: 'adapt' });
    expect(intentReady(i)).toBe(false);
    i = reduceIntent(i, { type: 'kind/set', kind: 'exam' });
    expect(intentReady(i)).toBe(true);
  });

  /** `013` FR-1105: the action says what is missing rather than going grey. */
  it('says what is missing, one thing at a time', () => {
    const i = emptyIntent();
    expect(whatIsMissing(i)).toContain('para quién');
    expect(whatIsMissing(reduceIntent(i, { type: 'learner/add', code: 'A1' })))
      .toContain('qué quieres hacer');

    const withWork = reduceIntent(
      reduceIntent(i, { type: 'learner/add', code: 'A1' }),
      { type: 'work/set', work: 'adapt' });
    expect(whatIsMissing(withWork)).toContain('qué es');
    expect(whatIsMissing(reduceIntent(withWork, { type: 'kind/set', kind: 'exam' }))).toBeNull();
  });
});

describe('the first learner is the first, not the only one', () => {
  /** FR-1411. Learner-first was chosen knowing this is what it costs. */
  it('keeps them in the order she picked', () => {
    let i = emptyIntent();
    for (const code of ['C3', 'A1', 'B2']) i = reduceIntent(i, { type: 'learner/add', code });
    expect(i.learners).toEqual(['C3', 'A1', 'B2']);
  });

  it('does not add the same learner twice', () => {
    let i = reduceIntent(emptyIntent(), { type: 'learner/add', code: 'A1' });
    i = reduceIntent(i, { type: 'learner/add', code: 'A1' });
    expect(i.learners).toEqual(['A1']);
  });

  it('lets her remove one without clearing the rest', () => {
    let i = emptyIntent();
    for (const code of ['A1', 'B2']) i = reduceIntent(i, { type: 'learner/add', code });
    i = reduceIntent(i, { type: 'learner/remove', code: 'A1' });
    expect(i.learners).toEqual(['B2']);
  });
});

describe('going back does not clear what she typed', () => {
  /** FR-1408. She may switch doors having typed an objective and come back. */
  it('keeps the learners when she changes the door', () => {
    let i = reduceIntent(emptyIntent(), { type: 'learner/add', code: 'A1' });
    i = reduceIntent(i, { type: 'work/set', work: 'compose' });
    i = reduceIntent(i, { type: 'work/set', work: 'adapt' });
    expect(i.learners).toEqual(['A1']);
  });

  /**
   * The kind is the one thing that must not survive the switch, and for a reason
   * rather than for tidiness: on the compose branch the kind is a fact about what
   * was produced, and carrying «examen» across would assert that a composed
   * practice sheet is an exam.
   */
  it('drops the kind when the door changes, because it means something else there', () => {
    let i = reduceIntent(emptyIntent(), { type: 'work/set', work: 'adapt' });
    i = reduceIntent(i, { type: 'kind/set', kind: 'exam' });
    i = reduceIntent(i, { type: 'work/set', work: 'compose' });
    expect(i.kind).toBeNull();
  });

  it('does not drop it when she re-picks the same door', () => {
    let i = reduceIntent(emptyIntent(), { type: 'work/set', work: 'adapt' });
    i = reduceIntent(i, { type: 'kind/set', kind: 'exam' });
    i = reduceIntent(i, { type: 'work/set', work: 'adapt' });
    expect(i.kind).toBe('exam');
  });

  it('clears everything only when she asks', () => {
    let i = reduceIntent(emptyIntent(), { type: 'learner/add', code: 'A1' });
    i = reduceIntent(i, { type: 'reset' });
    expect(i).toEqual(emptyIntent());
  });
});

describe('no barrier gets anywhere near this', () => {
  /**
   * Principle V, structurally. `015` proved the version of this that matters: a
   * field that exists is a field that eventually gets rendered, and a grid of
   * children sortable by their barriers is a league table of disability.
   */
  it('has no axis anywhere in the module', () => {
    /*
     * Axis codes as standalone uppercase tokens, case-sensitively — my first
     * version was `/ATT/i`, which flagged the word «matter» in a comment. A test
     * that fails on a correct line is a test somebody deletes rather than fixes,
     * and this project has now produced that mistake five times.
     *
     * «sort» and «order» are deliberately **not** banned as prose: the reducer's
     * comment explaining that her order is preserved and encodes nothing is a line
     * that should exist. The structural guarantee for ordering is elsewhere —
     * `015`'s filter accepts no ordering, asserted over its own signatures.
     */
    for (const code of ['VIS', 'AUD', 'MOT', 'ATT', 'LEC', 'COM', 'MEM', 'LEN', 'EMO']) {
      expect(src, `intent.ts mentions ${code}`).not.toMatch(new RegExp(`\\b${code}\\b`));
    }
    for (const word of ['axis', 'axes', 'severity', 'diagnos']) {
      expect(src, `intent.ts mentions ${word}`).not.toMatch(new RegExp(`\\b${word}`, 'i'));
    }
  });

  it('is a plain value with three fields and no more', () => {
    const i: Intent = emptyIntent();
    expect(Object.keys(i).sort()).toEqual(['kind', 'learners', 'work']);
  });
});
