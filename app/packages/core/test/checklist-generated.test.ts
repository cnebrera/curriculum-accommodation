import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

/**
 * The review checklist leads with content when the material was generated
 * (002 T020, FR-107, Principle VII).
 *
 * Asserted over the shipped file because that is what she reads. The requirement
 * is not «a section about generated material exists» — it existed before, as
 * section 6 of 9, behind four sections that assume there was an original. A
 * teacher working down the list in order reaches it having already ticked
 * «fidelidad de la lectura» about a document that was never read from anything.
 */
const root = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');
const checklist = readFileSync(join(root, 'checklists', 'review.md'), 'utf8');
/**
 * Whitespace-collapsed for the sentence assertions.
 *
 * The file is hard-wrapped at 80 columns, so «no con menos» spans a line break —
 * and a test that fails because a sentence wrapped is a test somebody deletes
 * rather than fixes. Only the *ordering* assertions read the raw text, where the
 * line structure is the thing being asserted.
 */
const flat = checklist.replace(/\s+/g, ' ');

describe('generated material comes first', () => {
  it('says so before section 1', () => {
    const zero = checklist.indexOf('## 0 · Si este material lo ha generado Rampa');
    const one = checklist.indexOf('## 1 ·');
    expect(zero).toBeGreaterThan(-1);
    expect(zero).toBeLessThan(one);
  });

  it('sends her to the content section rather than describing it', () => {
    expect(flat).toContain('Empieza por la sección 6, antes que por nada');
  });

  /** The sentence the spec says must not be softened. */
  it('says the effort is higher, not lower', () => {
    expect(flat).toContain('cuenta con más tiempo, no con menos');
    expect(flat).toContain('nadie ha leído este contenido');
  });

  it('names the two sections that do not apply, so a tick is not a false comfort', () => {
    expect(flat).toMatch(/sección 1\*{0,2} \(fidelidad de la lectura\) no aplica/);
    expect(flat).toContain('sección 4');
  });

  it('separates what code checked from what she must', () => {
    // The distinction the whole feature rests on: that the citation exists is
    // machine-checkable; that it says what the block claims is not.
    expect(flat).toContain('que la cita exista lo comprueba el programa');
  });

  it('tells her what to do when she cannot sign it', () => {
    expect(flat).toContain('no lo firmes');
  });
});
