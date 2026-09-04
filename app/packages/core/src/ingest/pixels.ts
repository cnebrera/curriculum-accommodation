import { deflateSync } from 'node:zlib';
import { planDownscale, type Size } from './downscale.js';

/**
 * Turning pixels into something a provider will accept (008 FR-616, COD-04/05).
 *
 * ## Why this is here and not behind a canvas
 *
 * `planDownscale` was written as «arithmetic only — resizing pixels belongs where
 * a canvas exists», and the consequence was that **nothing ever called it**: the
 * canvas lives in the renderer, the sending lives in the main process, and the
 * bound sat parsed from the corpus and read by nobody while every phone
 * photograph went to the provider at full resolution. The eighth field in this
 * project written, typed and used by nothing.
 *
 * The same reasoning left the HEIC path broken end to end: `decodeHeic` returns
 * raw RGBA with `mediaType: 'image/rgba'`, trusting that «the renderer re-encodes
 * it to JPEG» — a renderer that does not exist. So an iPhone photograph, the
 * default format of the commonest phone, reached Anthropic as
 * `media_type: 'image/rgba'`, which the API rejects. The edge case the spec
 * writes down — «a teacher must never see a format error for the format her phone
 * chose» — failed for every iPhone.
 *
 * A box filter and a PNG encoder are about a hundred lines of arithmetic. Putting
 * them here makes the whole path **testable in the offline suite** and removes the
 * canvas from the design entirely: no new dependency, no round trip to a window
 * that may not exist, and it works headless.
 *
 * PNG rather than JPEG because a PNG encoder is `deflate` and a header, while a
 * JPEG encoder is a DCT and quantisation tables. Providers accept both, and a
 * page of black text on white compresses well losslessly.
 */

/** Pixels as a decoder hands them over, with their layout named. */
export interface Bitmap {
  width: number;
  height: number;
  /** Bytes per pixel: 1 grey, 3 RGB, 4 RGBA. */
  channels: 1 | 3 | 4;
  data: Uint8Array;
}

/**
 * Resize by averaging source pixels per destination pixel (a box filter).
 *
 * Averaging rather than nearest-neighbour, and the reason is the material: a page
 * of 11pt text downscaled by point sampling loses whole strokes, and the model
 * then reads a word that is not there — which is the failure this pipeline exists
 * to prevent, arriving through the optimisation meant to make it cheaper.
 *
 * Never upscales: `planDownscale` refuses to, and this trusts it.
 */
export function resample(src: Bitmap, target: Size): Bitmap {
  const { width: tw, height: th } = target;
  if (tw <= 0 || th <= 0) return { width: 0, height: 0, channels: src.channels, data: new Uint8Array(0) };
  if (tw === src.width && th === src.height) return src;

  const ch = src.channels;
  const out = new Uint8Array(tw * th * ch);
  const xRatio = src.width / tw;
  const yRatio = src.height / th;

  for (let y = 0; y < th; y++) {
    const y0 = Math.floor(y * yRatio);
    const y1 = Math.max(y0 + 1, Math.floor((y + 1) * yRatio));
    for (let x = 0; x < tw; x++) {
      const x0 = Math.floor(x * xRatio);
      const x1 = Math.max(x0 + 1, Math.floor((x + 1) * xRatio));

      for (let c = 0; c < ch; c++) {
        let sum = 0;
        let n = 0;
        for (let sy = y0; sy < y1 && sy < src.height; sy++) {
          const row = sy * src.width * ch;
          for (let sx = x0; sx < x1 && sx < src.width; sx++) {
            sum += src.data[row + sx * ch + c]!;
            n += 1;
          }
        }
        out[(y * tw + x) * ch + c] = n > 0 ? Math.round(sum / n) : 0;
      }
    }
  }
  return { width: tw, height: th, channels: ch, data: out };
}

/**
 * Drop the alpha channel onto white.
 *
 * A scanned page has no transparency to preserve, and an RGBA PNG of one is a
 * third larger for nothing. White rather than black because paper is white: an
 * unfilled alpha composited onto black turns a margin into a border the model
 * reads as a table edge.
 */
export function flattenOntoWhite(src: Bitmap): Bitmap {
  if (src.channels !== 4) return src;
  const out = new Uint8Array(src.width * src.height * 3);
  for (let i = 0, o = 0; i < src.data.length; i += 4, o += 3) {
    const a = src.data[i + 3]! / 255;
    for (let c = 0; c < 3; c++) {
      out[o + c] = Math.round(src.data[i + c]! * a + 255 * (1 - a));
    }
  }
  return { width: src.width, height: src.height, channels: 3, data: out };
}

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, body: Uint8Array): Uint8Array {
  const out = new Uint8Array(body.length + 12);
  const view = new DataView(out.buffer);
  view.setUint32(0, body.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(body, 8);
  view.setUint32(body.length + 8, crc32(out.subarray(4, body.length + 8)));
  return out;
}

/**
 * A PNG, with no filtering.
 *
 * Filter type 0 on every scanline: `deflate` on a scan of text already gets most
 * of what a Paeth predictor would, and «no filtering» is a decision a reader can
 * verify by eye against the spec rather than a heuristic to trust.
 */
export function encodePng(bmp: Bitmap): Uint8Array {
  const colourType = bmp.channels === 1 ? 0 : bmp.channels === 3 ? 2 : 6;

  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, bmp.width);
  view.setUint32(4, bmp.height);
  ihdr[8] = 8;            // bit depth
  ihdr[9] = colourType;
  // 10, 11, 12: compression 0, filter 0, interlace 0 — all zero already.

  const stride = bmp.width * bmp.channels;
  const raw = new Uint8Array((stride + 1) * bmp.height);
  for (let y = 0; y < bmp.height; y++) {
    raw[y * (stride + 1)] = 0;   // filter: none
    raw.set(bmp.data.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }

  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', new Uint8Array(deflateSync(raw))),
    chunk('IEND', new Uint8Array(0)),
  ];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}

/**
 * The whole path: pixels in, a PNG at the corpus bound out.
 *
 * One function so the three callers — a scanned PDF page, an iPhone photograph,
 * and whatever comes next — cannot each decide half of it. `planDownscale` is
 * called **here**, which is the fix: it was policy nobody applied.
 */
export function toSendablePng(src: Bitmap, longEdge: number): {
  data: Uint8Array; mediaType: 'image/png'; width: number; height: number; downscaled: boolean;
} {
  const flat = flattenOntoWhite(src);
  const plan = planDownscale({ width: flat.width, height: flat.height }, longEdge);
  const sized = plan.needed ? resample(flat, plan.target) : flat;
  return {
    data: encodePng(sized),
    mediaType: 'image/png',
    width: sized.width,
    height: sized.height,
    downscaled: plan.needed,
  };
}
