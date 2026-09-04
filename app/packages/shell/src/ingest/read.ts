import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { logger, RampaError, toSendablePng, type Bitmap } from '@rampa/core';

/**
 * Reading whatever she has (008 T012, FR-601/614, research R1).
 *
 * Four formats, one shape out. Everything here is pure JS or WASM on purpose:
 * a native module's failure mode in Electron is an application that does not
 * launch, on one platform, after a version bump — and the person holding it is a
 * teacher who cannot read the stack trace and has nobody to ask.
 *
 * Nothing here calls a model. This is decoding: pixels out of a container, text
 * out of a text layer. Judgement happens later, in one place.
 */
export interface SourcePage {
  /** 1-based, as she counts. */
  page: number;
  /** Raw RGBA or an encoded image, ready to be downscaled and sent. */
  image?: { data: Uint8Array; mediaType: string; width: number; height: number };
  /**
   * Text already present in the file. Its presence is what routes a source down
   * the digital path (US3) rather than the vision path.
   */
  text?: string;
  /** Text present in the layer but not visibly rendered (FR-607). */
  invisibleText?: string[];
  /**
   * Where the images are on a digital page (T033), in PDF units from the
   * bottom-left. The text layer carries none, so without this a worksheet's
   * diagram disappears — and a diagram is often the thing the question is about.
   */
  figures?: Array<{ x: number; y: number; width: number; height: number }>;
  /**
   * The pdf.js page, while this module still has it.
   *
   * Internal and deleted before `readSources` returns: the scanned branch needs
   * to ask a page for its pixels *after* the text-layer threshold has decided
   * whether it is a scan, and re-opening the document to do that would parse it
   * twice. Nothing outside this file ever sees it.
   */
  handle?: unknown;
}

export interface ReadResult {
  source: 'photos' | 'pdf-scanned' | 'pdf-digital' | 'docx' | 'pasted';
  pages: SourcePage[];
}

const IMAGE_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.webp': 'image/webp',
};

export const HEIC_EXTENSIONS = ['.heic', '.heif'];
export const ACCEPTED_EXTENSIONS = [
  ...Object.keys(IMAGE_TYPES), ...HEIC_EXTENSIONS, '.pdf', '.docx', '.txt', '.md',
];

/** Her words, for the drop target and for a rejection. */
export const ACCEPTED_DESCRIPTION =
  'Fotos (JPG, PNG, HEIC), PDF, Word (.docx) o texto.';

/**
 * How large an image may be when it leaves (008 FR-616).
 *
 * A parameter rather than a constant, because the number is corpus
 * (`instructions/ingest.md`, `image_long_edge`) and this module must not read the
 * corpus. Defaulted so the tests that only care about routing stay short — and
 * defaulted to the shipped value rather than to «no bound», because a default of
 * infinity is how the bound came to be parsed and never applied.
 */
export const DEFAULT_IMAGE_LONG_EDGE = 1600;

export async function readSources(
  paths: readonly string[], longEdge = DEFAULT_IMAGE_LONG_EDGE,
): Promise<ReadResult> {
  if (paths.length === 0) {
    throw new RampaError('ingest-empty', 'No has añadido ningún fichero.');
  }

  const kinds = new Set(paths.map((p) => extname(p).toLowerCase()));
  const unknown = [...kinds].filter((k) => !ACCEPTED_EXTENSIONS.includes(k));
  if (unknown.length) {
    throw new RampaError('ingest-format',
      `No sé leer ${unknown.join(', ')}. ${ACCEPTED_DESCRIPTION}`);
  }

  // One PDF or one DOCX is a document with its own page order. Several images
  // are pages of one worksheet, in the order she gave them — which is why a
  // mixed drop is refused rather than guessed at.
  if (kinds.size > 1 && ([...kinds].includes('.pdf') || [...kinds].includes('.docx'))) {
    throw new RampaError('ingest-format',
      'Añade o un PDF, o un Word, o fotos — pero no mezclados, porque no sé en qué orden van.');
  }

  const first = extname(paths[0]!).toLowerCase();
  if (first === '.pdf') return readPdf(paths[0]!, longEdge);
  if (first === '.docx') return readDocx(paths[0]!);
  if (first === '.txt' || first === '.md') {
    return { source: 'pasted', pages: [{ page: 1, text: await readFile(paths[0]!, 'utf8') }] };
  }
  return readImages(paths, longEdge);
}

