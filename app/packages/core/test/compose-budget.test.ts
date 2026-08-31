import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { parseComposeBudget, DEFAULT_COMPOSE_BUDGET } from '../src/index.js';

/**
 * The compose loop's bound, from the corpus (002 T011, FR-124).
 *
 * Corpus because the number will move with real material; **clamped in code**
 * because a corpus is editable content and `proposals_per_objective: 5000` would
 * spend a teacher's money five thousand times. The clamp protects her from the
 * file rather than implementing it.
 */
const root = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');

describe('the shipped file', () => {
  it('parses, and is what the loop actually runs on', () => {
    const raw = readFileSync(join(root, 'instructions', 'compose.md'), 'utf8');
    const budget = parseComposeBudget(raw);

    expect(budget.exercisesPerObjective).toBeGreaterThan(0);
    expect(budget.proposalsPerObjective).toBeGreaterThanOrEqual(budget.exercisesPerObjective);
    expect(budget.objectivesPerJob).toBeGreaterThan(0);
  });

  /**
   * The corpus is prose for a model *and* numbers for code. An edit that breaks
   * the front matter must fail here rather than silently reverting the loop to
   * defaults — which is the failure mode a previous corpus edit in this project
   * produced, and whose only symptom was the suite getting smaller.
   */
  it('is not silently falling back to the defaults', () => {
    const raw = readFileSync(join(root, 'instructions', 'compose.md'), 'utf8');
    expect(raw.startsWith('---')).toBe(true);
    expect(raw).toMatch(/^proposals_per_objective:\s*\d+$/m);
  });
});

describe('clamped, not obeyed', () => {
  const parse = (yaml: string) => parseComposeBudget(`---\n${yaml}\n---\n\n# x\n`, 'test.md');

  it('caps a number that would spend her money', () => {
    expect(parse('proposals_per_objective: 5000').proposalsPerObjective).toBe(200);
    expect(parse('exercises_per_objective: 900').exercisesPerObjective).toBe(40);
    expect(parse('objectives_per_job: 400').objectivesPerJob).toBe(20);
  });

  it('raises a number that would make the loop useless', () => {
    expect(parse('proposals_per_objective: 0').proposalsPerObjective).toBe(1);
    expect(parse('exercises_per_objective: -3').exercisesPerObjective).toBe(1);
  });

  it('falls back on an unreadable value rather than refusing to run', () => {
    // The rest of the file is still usable, and a compose that refuses because one
    // number is wrong is worse for her than one that runs at the default.
    expect(parse('proposals_per_objective: "un montón"').proposalsPerObjective)
      .toBe(DEFAULT_COMPOSE_BUDGET.proposalsPerObjective);
  });

  it('uses the default for a key the file does not mention', () => {
    expect(parse('exercises_per_objective: 4').objectivesPerJob)
      .toBe(DEFAULT_COMPOSE_BUDGET.objectivesPerJob);
  });
});
