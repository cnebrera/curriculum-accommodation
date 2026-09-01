import { describe, it, expect } from 'vitest';
import {
  parseIR, readingFingerprint, readingOf, freshnessOf, stampReading, FROM_EXTRACTION,
} from '../src/index.js';

/**
 * A sheet made from a reading she has since corrected (005 T021-T023, FR-520).
 *
 * The failure this exists for: she photographs a worksheet, adapts it for three
 * learners, then notices Rampa read «47 × 8» as «4/ × 8» and fixes it. The three
 * sheets on her desk were made from the wrong reading, and until this existed Rampa
 * said nothing at all.
 *
 * ## Why these two cases are first
 *
 * The mechanism can be wrong in exactly two directions, and each has a case here:
 *
 * - **It does not fire when it should.** A correction that leaves the fingerprint
 *   alone is a stale sheet reported as fresh — the failure above, unchanged.
 * - **It fires when it should not.** `setPageVerified` rewrites `ir.md` on every
 *   confirmation, so anything keyed on the file — its modification time, a hash of
 *   its bytes — marks every sheet stale for a click that changed nothing. A tool
 *   that says «esto está desactualizado» about everything has said nothing.
 *
 * That second one is why the fingerprint is taken over the **blocks** and not over
 * the document, and it is the case that killed the mechanism G23 leaned toward.
 */

const ir = (body: string, frontMatter = 'source: "photos"'): string =>
  `---\n${frontMatter}\n---\n\n${body}`;

const reading = (text: string, fm?: string): string => ir(
  `::: {#b1 .instruction}\nResuelve.\n:::\n\n::: {#b2 .exercise}\n${text}\n:::\n`, fm);

describe('the fingerprint of a reading', () => {
  it('moves when what a block says changes', () => {
    const wrong = readingFingerprint(parseIR(reading('4/ × 8 =')));
    const fixed = readingFingerprint(parseIR(reading('47 × 8 =')));
    expect(fixed).not.toBe(wrong);
  });

  it('does not move when the front matter does', () => {
    // Exactly what `setPageVerified` writes: the flag flips, the reading does not.
    const before = readingFingerprint(parseIR(reading('47 × 8 =',
      'source: "photos"\nextraction: {"verified": false}')));
    const after = readingFingerprint(parseIR(reading('47 × 8 =',
      'source: "photos"\nextraction: {"verified": true}')));
    expect(after).toBe(before);
  });

  it('does not move for whitespace she cannot see', () => {
    const a = readingFingerprint(parseIR(reading('47 × 8 =')));
    const b = readingFingerprint(parseIR(reading('47  ×   8 =   ')));
    expect(b).toBe(a);
  });

  it('moves when a block is added, removed or reordered', () => {
    const two = readingFingerprint(parseIR(reading('47 × 8 =')));
    const three = readingFingerprint(parseIR(
      `${reading('47 × 8 =')}\n::: {#b3 .exercise}\n12 × 3 =\n:::\n`));
    expect(three).not.toBe(two);

    const swapped = readingFingerprint(parseIR(ir(
      '::: {#b2 .exercise}\n47 × 8 =\n:::\n\n::: {#b1 .instruction}\nResuelve.\n:::\n')));
    expect(swapped).not.toBe(two);
  });

  it('is the same string for the same reading, every time', () => {
    // Principle II. A fingerprint that varied per run would mark every sheet
    // stale on the next launch.
    const once = readingFingerprint(parseIR(reading('47 × 8 =')));
    const twice = readingFingerprint(parseIR(reading('47 × 8 =')));
    expect(twice).toBe(once);
    expect(once).toMatch(/^[0-9a-f]{12}$/);
  });
});

describe('what a sheet says it was made from', () => {
  it('is stamped into the front matter and read back', () => {
    const fingerprint = readingFingerprint(parseIR(reading('47 × 8 =')));
    const sheet = stampReading(ir('::: {#b1 .exercise}\nadaptado\n:::\n'), fingerprint);
    expect(readingOf(parseIR(sheet))).toBe(fingerprint);
    expect(sheet).toContain(`${FROM_EXTRACTION}: "${fingerprint}"`);
  });

  it('leaves a document with no front matter alone', () => {
    // Never invent a `---` block: a sheet without one is a sheet a later parse
    // would read differently, and the stamp is not worth changing the document's
    // shape for.
    const bare = '::: {#b1 .exercise}\nadaptado\n:::\n';
    expect(stampReading(bare, 'abc123abc123')).toBe(bare);
  });
});

describe('freshness, derived and never stored', () => {
  const current = readingFingerprint(parseIR(reading('47 × 8 =')));

  it('is fresh when the sheet was made from the reading on disk now', () => {
    const sheet = parseIR(stampReading(ir('::: {#b1 .exercise}\nx\n:::\n'), current));
    expect(freshnessOf(sheet, current)).toBe('fresh');
  });

  it('is stale when the reading has changed since', () => {
    const old = readingFingerprint(parseIR(reading('4/ × 8 =')));
    const sheet = parseIR(stampReading(ir('::: {#b1 .exercise}\nx\n:::\n'), old));
    expect(freshnessOf(sheet, current)).toBe('stale');
  });

  it('is unknown for a sheet made before any of this existed', () => {
    /*
     * The state that matters most, and the reason there are three.
     *
     * Every sheet in every vault today carries no stamp. Calling those fresh is a
     * claim we cannot check; calling them stale marks a teacher's whole folder as
     * suspect the day she updates. So it says «no lo sé», and the interface says
     * that too.
     */
    const sheet = parseIR(`---\nadapted_on: "2026-05-12"\n---\n\n::: {#b1 .exercise}\nx\n:::\n`);
    expect(freshnessOf(sheet, current)).toBe('unknown');
  });

  it('is unknown, not fresh, when the stamp is not a fingerprint', () => {
    const sheet = parseIR(`---\n${FROM_EXTRACTION}: true\n---\n\n::: {#b1 .exercise}\nx\n:::\n`);
    expect(freshnessOf(sheet, current)).toBe('unknown');
  });

  it('survives a hand edit of the sheet', () => {
    // FR-520 is about the reading the sheet came from, not about the sheet's own
    // text. She rewrites two exercises by hand (`001`'s own journey) and the sheet
    // is still made from the same reading — it must not become stale for that.
    const sheet = parseIR(stampReading(
      ir('::: {#b1 .exercise}\nlo que ella escribió a mano\n:::\n'), current));
    expect(freshnessOf(sheet, current)).toBe('fresh');
  });
});