/* ── Photographs ─────────────────────────────────────────────────────────── */

async function readImages(paths: readonly string[], longEdge: number): Promise<ReadResult> {
  const pages: SourcePage[] = [];
  for (const [i, path] of paths.entries()) {
    const ext = extname(path).toLowerCase();
    const data = await readFile(path);

    if (HEIC_EXTENSIONS.includes(ext)) {
      pages.push({ page: i + 1, image: await decodeHeic(data, longEdge) });
      continue;
    }
    const mediaType = IMAGE_TYPES[ext];
    if (!mediaType) {
      throw new RampaError('ingest-format', `No sé leer ${ext}. ${ACCEPTED_DESCRIPTION}`);
    }
    const { width, height } = imageSize(data, mediaType);
    pages.push({ page: i + 1, image: { data: new Uint8Array(data), mediaType, width, height } });
  }
  return { source: 'photos', pages };
}

/**
 * HEIC, the default photograph format of the most common phone.
 *
 * A teacher must never see a format error for the format her phone produces by
 * default — she has no idea her phone chose it, and "convert it first" is not an
 * instruction she can act on in a 45-minute gap.
 */
async function decodeHeic(data: Buffer, longEdge: number): Promise<NonNullable<SourcePage['image']>> {
  const { default: libheif } = await import('libheif-js/wasm-bundle');
  const decoder = new libheif.HeifDecoder();
  const images = decoder.decode(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
  const image = images[0];
  if (!image) {
    throw new RampaError('ingest-format',
      'No he podido abrir esa foto. Si viene de un iPhone, prueba a compartirla como JPG.');
  }
  const width = image.get_width();
  const height = image.get_height();
  const out = { data: new Uint8ClampedArray(width * height * 4), width, height };
  await new Promise<void>((resolve) => image.display(out, () => resolve()));

  /*
   * A PNG at the corpus bound, **here** (review COD-05).
   *
   * This used to return raw RGBA with `mediaType: 'image/rgba'` and a comment
   * saying «the renderer re-encodes it to JPEG at the corpus bound». That renderer
   * did not exist: no canvas, no `toDataURL`, nothing. So an iPhone photograph —
   * the default format of the commonest phone — reached Anthropic as
   * `media_type: 'image/rgba'`, which the API rejects, and the edge case this
   * function's own docblock promises («a teacher must never see a format error for
   * the format her phone produces by default») failed for every iPhone.
   *
   * `toSendablePng` is arithmetic in `packages/core`, so the whole path is covered
   * by the offline suite and there is no window to depend on.
   */
  const bitmap: Bitmap = {
    width, height, channels: 4, data: new Uint8Array(out.data.buffer),
  };
  const png = toSendablePng(bitmap, longEdge);
  return { data: png.data, mediaType: png.mediaType, width: png.width, height: png.height };
}

/**
 * Image dimensions from the header alone.
 *
 * No decoder, because the only thing needed here is the downscale arithmetic —
 * decoding a 12-megapixel photograph to learn its width would cost a second per
 * page for information sitting in the first twenty bytes.
 */
export function imageSize(data: Buffer, mediaType: string): { width: number; height: number } {
  if (mediaType === 'image/png' && data.length > 24) {
    return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
  }
  if (mediaType === 'image/jpeg') {
    /*
     * Walk the segment markers to SOF.
     *
     * Not a fixed offset: a photograph from a phone carries EXIF and an embedded
     * thumbnail before the frame header, so reading bytes 6-9 — which works on a
     * synthetic JPEG — returns the *thumbnail's* dimensions on a real one, and
     * every page would then be downscaled from the wrong starting size.
     *
     * The bounds are checked at each read rather than once at the top. The first
     * version guarded with `i + 9 < data.length`, which is one byte too strict:
     * a JPEG whose frame header is its last segment returned zero, and the test
     * that caught it was the one built from a realistic EXIF layout.
     */
    let i = 2;
    while (i + 1 < data.length) {
      if (data[i] !== 0xff) { i += 1; continue; }
      const marker = data[i + 1]!;
      const isFrameHeader = marker >= 0xc0 && marker <= 0xcf
        && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isFrameHeader) {
        if (i + 8 >= data.length) break;   // truncated before the dimensions
        return { height: data.readUInt16BE(i + 5), width: data.readUInt16BE(i + 7) };
      }
      if (i + 3 >= data.length) break;
      const length = data.readUInt16BE(i + 2);
      if (length < 2) break;              // malformed; a zero would loop forever
      i += 2 + length;
    }
  }
  // Unknown: report zero rather than guessing. `planDownscale` returns a
  // harmless plan for it and the renderer measures the decoded bitmap instead.
  logger.warn('ingest.imageSize.unknown', { mediaType });
  return { width: 0, height: 0 };
}

