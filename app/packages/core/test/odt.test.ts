import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { renderODT, zip, parseIR } from '../src/index.js';

/**
 * The document she can fix by hand (019 US1).
 *
 * ## The test that actually matters
 *
 * Everything below the ZIP structure checks XML we wrote against expectations we
 * also wrote, which proves the two agree and nothing about whether LibreOffice
 * will open the file. So where `soffice` is on the machine, this **converts the
 * output and asserts the conversion succeeded** — the only assertion here that
 * could catch a malformed container, and the kind of check this project has
 * repeatedly found missing.
 *
 * Skipped rather than failed where `soffice` is absent, and the skip is loud:
 * a green suite on a machine without LibreOffice means the structural claims
 * were checked and the openability claim was not.
 */
const SOFFICE = ['/Applications/LibreOffice.app/Contents/MacOS/soffice', '/usr/bin/soffice', 'soffice']
  .find((p) => p === 'soffice' || existsSync(p));

const doc = (body: string, fm = '') => parseIR(`${fm ? `---\n${fm}\n---\n\n` : ''}${body}`);

const SHEET = doc(
  '::: {#b1 .instruction}\nLee cada frase y subraya el verbo.\n:::\n\n'
  + '::: {#b2 .exercise data-number="5"}\nLas plantas **fabrican** su alimento.\n:::\n\n'
  + '::: {#b3 .exercise data-number="6"}\n- primero esto\n- después esto\n:::\n',
);

const text = (odt: Uint8Array): string => new TextDecoder().decode(odt);

