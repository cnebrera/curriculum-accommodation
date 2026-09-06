import { describe, it, expect } from 'vitest';
import {
  fingerprint, checkFingerprint, renderSecondLook, parseSecondLook, secondLookPath,
  stampSignedOff, isSignedOff, parseIR, draftMark,
} from '../src/index.js';

/**
 * «¿Me lo miras antes de firmarlo?» (030 US2, FR-2808…2811).
 *
 * The persona review found the question verbatim from a tutor: a draft exam for a
 * learner she shares with the PT, and she wants a second pair of eyes before she signs.
 * Today the answer is «por el pasillo, en papel» — and what comes back is spoken, so it
 * is remade next term.
 */
describe('what binds a review to a draft', () => {
  it('the same document fingerprints the same, and one edited character does not', () => {
    const doc = '---\nrevision: 3\n---\n\n::: {#b1 .exercise}\n1. 47 × 8 =\n:::\n';
    expect(fingerprint(doc)).toBe(fingerprint(doc));
    expect(fingerprint(doc)).not.toBe(fingerprint(doc.replace('47', '48')));
  });

  it('a review about the sheet in front of her is simply the same', () => {
    const doc = '---\nrevision: 3\n---\n\ncontenido\n';
    expect(checkFingerprint(
      { revision: 3, fingerprint: fingerprint(doc) },
      { revision: 3, document: doc }).of).toBe('same');
  });

  it('and one about a revision she has since replaced is DECLARED, not silently applied', () => {
    /*
     * FR-2811. She may have re-run the adaptation while her colleague was reading it —
     * and then the corrections are about a sheet that no longer exists. Attaching them
     * to the current revision is the one outcome where she would apply somebody's
     * judgement about a paragraph that has already changed.
     */
    const old = '---\nrevision: 3\n---\n\nlo de antes\n';
    const now = '---\nrevision: 4\n---\n\nlo de ahora\n';
    const said = checkFingerprint(
      { revision: 3, fingerprint: fingerprint(old) }, { revision: 4, document: now });

    expect(said.of).toBe('moved');
    if (said.of === 'moved') {
      // **Both** revisions named: «no coinciden» leaves her to work out what changed and
      // in which direction, and that is exactly what she has to decide about.
      expect(said.say).toContain('revisión 3');
      expect(said.say).toContain('la 4');
      // And the corrections are still offered.
      expect(said.say).toContain('Te las enseño igual');
      expect(said.say).toContain('no las voy a aplicar');
    }
  });
});

describe('the corrections are written down, because a correction not written down is remade', () => {
  const look = {
    by: 'PT', date: '2026-09-08', revision: 3, fingerprint: 'abc123',
    packet: 'respuesta-job-u4-r3.md',
    corrections: ['Los enunciados, de una sola instrucción.', 'Más espacio para contestar.'],
  };

  it('beside the sheet they are about, not in a pile of reviews', () => {
    expect(secondLookPath('job-u4', 'L01'))
      .toBe('material/job-u4/L01/second-look.md');
  });

  it('round trips, and reads as a document a person can open', () => {
    const raw = renderSecondLook(look);
    expect(raw).toContain('# Lo que PT vio en esta hoja');
    expect(raw).toContain('Sobre la revisión 3');
    expect(raw).toContain('- Los enunciados, de una sola instrucción.');
    expect(parseSecondLook(raw)).toEqual(look);
  });

  it('and a file with no author is not a review', () => {
    expect(parseSecondLook('---\ndate: "2026-09-08"\n---\n\n#\n')).toBeNull();
  });
});

describe('the signature carries it as a fact, and never as a gate (FR-2810)', () => {
  const doc = '---\nkind: worksheet\n---\n\ncontenido\n';

  it('two facts, one signer', () => {
    const signed = stampSignedOff(doc, 'la tutora', '2026-09-10',
      { by: 'PT', date: '2026-09-08', revision: 3 });

    expect(signed).toContain('by: "la tutora"');
    expect(signed).toContain('second_look:');
    expect(signed).toContain('by: "PT"');
    expect(signed).toContain('revision: 3');
    // The signature is still one person's (`005` FR-512).
    expect(isSignedOff(parseIR(signed))).toBe(true);
  });

  it('and a sheet signed with no second look simply has no key, which is also a fact', () => {
    /*
     * The control case, and it is the requirement rather than a nicety: a gate here
     * would turn «¿me lo miras?» into a requirement, and the teacher who has nobody to
     * ask would be the one it stopped.
     */
    const signed = stampSignedOff(doc, 'la tutora', '2026-09-10');
    expect(signed).not.toContain('second_look');
    expect(isSignedOff(parseIR(signed))).toBe(true);
    // Signed is signed: the mark is off either way.
    expect(draftMark(parseIR(signed))).toBeNull();
  });

  it('and the draft mark does not care about it in either direction', () => {
    // Nothing reads `second_look` to allow or block anything. Asserted from the side
    // that would matter: an unsigned sheet with a review recorded is still a draft.
    const reviewed = '---\nkind: worksheet\nsecond_look:\n  by: "PT"\n---\n\nx\n';
    expect(draftMark(parseIR(reviewed))).not.toBeNull();
  });
});