/* ── PDF ─────────────────────────────────────────────────────────────────── */

/**
 * A PDF is two different inputs wearing one extension.
 *
 * With a text layer it takes the digital path — cheaper, and faithful because the
 * text is already text. Scanned, it is a stack of photographs. The routing is
 * decided here from what the file actually contains rather than from its name.
 */
async function readPdf(path: string, longEdge: number): Promise<ReadResult> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs') as unknown as {
    getDocument(src: { data: Uint8Array; useSystemFonts?: boolean }): { promise: Promise<PdfDoc> };
  };
  const data = new Uint8Array(await readFile(path));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;

  const pages: SourcePage[] = [];
  let charsFound = 0;

  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    const text = content.items
      .map((it) => ('str' in it ? it.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    charsFound += text.length;

    /*
     * T033 · figures in a digital PDF.
     *
     * The text layer carries no images, so a digital PDF's figures would
     * otherwise vanish — and a worksheet whose diagram is missing is a worksheet
     * a learner cannot answer, which is the failure this whole project exists to
     * prevent. So the *positions* are collected here and the page is rendered
     * only when there is something to crop.
     *
     * Counted rather than cropped in this layer: cropping needs a canvas, which
     * lives in the renderer. What the digital path owes the converter is "this
     * page has N figures at these boxes", and that is decodable here.
     */
    const figures = await pageFigures(page);

    pages.push({
      page: n,
      text: text || undefined,
      invisibleText: findInvisibleText(content.items),
      figures: figures.length ? figures : undefined,
      /* Kept so the scanned branch below can ask for the pixels without
         re-opening the document. Never sent: `image` is what travels. */
      handle: page,
    });
  }

  /*
   * A scanned page still yields a handful of characters from stray OCR or a
   * header, so "has a text layer" is a threshold and not a boolean. 40
   * characters per page is well below any real page of prose and well above the
   * noise a scan produces.
   */
  const perPage = doc.numPages > 0 ? charsFound / doc.numPages : 0;
  const source = perPage >= 40 ? 'pdf-digital' : 'pdf-scanned';

  /*
   * A scanned page is a photograph, so give it its pixels (review COD-04, P39).
   *
   * ## What used to happen
   *
   * Nothing. `readPdf` read the text layer and the operator lists and returned,
   * for a scanned page, a `SourcePage` with **neither `text` nor `image`**. Then
   * `needsVision` (`p.image && !p.text`) was false, so the vision-capability
   * check did not even fire, and `extractPage` sent the prompt «Página N. Lee
   * esta imagen.» with `images: undefined`. The model invented or failed, and she
   * paid for the call. Meanwhile `tasks.md` T012 was ticked as «PDF page
   * rendering via pdfjs-dist» and FR-601 claimed «PDF (scanned and digital)».
   *
   * ## Why there is no canvas here
   *
   * The decision (P39) said «render the pages with pdfjs in the renderer», and
   * the goal it was for is «nothing paid for without an image». It turns out no
   * canvas is needed at all: pdf.js ships its own decoders, so the image objects a
   * page paints arrive as **decoded pixels** — `{ width, height, kind, data }` —
   * from `page.objs`. A scanned page is one bitmap covering the sheet, so those
   * pixels *are* the page.
   *
   * Doing it here instead is strictly better and is worth saying rather than
   * assuming: no IPC round trip, no dependency on a window that may not exist, it
   * works headless, and the whole path is covered by the offline suite.
   *
   * Best-effort per page: a page whose bitmap cannot be reached keeps no image,
   * and `runIngest` refuses to spend anything on it rather than sending a prompt
   * about an image it does not have.
   */
  if (source === 'pdf-scanned') {
    for (const page of pages) {
      const handle = page.handle as PdfPage | undefined;
      delete page.handle;
      if (!handle) continue;
      const bitmap = await pageBitmap(handle);
      if (!bitmap) {
        logger.warn('ingest.pdf-no-bitmap', { page: page.page });
        continue;
      }
      const png = toSendablePng(bitmap, longEdge);
      page.image = { data: png.data, mediaType: png.mediaType, width: png.width, height: png.height };
    }
  } else {
    for (const page of pages) delete page.handle;
  }

  return { source, pages };
}

