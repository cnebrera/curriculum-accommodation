import type { IRDocument, Block } from '../ir/types.js';
import { learnerFacing } from '../ir/parse.js';
import { zip, type ZipEntry } from './zip.js';

/**
 * IR → ODT, the document she can fix by hand (019 US1, FR-1704…1707).
 *
 * ## Why this is the modality that ships first
 *
 * It has the most users by a wide margin, and it makes every other feature safer:
 * **a teacher who can change the last two words does not abandon a sheet that is
 * 95% right.** Before this, her only in-app route for a two-word fix was a full
 * re-run — cost, wait, and a fresh document to re-check.
 *
 * ## Why ODT rather than DOCX
 *
 * LibreOffice is what a Spanish state school has, and Word has opened ODT
 * natively since 2010. Writing ODF is also markedly less code than
 * WordprocessingML, and this is hand-written XML either way (`006` R12: the
 * application cannot ship Pandoc).
 *
 * ## What it must not lose
 *
 * The draft mark (Principle VII). It is the first paragraph of the document, in
 * a style that survives being opened, edited and saved by a word processor —
 * because a document that announces itself only on screen does not announce
 * itself to the person holding a printout.
 *
 * And the learner's code, and nothing more of her (`006` FR-417…421). Including
 * in the **metadata**: the author field of an exported file is a place a name has
 * escaped from other tools, so `meta.xml` is written deliberately empty rather
 * than left to a default.
 */

const XML_ESC: Record<string, string> = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
};
const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => XML_ESC[c]!);

/** Inline Markdown that survives into ODF: bold, italic, code. Nothing else. */
function inline(text: string): string {
  return esc(text)
    .replace(/\*\*([^*]+)\*\*/g, '<text:span text:style-name="Fuerte">$1</text:span>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<text:span text:style-name="Enfasis">$2</text:span>')
    .replace(/`([^`]+)`/g, '<text:span text:style-name="Codigo">$1</text:span>');
}

/**
 * One block, as ODF paragraphs.
 *
 * The block's own class becomes the paragraph style, so «un examen» and «una
 * explicación» remain distinguishable in the editor rather than collapsing into
 * undifferentiated body text — which is what makes the exported document
 * something she can navigate rather than a wall she has to re-read.
 */
function renderBlock(b: Block): string {
  const style = STYLE_FOR[b.classes.find((c) => c in STYLE_FOR) ?? 'explanation'] ?? 'Cuerpo';
  const number = b.attrs['data-number'];

  const paragraphs = b.content.split(/\n{2,}/).filter((p) => p.trim());
  const out: string[] = [];

  paragraphs.forEach((para, i) => {
    const lines = para.split('\n');
    const isList = lines.every((l) => /^\s*[-*]\s+/.test(l));

    if (isList) {
      /*
       * The number goes above the list, on its own line.
       *
       * The first version put it only on a text paragraph, so «ejercicio 6», whose
       * content is a list, came out unnumbered — and hard rule 7 exists because
       * the class works out loud on «el ejercicio seis». Caught by the test
       * asserting both numbers rather than one.
       */
      if (i === 0 && number) {
        out.push(`<text:p text:style-name="${style}">${esc(number)}.</text:p>`);
      }
      out.push('<text:list>');
      for (const l of lines) {
        out.push('<text:list-item><text:p text:style-name="Cuerpo">'
          + inline(l.replace(/^\s*[-*]\s+/, '')) + '</text:p></text:list-item>');
      }
      out.push('</text:list>');
      return;
    }

    /*
     * The original numbering, preserved (001 FR / hard rule 7). The class works
     * out loud on «el ejercicio cinco», and a renumbered sheet makes the learner
     * unable to follow — so it is printed rather than left to a list style the
     * editor might renumber.
     */
    const prefix = i === 0 && number ? `${esc(number)}. ` : '';
    out.push(`<text:p text:style-name="${style}">${prefix}${inline(para.replace(/\n/g, ' '))}</text:p>`);
  });

  return out.join('\n');
}

const STYLE_FOR: Record<string, string> = {
  instruction: 'Instruccion',
  exercise: 'Ejercicio',
  assessment: 'Ejercicio',
  explanation: 'Cuerpo',
  example: 'Cuerpo',
  figure: 'Cuerpo',
  scaffold: 'Apoyo',
};

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" office:version="1.3">
 <office:styles>
  <style:style style:name="Cuerpo" style:family="paragraph">
   <style:paragraph-properties fo:margin-bottom="0.35cm" fo:line-height="150%"/>
   <style:text-properties fo:font-size="12pt"/>
  </style:style>
  <style:style style:name="Instruccion" style:family="paragraph" style:parent-style-name="Cuerpo">
   <style:text-properties fo:font-weight="bold"/>
  </style:style>
  <style:style style:name="Ejercicio" style:family="paragraph" style:parent-style-name="Cuerpo">
   <style:paragraph-properties fo:margin-top="0.5cm" fo:keep-together="always"/>
  </style:style>
  <style:style style:name="Apoyo" style:family="paragraph" style:parent-style-name="Cuerpo">
   <style:paragraph-properties fo:margin-left="0.6cm"/>
   <style:text-properties fo:font-style="italic"/>
  </style:style>
  <style:style style:name="Borrador" style:family="paragraph" style:parent-style-name="Cuerpo">
   <style:paragraph-properties fo:margin-bottom="0.8cm" fo:padding="0.2cm"
     fo:border="0.06cm solid #b3261e"/>
   <style:text-properties fo:font-weight="bold" fo:color="#b3261e"/>
  </style:style>
  <style:style style:name="Fuerte" style:family="text">
   <style:text-properties fo:font-weight="bold"/>
  </style:style>
  <style:style style:name="Enfasis" style:family="text">
   <style:text-properties fo:font-style="italic"/>
  </style:style>
  <style:style style:name="Codigo" style:family="text">
   <style:text-properties style:font-name="monospace"/>
  </style:style>
 </office:styles>
</office:document-styles>`;