describe('the container is a ZIP an ODF reader will accept', () => {
  it('starts with the ZIP signature', () => {
    const out = renderODT(SHEET);
    expect([...out.slice(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
  });

  /**
   * ODF requires `mimetype` to be the **first** entry, stored. A reader that
   * finds it elsewhere may refuse the file — which is why `zip()` never sorts.
   */
  it('has mimetype first, uncompressed', () => {
    const out = renderODT(SHEET);
    const head = text(out.slice(0, 80));
    expect(head).toContain('mimetype');
    expect(head).toContain('application/vnd.oasis.opendocument.text');
    // Method 0 = stored, at offset 8 of the local header.
    expect(out[8]).toBe(0);
    expect(out[9]).toBe(0);
  });

  it('carries the four parts an ODF text document needs', () => {
    const all = text(renderODT(SHEET));
    for (const part of ['META-INF/manifest.xml', 'content.xml', 'styles.xml', 'meta.xml']) {
      expect(all).toContain(part);
    }
  });

  it('is byte-identical for the same document', () => {
    // Deterministic: this project compares documents, and a container whose bytes
    // move with the clock makes "is this the same sheet?" unanswerable.
    expect(renderODT(SHEET)).toEqual(renderODT(SHEET));
  });

  it('an empty archive is still a valid empty ZIP', () => {
    const out = zip([]);
    expect([...out.slice(0, 4)]).toEqual([0x50, 0x4b, 0x05, 0x06]);
  });
});

describe('what the document says', () => {
  it('keeps the original numbering, including on a list-bodied exercise', () => {
    /*
     * Hard rule 7: the class works out loud on «el ejercicio cinco».
     *
     * Exercise 6's content is a list, and the first implementation numbered only
     * text paragraphs — so 6 came out unnumbered. Both are asserted here for that
     * reason.
     *
     * Asserted as «the number and a period», not «the number, a period and a
     * space»: whether the markup carries a trailing space is a rendering detail,
     * and a test that pins it fails on a correct change. This project has made
     * that mistake three times.
     */
    const all = text(renderODT(SHEET));
    expect(all).toMatch(/>5\./);
    expect(all).toMatch(/>6\./);
  });

  it('keeps bold', () => {
    expect(text(renderODT(SHEET))).toContain('text:style-name="Fuerte">fabrican<');
  });

  it('turns a dashed run into a list', () => {
    const all = text(renderODT(SHEET));
    expect(all).toContain('<text:list>');
    expect(all).toContain('primero esto');
  });

  it('gives an instruction a different style from an exercise', () => {
    const all = text(renderODT(SHEET));
    expect(all).toContain('text:style-name="Instruccion"');
    expect(all).toContain('text:style-name="Ejercicio"');
  });

  it('escapes what would break the XML', () => {
    const all = text(renderODT(doc('::: {#b1 .exercise}\n5 < 7 & "sí"\n:::\n')));
    expect(all).toContain('5 &lt; 7 &amp;');
    expect(all).not.toMatch(/[^&]<\/text:p>[^\n]*[^;]"sí"/);
  });

  /** 007 FR-506's shape: the model's report channel is never learner-facing. */
  it('leaves out the report notes', () => {
    const all = text(renderODT(doc(
      '::: {#b1 .exercise}\nvisible\n:::\n\n::: {#n1 .report-notes}\nno debería salir\n:::\n')));
    expect(all).toContain('visible');
    expect(all).not.toContain('no debería salir');
  });
});

describe('the draft announces itself, and survives being edited', () => {
  /**
   * Principle VII, and the reason it is a paragraph rather than a page header.
   *
   * A header lives in the page style, and whether a word processor carries it
   * through an open-edit-save cycle depends on the editor. A first paragraph is
   * content: it survives anything short of her deleting it, and if she deletes it
   * she has decided to.
   */
  it('is the first thing in the document when unsigned', () => {
    const all = text(renderODT(SHEET));
    expect(all).toContain('BORRADOR');
    expect(all.indexOf('BORRADOR')).toBeLessThan(all.indexOf('subraya el verbo'));
  });

  it('is absent once signed off', () => {
    expect(text(renderODT(SHEET, { signedOff: true }))).not.toContain('BORRADOR');
  });

  it('is a paragraph, not a header', () => {
    expect(text(renderODT(SHEET))).toContain('text:style-name="Borrador"');
  });
});

describe('nothing of hers leaves in the metadata', () => {
  /**
   * FR-1706, and the failure it is written against: a word processor fills the
   * author field from the machine's account name unless the document says
   * otherwise, so an export would carry the *teacher's* name out of the vault.
   */
  it('writes an empty creator rather than leaving a default', () => {
    const all = text(renderODT(SHEET));
    expect(all).toContain('<dc:creator></dc:creator>');
    expect(all).toContain('<meta:generator>Rampa</meta:generator>');
  });

  it('carries no learner data beyond what is in the material', () => {
    const all = text(renderODT(doc('::: {#b1 .exercise}\nCalcula\n:::\n', 'learner: E38')));
    // Front matter is not rendered: the code appears nowhere the child can read.
    expect(all).not.toContain('E38');
  });
});

describe('LibreOffice opens it', () => {
  /**
   * The only assertion in this file that could catch a malformed container.
   * Everything above compares XML we wrote against expectations we wrote.
   */
  it.skipIf(!SOFFICE)('converts without error', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rampa-odt-'));
    const path = join(dir, 'sheet.odt');
    writeFileSync(path, renderODT(SHEET));

    // Converting to text is the cheapest round trip that requires the file to be
    // genuinely parsed rather than merely recognised.
    execFileSync(SOFFICE!, ['--headless', '--convert-to', 'txt', '--outdir', dir, path],
      { stdio: 'pipe', timeout: 120_000 });

    expect(existsSync(join(dir, 'sheet.txt')),
      'LibreOffice produced no output: the container is malformed').toBe(true);
  }, 130_000);

  it('says out loud when that check did not run', () => {
    if (!SOFFICE) {
      // Not a failure — a machine without LibreOffice is a normal machine. But a
      // green suite here means the structural claims were checked and the
      // openability claim was not, and that distinction must not be invisible.
      // eslint-disable-next-line no-console
      console.warn('\n  ⚠ soffice not found: the ODT was NOT opened by anything.\n');
    }
    expect(true).toBe(true);
  });
});