/**
 * The pixels a page paints, from pdf.js's own decoders.
 *
 * The largest painted image wins when a page has several: a scanned page is one
 * full-sheet bitmap, and a header logo beside it would otherwise be «the page».
 * Nothing is composited — compositing is what a canvas is for, and a scan has
 * nothing to composite.
 */
async function pageBitmap(page: PdfPage): Promise<Bitmap | null> {
  if (!page.getOperatorList || !(page.objs || page.commonObjs)) return null;
  let ops: PdfOperatorList;
  try { ops = await page.getOperatorList(); } catch { return null; }

  let best: Bitmap | null = null;
  for (const [i, fn] of ops.fnArray.entries()) {
    if (!PAINT_IMAGE_OPS.has(fn)) continue;
    const arg = ops.argsArray[i]?.[0];
    const name = typeof arg === 'string' ? arg : (arg as { name?: string } | undefined)?.name;
    if (!name) continue;

    /*
     * Two stores, and both are needed.
     *
     * pdf.js puts a page-local image in `objs` under `img_p0_1`, and one shared
     * between pages in `commonObjs` under a `g_`-prefixed name — which is exactly
     * what a scanner that writes the same XObject on every page produces. Asking
     * only `objs` worked for page one and hung for every page after it.
     *
     * Both are asked at once and the first answer wins, rather than sniffing the
     * name prefix: the prefix is pdf.js's internal convention and this does not
     * need to know it.
     *
     * Bounded, because `get` resolves through pdf.js's own worker and a name that
     * never arrives would hang the ingest for ever. A timeout is a page with no
     * image rather than an error — the page is still reported to her, and the run
     * refuses to pay for it.
     */
    const obj = await new Promise<PdfImageObject | null>((resolve) => {
      let settled = false;
      const finish = (o: PdfImageObject | null) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(o);
      };
      const timer = setTimeout(() => finish(null), 8_000);
      for (const store of [page.objs, page.commonObjs]) {
        try { store?.get(name, (o: unknown) => { if (o) finish(o as PdfImageObject); }); }
        catch { /* the other store may still answer */ }
      }
    });

    if (!obj?.data || !(obj.width > 0) || !(obj.height > 0)) continue;
    // pdf.js `ImageKind`: 1 grayscale 1bpp, 2 RGB 24bpp, 3 RGBA 32bpp. A 1bpp
    // bitmap is packed bits rather than bytes, so it is left alone rather than
    // read as if it were one byte per pixel — which would be noise.
    const channels = obj.kind === 3 ? 4 : obj.kind === 2 ? 3 : null;
    if (channels === null) continue;
    if (obj.data.length < obj.width * obj.height * channels) continue;

    const bitmap: Bitmap = {
      width: obj.width, height: obj.height, channels,
      data: new Uint8Array(obj.data.buffer, obj.data.byteOffset, obj.width * obj.height * channels),
    };
    if (!best || bitmap.width * bitmap.height > best.width * best.height) best = bitmap;
  }
  return best;
}

