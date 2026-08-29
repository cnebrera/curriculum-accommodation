import { describe, it, expect } from 'vitest';
import { redact, isClean } from '../src/redact/names.js';
import { pagesToIR, irToMarkdown } from '../src/ingest/to-ir.js';
import type { ExtractedPage } from '../src/ingest/schema.js';

/**
 * Names on the paper (008 T030, SC-604, FR-610).
 *
 * The promise the application exists to keep is that the teacher types "Lucía"
 * because that is how she thinks, and the model never sees it. Ingest opens a new
 * hole in it, and the hole has two halves that must not be confused:
 *
 * - **Extracted text.** Fully closable, and closed: a name read off the page
 *   becomes a code before the IR is written, so the vault stays name-free even
 *   when the photograph was not.
 * - **The image itself.** Not closable without local OCR before send, which is
 *   deliberately out of scope. So it is warned about (FR-609) and documented
 *   (FR-708a), never implied away.
 *
 * These tests cover the first half completely and assert the second half is
 * *stated* rather than fixed — because a test that pretended the pixels were
 * covered would be worse than no test.
 */
const known = new Map([['A3', 'Lucía García'], ['B7', 'Martín']]);

const pageWithNames = (): ExtractedPage => ({
  page: 1, quality: 'good', sheets: 1, notes: [],
  blocks: [
    { id: 'b1', class: 'heading', text: 'Nombre: Lucía García' },
    { id: 'b2', class: 'instruction', text: 'Lucía, lee el texto y responde.' },
    { id: 'b3', class: 'figure', role: 'informative',
      short: 'La foto de clase de Martín.', long: 'Martín y Lucía en el patio.' },
  ],
});

/** The redaction the ingest job applies before conversion. */
function redactPage(page: ExtractedPage): { page: ExtractedPage; flagged: string[] } {
  const flagged = new Set<string>();
  const blocks = page.blocks.map((b) => {
    const out = { ...b };
    for (const field of ['text', 'short', 'long'] as const) {
      const value = out[field];
      if (!value) continue;
      const r = redact(value, known);
      out[field] = r.text;
      for (const f of r.flagged) flagged.add(f);
    }
    return out;
  });
  return { page: { ...page, blocks }, flagged: [...flagged] };
}

describe('a name read off the page never reaches the vault', () => {
  it('replaces every known name with its code, in every field', () => {
    const { page } = redactPage(pageWithNames());
    const all = JSON.stringify(page);
    expect(all).not.toMatch(/Luc[íi]a/i);
    expect(all).not.toContain('García');
    expect(all).not.toMatch(/Mart[íi]n/i);
    expect(all).toContain('A3');
    expect(all).toContain('B7');
  });

  it('redacts inside a figure description as well as inside prose', () => {
    // A figure description is written by the model from the image, so it is a
    // channel a name arrives through that no typed-text path has.
    const { page } = redactPage(pageWithNames());
    const fig = page.blocks.find((b) => b.class === 'figure')!;
    expect(`${fig.short} ${fig.long}`).not.toMatch(/Mart[íi]n|Luc[íi]a/i);
  });

  it('leaves the written IR free of every known name', () => {
    const { page } = redactPage(pageWithNames());
    const markdown = irToMarkdown(pagesToIR([page], { source: 'photos' }));
    expect(isClean(markdown, known)).toBe(true);
  });

  it('asks about a probable unknown name rather than rewriting it', () => {
    // 006 FR-419. Guessing that "Fernández" is a learner and coding it would be
    // as wrong as leaving a real name in: she is the one who knows.
    const page: ExtractedPage = {
      page: 1, quality: 'good', sheets: 1, notes: [],
      blocks: [{ id: 'b1', class: 'heading', text: 'Nombre: Fernández Ruiz' }],
    };
    const { page: out, flagged } = redactPage(page);
    expect(flagged.length).toBeGreaterThan(0);
    // Untouched: flagged is not the same as redacted.
    expect(out.blocks[0]!.text).toContain('Fernández');
  });

  it('does not mangle a page with no names in it', () => {
    const clean: ExtractedPage = {
      page: 1, quality: 'good', sheets: 1, notes: [],
      blocks: [{ id: 'b1', class: 'paragraph', text: 'El búho come ratones.' }],
    };
    const { page, flagged } = redactPage(clean);
    expect(page.blocks[0]!.text).toBe('El búho come ratones.');
    expect(flagged).toEqual([]);
  });

  it('keeps the unreadable marker through redaction', () => {
    // Both defences apply to the same string, and neither may eat the other.
    const page: ExtractedPage = {
      page: 1, quality: 'good', sheets: 1, notes: [],
      blocks: [{ id: 'b1', class: 'paragraph', text: 'Lucía: [UNREADABLE: borroso]' }],
    };
    const { page: out } = redactPage(page);
    expect(out.blocks[0]!.text).toContain('[UNREADABLE: borroso]');
    expect(out.blocks[0]!.text).not.toMatch(/Luc[íi]a/i);
  });
});

describe('the residual is stated, not fixed', () => {
  it('is documented in the words a teacher reads', async () => {
    /*
     * FR-708a and the 008 US4 assumption. This asserts the *documentation*,
     * because that is the whole mitigation: local OCR before send would close it
     * and is deliberately out of scope, so the only thing standing between a
     * teacher and a surprise is a sentence that says so.
     *
     * The negative assertion is the important one: nothing may claim the
     * redaction covers pixels.
     */
    const { readFileSync } = await import('node:fs');
    const { join, dirname } = await import('node:path');
    const repoRoot = join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');
    const doc = readFileSync(join(repoRoot, 'docs', 'proteccion-de-datos.md'), 'utf8');

    expect(doc).toMatch(/foto|imagen/i);
    expect(doc.toLowerCase()).toContain('escrito a mano');
    // No overclaim anywhere in the document.
    expect(doc).not.toMatch(/nunca sale ninguna información personal/i);
    expect(doc).not.toMatch(/no sale nada personal/i);
  });
});