const MANIFEST = `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0"
  manifest:version="1.3">
 <manifest:file-entry manifest:full-path="/" manifest:version="1.3"
   manifest:media-type="application/vnd.oasis.opendocument.text"/>
 <manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
 <manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>
 <manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/>
</manifest:manifest>`;

/**
 * Deliberately empty of people (019 FR-1706).
 *
 * A word processor fills the author field from the machine's account name if the
 * document does not say otherwise, so an exported sheet would carry the
 * *teacher's* name out of the vault. Written as Rampa, with no author and no
 * timestamp — the timestamp because a document whose bytes change with the clock
 * cannot be compared, which is the same reason the ZIP is deterministic.
 */
const META = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-meta xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0"
  xmlns:dc="http://purl.org/dc/elements/1.1/" office:version="1.3">
 <office:meta>
  <meta:generator>Rampa</meta:generator>
  <dc:creator></dc:creator>
 </office:meta>
</office:document-meta>`;

export interface OdtOptions {
  /** Omits the draft mark. Derived from the document, never passed by a screen. */
  signedOff?: boolean;
  lang?: string;
}

export function renderODT(doc: IRDocument, opts: OdtOptions = {}): Uint8Array {
  const lang = opts.lang ?? (typeof doc.frontMatter['lang'] === 'string' ? doc.frontMatter['lang'] : 'es');

  /*
   * Principle VII, and the reason it is a paragraph rather than a header.
   *
   * A header lives in the page style, and a word processor that opens, edits and
   * saves the file may or may not carry it through — which makes the guarantee
   * depend on the editor. A first paragraph is content: it survives anything
   * short of her deleting it, and if she deletes it she has decided to.
   */
  const banner = opts.signedOff === true ? '' :
    '<text:p text:style-name="Borrador">BORRADOR — pendiente de revisión docente'
    + ' · no entregar al alumnado</text:p>';

  const body = doc.blocks.filter(learnerFacing).map(renderBlock).join('\n');

  const content = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
  office:version="1.3">
 <office:body>
  <office:text text:use-soft-page-breaks="true" xml:lang="${esc(lang)}">
${banner}
${body}
  </office:text>
 </office:body>
</office:document-content>`;

  /*
   * `mimetype` FIRST and stored, which ODF requires — a reader that finds it
   * elsewhere may refuse the file. `zip()` never reorders, and that is why.
   */
  const entries: ZipEntry[] = [
    { path: 'mimetype', data: 'application/vnd.oasis.opendocument.text' },
    { path: 'META-INF/manifest.xml', data: MANIFEST },
    { path: 'content.xml', data: content },
    { path: 'styles.xml', data: STYLES_XML },
    { path: 'meta.xml', data: META },
  ];

  return zip(entries);
}