interface PdfImageObject {
  width: number;
  height: number;
  kind?: number;
  data?: Uint8Array;
}

interface PdfTextItem { str?: string; height?: number; transform?: number[]; hasEOL?: boolean }
interface PdfOperatorList { fnArray: number[]; argsArray: unknown[][] }
interface PdfPage {
  getTextContent(): Promise<{ items: PdfTextItem[] }>;
  getOperatorList?(): Promise<PdfOperatorList>;
  /**
   * pdf.js's object stores, where a decoded image arrives by callback.
   *
   * `objs` is per page; `commonObjs` holds what several pages share — which is
   * what a scanner writing one XObject onto every page produces.
   */
  objs?: PdfObjectStore;
  commonObjs?: PdfObjectStore;
}

interface PdfObjectStore { get(name: string, cb: (o: unknown) => void): void }
interface PdfDoc {
  numPages: number;
  getPage(n: number): Promise<PdfPage>;
}

/**
 * The image boxes on a page, from its operator list.
 *
 * `paintImageXObject` (85) and `paintInlineImageXObject` (86) are the two ways a
 * PDF draws a bitmap, and the transform in effect is what gives the box. This is
 * best-effort by design: a missed figure means one fewer thing to describe, while
 * a *wrong* box would send a crop of empty paper to be described — which reads as
 * a bad description rather than as a missing one, and is worse.
 */
const PAINT_IMAGE_OPS = new Set([85, 86]);

async function pageFigures(page: PdfPage): Promise<NonNullable<SourcePage['figures']>> {
  if (!page.getOperatorList) return [];
  let ops: PdfOperatorList;
  try { ops = await page.getOperatorList(); } catch { return []; }

  const boxes: NonNullable<SourcePage['figures']> = [];
  // Track the current transform crudely: a full graphics-state machine is a
  // second project, and the common case is one `cm` immediately before the paint.
  let last: number[] | null = null;
  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i]!;
    // 12 = transform (cm).
    if (fn === 12) { last = (ops.argsArray[i] ?? []) as number[]; continue; }
    if (!PAINT_IMAGE_OPS.has(fn) || !last) continue;
    const [a, , , d, e, f] = last as number[];
    const width = Math.abs(Number(a) || 0);
    const height = Math.abs(Number(d) || 0);
    // Anything this small is a rule, a bullet or a logo, not a figure a learner
    // needs described.
    if (width < 40 || height < 40) continue;
    boxes.push({ x: Number(e) || 0, y: Number(f) || 0, width, height });
  }
  return boxes;
}

/**
 * Text in the layer that a reader cannot see (FR-607, `007` FR-505).
 *
 * This is the input where that defence becomes implementable at all: with pasted
 * text there is nothing to compare against. A zero-height glyph or a run
 * positioned off the page is text she cannot find by looking, so the application
 * has to say it is there.
 */
function findInvisibleText(items: readonly PdfTextItem[]): string[] | undefined {
  const hidden: string[] = [];
  for (const it of items) {
    const str = (it.str ?? '').trim();
    if (!str) continue;
    const size = it.height ?? (it.transform?.[3] ?? 0);
    // One point or less is not readable on paper or on screen.
    if (size > 0 && size <= 1) { hidden.push(str); continue; }
    const y = it.transform?.[5];
    // Off the top or bottom of the page box.
    if (typeof y === 'number' && (y < -20 || y > 5000)) hidden.push(str);
  }
  return hidden.length ? hidden : undefined;
}

/* ── DOCX ────────────────────────────────────────────────────────────────── */

/**
 * A DOCX already encodes headings, lists and tables, so throwing that away and
 * asking a model to infer it from a rendered image would be slower, more
 * expensive and less faithful — all three at once.
 */
async function readDocx(path: string): Promise<ReadResult> {
  const mammoth = await import('mammoth') as unknown as {
    convertToHtml(input: { path: string }): Promise<{ value: string; messages: unknown[] }>;
  };
  const { value } = await mammoth.convertToHtml({ path });
  return { source: 'docx', pages: [{ page: 1, text: value }] };
}
