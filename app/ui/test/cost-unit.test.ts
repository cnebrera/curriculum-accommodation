import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { es } from '../src/i18n/es.js';

/** The file itself, because `JSON.stringify` drops the strings that are functions. */
const src = readFileSync(
  join(dirname(new URL(import.meta.url).pathname), '..', 'src', 'i18n', 'es.ts'), 'utf8');

/**
 * The unit of cost is a sheet she adapted, not «una ficha» (P36, CONS-34).
 *
 * ## Two MUSTs that contradicted each other for a month
 *
 * `012` FR-1011 — restated by `016` FR-1402 — says the interface must stop calling
 * everything «una ficha», and the argument is not tidiness: a teacher who reads
 * «ficha» everywhere concludes the application does not do exams, and never tries.
 *
 * Meanwhile `006` US1-2 and `009` US4-4 fixed a literal success sentence — «✓
 * Conectado. Unos 3 céntimos por ficha» — on the **first screen she ever sees**,
 * and `009` FR-724 asked for the cost «per worksheet». Nothing in `012` or `016`
 * amended or excepted it, so whoever implemented the connection screen had no way
 * to know which rule won.
 *
 * Carlos's answer (P36) was to change the copy rather than except the rule. This
 * test is what stops it drifting back: `009`'s catalogue and cost vocabulary is
 * where the word is most tempting, because a price *is* per something.
 */
describe('the connection screen', () => {
  it('prices a run per adapted sheet', () => {
    expect(es.connect.connectedCost('unos 3 céntimos')).toContain('por hoja adaptada');
    expect(es.connect.colCost).toBe('Coste por hoja adaptada');
  });

  it('says «ficha» nowhere in the connection vocabulary', () => {
    /*
     * The whole section, not only the two strings above: the comparison table, the
     * walkthrough labels and the five failure sentences are all `009`'s, and any of
     * them is a place the word could come back.
     */
    const offenders = Object.entries(es.connect)
      .map(([key, value]) => [key, typeof value === 'function'
        ? (value as (s: string) => string)('unos 3 céntimos') : String(value)] as const)
      .filter(([, text]) => /\bfichas?\b/i.test(text))
      .map(([key, text]) => `${key}: ${text}`);
    expect(offenders, 'the first screen she sees calls the work «una ficha»').toEqual([]);
  });

  /**
   * And there is exactly one wording of this sentence.
   *
   * There were two: `onboarding.connectOk` said «por documento» and was written by
   * nobody and read by nobody — `009` replaced the onboarding paste box with its
   * own wizard. A stale twin of the sentence P36 just amended, sitting beside it
   * waiting for somebody to reach for it, is this project's signature defect
   * arriving in the copy layer. Removed, and asserted so it does not come back.
   */
  it('has one wording of «conectado», not two', () => {
    // Over the source, not over the object: `connectedCost` is a function, and
    // `JSON.stringify` drops functions — which would have made this assertion pass
    // on the string it exists to check.
    const occurrences = src.match(/✓ Conectado\./g) ?? [];
    // Two, and only two: «gratis dentro de su límite» and the priced one.
    expect(occurrences).toHaveLength(2);
    expect(src).not.toMatch(/connectOk:/);
  });
});
