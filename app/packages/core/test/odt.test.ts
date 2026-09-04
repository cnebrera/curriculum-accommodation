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

/**
 * The pictograms reach the ODT too (review COD-24, decision P47).
 *
 * They did not. This file contained not one reference to `data-picto`, an image or
 * an attribution, so a sheet **with** pictograms exported to ODT came out without
 * them, with no marked gap and **without saying anything** — a silent loss of a
 * support she had turned on, in the modality that exists so she can retouch and
 * reprint. `019` FR-1702 claims «the same adapted IR» in every modality and its
 * coverage table called it «satisfied by absence»; here the absence was the defect.
 */
describe('a pictogram survives the export', () => {
  const PNG = 'data:image/png;base64,iVBORw0KGgo=';
  const withPicto = doc('::: {#b1 .instruction data-picto="casa=1001@arasaac"}\nRodea la casa.\n:::\n');
  const images = new Map([['1001', PNG]]);
  const credits = new Map([['arasaac', {
    author: 'Sergio Palao', source: 'ARASAAC · Gobierno de Aragón', licence: 'CC BY-NC-SA',
  }]]);

  /**
   * The local-header filenames, read back out of the ZIP we wrote.
   *
   * By walking the headers rather than by pattern-matching the bytes: a regex over
   * a deflate stream matches whatever the compressor happened to emit, which is
   * how the first version of this helper «found» an entry called `mimetypePK`.
   */
  const parts = (bytes: Uint8Array): string[] => {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const names: string[] = [];
    let at = 0;
    while (at + 30 <= bytes.length && view.getUint32(at, true) === 0x04034b50) {
      const compressed = view.getUint32(at + 18, true);
      const nameLen = view.getUint16(at + 26, true);
      const extraLen = view.getUint16(at + 28, true);
      names.push(new TextDecoder().decode(bytes.subarray(at + 30, at + 30 + nameLen)));
      at += 30 + nameLen + extraLen + compressed;
    }
    return names;
  };

  it('writes the image into the package and declares it in the manifest', () => {
    const odt = renderODT(withPicto, { pictogramImages: images, pictogramCredits: credits });
    expect(parts(odt), 'the picture is not in the package').toContain('Pictures/1001.png');

    const xml = text(odt);
    expect(xml).toContain('Pictures/1001.png');
    // Declared, because a part missing from the manifest is one a word processor
    // may silently drop — the same silent loss in a new place.
    expect(xml).toMatch(/manifest:full-path="Pictures\/1001\.png"/);
    expect(xml).toMatch(/manifest:media-type="image\/png"/);
  });

  it('keeps the word beside the picture, because a photocopy loses colour', () => {
    const xml = text(renderODT(withPicto, { pictogramImages: images, pictogramCredits: credits }));
    expect(xml).toContain('<draw:image');
    expect(xml).toContain('casa');
    // And the alternative text, so a screen reader gets something too.
    expect(xml).toContain('pictograma de «casa»');
  });

  it('carries the attribution, which reached the PDF and not this', () => {
    const xml = text(renderODT(withPicto, { pictogramImages: images, pictogramCredits: credits }));
    expect(xml).toContain('Sergio Palao');
    expect(xml).toContain('CC BY-NC-SA');
  });

  it('names the gap when the image is missing, rather than dropping it', () => {
    // `018` FR-1616: a moved set degrades the sheet, it does not fail the export.
    const xml = text(renderODT(withPicto, { pictogramImages: new Map(), pictogramCredits: credits }));
    expect(xml).toContain('falta el dibujo');
    expect(xml).toContain('1001');
    // The credit stays, because the document still claims a pictogram.
    expect(xml).toContain('Sergio Palao');
  });

  it('adds nothing to a document with no pictogram', () => {
    const odt = renderODT(SHEET, { pictogramImages: images, pictogramCredits: credits });
    expect(parts(odt).filter((p) => p.startsWith('Pictures/'))).toEqual([]);
    expect(text(odt)).not.toContain('Sergio Palao');
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
