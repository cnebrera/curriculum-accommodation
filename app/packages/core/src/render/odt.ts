import type { IRDocument, Block } from '../ir/types.js';
import { draftMark } from './draft.js';
import { learnerFacing } from '../ir/parse.js';
import { zip, type ZipEntry } from './zip.js';
import { parsePicto } from '../pictograms/apply.js';
import { attributionFor, pictogramAlt, type Attribution } from './attribution.js';

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
/**
 * The pictograms of one block, as ODF draw frames (review COD-24, decision P47).
 *
 * ## What used to happen
 *
 * Nothing. This file contained not one reference to `data-picto`, an image or an
 * attribution, so a sheet **with** pictograms exported to ODT came out without
 * them, with no marked gap and **without saying anything** — a silent loss of a
 * support she had turned on, in the modality that exists precisely so she can
 * retouch and reprint. `019` FR-1702 claims «the same adapted IR» in every
 * modality and its coverage table called it «satisfied by absence»; here the
 * absence was the defect.
 *
 * ## Word beside picture, as everywhere else
 *
 * Never the picture alone. On a black-and-white photocopy — the delivery format,
 * not an edge case (`006` FR-427) — a pictogram loses the colour distinctions its
 * design uses, and the word is what still works. `instructions/pictograms.md`
 * states it as a rule, and the HTML renderer and this one both keep it.
 *
 * An id whose image is absent becomes a **named gap**, exactly as in the HTML
 * (`018` FR-1616): a moved set degrades the sheet, it does not fail the export.
 */
function renderPictos(b: Block, images?: ReadonlyMap<string, ImageBytes>): string {
  const pairs = parsePicto(b.attrs['data-picto']);
  if (pairs.length === 0) return '';

  const items = pairs.map(({ word, id }) => {
    const image = images?.get(id);
    if (!image) {
      // The word and the id, so the gap traces to a decision (Principle VI).
      return `<text:p text:style-name="Apoyo">[${esc(word)} · falta el dibujo `
        + `${esc(id)}]</text:p>`;
    }
    /*
     * A frame per pictogram, sized in centimetres because ODF has no pixels and a
     * word processor needs a box to lay out. 2 cm is `instructions/pictograms.md`'s
     * 20 mm minimum — the size below which a photocopy stops being legible.
     */
    return '<text:p text:style-name="Apoyo">'
      + `<draw:frame draw:name="${esc(`picto-${b.id}-${id}`)}" text:anchor-type="as-char"`
      + ' svg:width="2cm" svg:height="2cm">'
      + `<draw:image xlink:href="${esc(image.path)}" xlink:type="simple"`
      + ' xlink:show="embed" xlink:actuate="onLoad"/>'
      + `<svg:title>${esc(pictogramAlt(word))}</svg:title>`
      + `</draw:frame> ${esc(word)}</text:p>`;
  });
  return items.join('\n');
}

/** One pictogram, ready to be written into the package. */
interface ImageBytes { path: string; data: Uint8Array; mediaType: string }

function renderBlock(b: Block, images?: ReadonlyMap<string, ImageBytes>): string {
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

  const pictos = renderPictos(b, images);
  return [...out, ...(pictos ? [pictos] : []), ...answerSpace(b)].join('\n');
}

/**
 * Somewhere to write, on the page she photocopies (027 T014, FR-2503).
 *
 * A label and two underlined empty paragraphs — the ODF way to put a ruled line on
 * paper, and the format matters here more than in HTML: this is the file she opens to
 * fix two words before printing, and lines she can extend by pressing Enter are lines
 * she can adjust for a child with big handwriting.
 *
 * Keyed on `data-answer-space` for the reason the HTML renderer gives: an ingested exam
 * already has its own space on the page it came from.
 */
