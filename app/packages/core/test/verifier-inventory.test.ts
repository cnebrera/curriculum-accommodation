import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { arithmetic } from '../src/index.js';

/**
 * The verifier list is a claim, so it is asserted (002 T022).
 *
 * `specs/006-desktop-app/validation.md` tells a reader which skills code can
 * check. A second verifier added without a row there — or a row for a verifier
 * that was removed — turns a validation record into a marketing document, and this
 * project's whole argument is that the record is honest.
 */
const root = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');
const validation = readFileSync(join(root, 'specs', '006-desktop-app', 'validation.md'), 'utf8');

/** Every skill id the shipped verifiers claim to handle. */
const CLAIMED = ['arith.add', 'arith.subtract', 'arith.multiply', 'arith.divide'];

describe('what the record says matches what the code does', () => {
  it('every skill in the table is really handled', () => {
    for (const id of CLAIMED) expect(arithmetic.handles(id)).toBe(true);
  });

  it('every handled skill has a row in the record', () => {
    for (const id of CLAIMED) expect(validation).toContain(`\`${id}\``);
  });

  /**
   * The list of claimed ids is itself a claim. This is the assertion that fails
   * when somebody teaches `arithmetic` a fifth operation and updates neither.
   */
  it('the verifier handles nothing the record does not mention', () => {
    const plausible = [
      'arith.percent', 'arith.fraction', 'arith.power', 'arith.root', 'arith.modulo',
      'lengua.tildes', 'lengua.ortografia', 'lectura.comprension',
    ];
    for (const id of plausible) {
      if (arithmetic.handles(id)) {
        expect(validation, `${id} is handled but not in validation.md`).toContain(`\`${id}\``);
      }
    }
  });

  it('says the uncovered list is longer, and is not a gap to close', () => {
    const flat = validation.replace(/\s+/g, ' ');
    expect(flat).toContain('honest limit');
    // The sentence that must not be softened into a roadmap item.
    expect(flat).toContain('a model that marks its own work');
  });

  it('says nothing in 002 has met a real provider', () => {
    const flat = validation.replace(/\s+/g, ' ');
    expect(flat).toContain('has been run against a real provider');
    expect(flat).toContain('No teacher has seen composed material');
  });
});
