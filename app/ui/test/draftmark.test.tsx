import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DraftMark } from '../src/components/DraftMark.js';

/**
 * The draft mark, asserted (spec 010 T025, FR-812/FR-821/FR-823).
 *
 * "Every worksheet announces that it is a draft until she signs it" is the
 * promise this product makes about its own output, and until this file existed
 * it was a promise held up by nothing but the fact that nobody had broken it.
 *
 * Rendered to a string rather than driven through Electron, because the thing
 * worth pinning is what the markup *says* — the state in words, not only in
 * colour — and a screenshot could not check that at all.
 */
describe('the draft mark', () => {
  const unsigned = renderToStaticMarkup(<DraftMark signedOff={false} />);
  const signed = renderToStaticMarkup(<DraftMark signedOff={true} signedOn="12/09/2026" />);

  it('says "borrador" in words on unsigned material, not only in colour', () => {
    // FR-812: colour is never the only carrier. A teacher printing in
    // greyscale, or one who does not distinguish the hues, must still be told.
    expect(unsigned.toLowerCase()).toContain('borrador');
    expect(unsigned).toContain('No la entregues todavía');
  });

  it('drops the word once she has signed', () => {
    expect(signed.toLowerCase()).not.toContain('borrador · sin revisar');
    expect(signed).toContain('Firmada por ti');
    expect(signed).toContain('12/09/2026');
    // And says plainly that the mark is gone, so she is not left wondering
    // whether the sheet in her hand still carries it.
    expect(signed).toContain('Ya no lleva marca de borrador');
  });

  it('is a status and never an alert', () => {
    // A document being a draft is its state, not a fault. `role="alert"` would
    // interrupt a screen reader mid-sentence on every single adaptation.
    expect(unsigned).toContain('role="status"');
    expect(signed).toContain('role="status"');
    expect(unsigned).not.toContain('role="alert"');
  });

  it('carries the two states as two different classes, so CSS cannot blur them', () => {
    expect(unsigned).toContain('class="draftbar"');
    expect(signed).toContain('class="signedbar"');
    expect(unsigned).not.toContain('signedbar');
    expect(signed).not.toContain('"draftbar"');
  });

  it('hides its decoration from assistive technology', () => {
    // The dot and the tick are duplicates of text that is already there.
    // Announced, they would read as noise before the sentence that matters.
    expect(unsigned).toContain('aria-hidden="true"');
    expect(signed).toContain('aria-hidden="true"');
  });

  it('never invents a date it was not given', () => {
    const noDate = renderToStaticMarkup(<DraftMark signedOff={true} />);
    expect(noDate).toContain('Firmada por ti');
    expect(noDate).not.toContain('·');
    expect(noDate).not.toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });
});