function answerSpace(b: Block): string[] {
  if (!b.attrs['data-answer-space']) return [];
  return [
    '<text:p text:style-name="RespuestaEtiqueta">Respuesta:</text:p>',
    '<text:p text:style-name="RespuestaLinea"/>',
    '<text:p text:style-name="RespuestaLinea"/>',
  ];
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
  <style:style style:name="RespuestaEtiqueta" style:family="paragraph" style:parent-style-name="Cuerpo">
   <style:paragraph-properties fo:margin-top="0.3cm" fo:margin-bottom="0.1cm"/>
   <style:text-properties fo:font-size="10pt"/>
  </style:style>
  <style:style style:name="RespuestaLinea" style:family="paragraph" style:parent-style-name="Cuerpo">
   <style:paragraph-properties fo:margin-bottom="0.5cm" fo:padding-bottom="0.1cm"
     fo:border-bottom="0.02cm solid #000000"/>
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

/**
 * The manifest, with an entry per picture (P47).
 *
 * ODF requires every part of the package to be declared here. A picture written
 * into the ZIP and missing from the manifest is a picture a word processor may
 * silently drop — which would be the same silent loss in a new place.
 */
function manifestFor(pictures: ReadonlyMap<string, ImageBytes>): string {
  const extra = [...pictures.values()]
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((p) => ` <manifest:file-entry manifest:full-path="${esc(p.path)}"`
      + ` manifest:media-type="${esc(p.mediaType)}"/>`)
    .join('\n');
  return extra
    ? MANIFEST.replace('</manifest:manifest>', `${extra}\n</manifest:manifest>`)
    : MANIFEST;
}

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
  /**
   * Pictogram id → `data:` URI, the same map the HTML renderer takes (P47).
   *
   * The same shape on purpose: one caller computes it once and both modalities
   * render the same pictures. ODF wants bytes in the package rather than a URI, so
   * the `data:` payload is decoded here — which keeps the shell's job identical
   * for both outputs.
   */
  pictogramImages?: ReadonlyMap<string, string>;
  /** What each pictogram source says about itself (COD-08, P40). */
  pictogramCredits?: ReadonlyMap<string, Attribution>;
}

/**
 * `data:image/png;base64,…` → bytes and a media type.
 *
 * Returns `null` for anything it does not recognise rather than throwing: an
 * unreadable image is a named gap, and a broken export would lose the whole sheet
 * over one picture.
 */
function decodeDataUri(uri: string): { data: Uint8Array; mediaType: string } | null {
  const m = /^data:([a-z]+\/[a-z0-9.+-]+);base64,(.*)$/i.exec(uri);
  if (!m) return null;
  try {
    const raw = atob(m[2]!);
    const data = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) data[i] = raw.charCodeAt(i);
    return { data, mediaType: m[1]!.toLowerCase() };
  } catch { return null; }
}

const EXTENSION: Record<string, string> = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/svg+xml': 'svg',
};

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
  const mark = draftMark(doc, opts.signedOff);
  const banner = mark
    ? `<text:p text:style-name="Borrador">${esc(mark.banner)}</text:p>`
    : '';

  /*
   * The pictures, decoded into the package (P47). Written under `Pictures/` with a
   * manifest entry each, which is what ODF requires and what makes the ODT carry
   * the same pictograms as the PDF — «one document, N outputs» for real.
   */
  const pictures = new Map<string, ImageBytes>();
  /*
   * Only the ids this document actually uses. The caller's map may hold more —
   * `pictogramImagesFor` is asked for a batch — and a package carrying pictures
   * the sheet never shows is a bigger file for nothing, plus a licence credit for
   * a picture nobody sees.
   */
  const wanted = new Set(doc.blocks.flatMap(
    (b) => parsePicto(b.attrs['data-picto']).map((pp) => pp.id)));
  for (const [id, uri] of opts.pictogramImages ?? []) {
    if (!wanted.has(id)) continue;
    const decoded = decodeDataUri(uri);
    if (!decoded) continue;
    const ext = EXTENSION[decoded.mediaType] ?? 'png';
    pictures.set(id, { path: `Pictures/${id}.${ext}`, ...decoded });
  }

  const body = doc.blocks.filter(learnerFacing)
    .map((b) => renderBlock(b, pictures)).join('\n');

  /*
   * And the credit, at the foot, from the sources the document actually used
   * (COD-08, P40). It reached the PDF and the linear exports and **not this one**,
   * so the modality she uses to retouch and reprint was the one printing a
   * pictogram with no attribution at all.
   */
  const credit = attributionFor(doc, opts.pictogramCredits ?? new Map());
  const attribution = credit
    ? credit.split('\n').map((line) =>
        `<text:p text:style-name="Apoyo">${esc(line)}</text:p>`).join('\n')
    : '';

  const content = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
  xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
  xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  office:version="1.3">
 <office:body>
  <office:text text:use-soft-page-breaks="true" xml:lang="${esc(lang)}">
${banner}
${body}
${attribution}
  </office:text>
 </office:body>
</office:document-content>`;

  /*
   * `mimetype` FIRST and stored, which ODF requires — a reader that finds it
   * elsewhere may refuse the file. `zip()` never reorders, and that is why.
   */
  const entries: ZipEntry[] = [
    { path: 'mimetype', data: 'application/vnd.oasis.opendocument.text' },
    { path: 'META-INF/manifest.xml', data: manifestFor(pictures) },
    { path: 'content.xml', data: content },
    { path: 'styles.xml', data: STYLES_XML },
    { path: 'meta.xml', data: META },
    // Sorted, so the package's bytes do not depend on map insertion order — the
    // same determinism argument the ZIP writer and `META` already make.
    ...[...pictures.values()].sort((a, b) => a.path.localeCompare(b.path))
      .map((p): ZipEntry => ({ path: p.path, data: p.data })),
  ];

  return zip(entries);
}
