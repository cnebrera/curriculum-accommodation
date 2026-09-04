import { describe, it, expect } from 'vitest';
import { inflateSync } from 'node:zlib';
import {
  resample, flattenOntoWhite, encodePng, toSendablePng, planDownscale, type Bitmap,
} from '../src/index.js';

/**
 * Pixels, at the bound the corpus set (008 FR-616, review COD-04/COD-05).
 *
 * ## What was broken, and why it stayed broken
 *
 * `planDownscale` was written as «arithmetic only — resizing pixels belongs where
 * a canvas exists». The canvas is in the renderer and the sending is in the main
 * process, so **nothing ever called it**: `image_long_edge: 1600` was parsed out
 * of `instructions/ingest.md`, typed onto `IngestBudget`, imported by
 * `jobs/ingest.ts`, and never invoked. Every phone photograph went at full
 * resolution.
 *
 * The same split left HEIC broken end to end: `decodeHeic` returns raw RGBA with
 * `mediaType: 'image/rgba'` trusting a renderer that re-encodes it, and no such
 * renderer exists — so an iPhone photograph reached Anthropic as
 * `media_type: 'image/rgba'`, which the API rejects. «A teacher must never see a
 * format error for the format her phone chose» failed for every iPhone.
 *
 * A box filter and a PNG encoder are arithmetic. Here, the whole path is testable
 * with no canvas, no window and no dependency.
 */

/** A bitmap whose every pixel is computable, so a resample can be checked. */
const ramp = (w: number, h: number, channels: 1 | 3 | 4): Bitmap => {
  const data = new Uint8Array(w * h * channels);
  for (let i = 0; i < w * h; i++) {
    for (let c = 0; c < channels; c++) data[i * channels + c] = (i * 7 + c) % 256;
  }
  return { width: w, height: h, channels, data };
};

describe('resampling', () => {
  it('averages the source pixels instead of picking one', () => {
    /*
     * The whole reason it is a box filter. A page of 11pt text point-sampled down
     * loses whole strokes, and the model then reads a word that is not there —
     * this pipeline's central failure, arriving through the optimisation meant to
     * make it cheaper.
     */
    const src: Bitmap = {
      width: 2, height: 2, channels: 1,
      data: new Uint8Array([0, 100, 200, 255]),
    };
    const out = resample(src, { width: 1, height: 1 });
    expect(out.data[0]).toBe(Math.round((0 + 100 + 200 + 255) / 4));
  });

  it('keeps every channel independent', () => {
    const src = ramp(4, 4, 3);
    const out = resample(src, { width: 2, height: 2 });
    expect(out.channels).toBe(3);
    expect(out.data).toHaveLength(2 * 2 * 3);
  });

  it('returns the same bitmap when nothing needs doing', () => {
    const src = ramp(3, 3, 4);
    expect(resample(src, { width: 3, height: 3 })).toBe(src);
  });

  it('never produces a zero-height strip from a wide one', () => {
    // 4000×1 must not become 1600×0, which is an empty send that looks like work.
    const plan = planDownscale({ width: 4000, height: 1 }, 1600);
    const out = resample(ramp(4000, 1, 3), plan.target);
    expect(out.height).toBeGreaterThanOrEqual(1);
    expect(out.width).toBe(1600);
  });
});

describe('flattening the alpha channel', () => {
  it('composites onto white, because paper is white', () => {
    /*
     * Onto black, a transparent margin becomes a border the model reads as a
     * table edge — a structure in the extraction that is not on the page.
     */
    const src: Bitmap = {
      width: 2, height: 1, channels: 4,
      data: new Uint8Array([0, 0, 0, 0, 0, 0, 0, 255]),
    };
    const out = flattenOntoWhite(src);
    expect(out.channels).toBe(3);
    expect(Array.from(out.data.slice(0, 3))).toEqual([255, 255, 255]);
    expect(Array.from(out.data.slice(3, 6))).toEqual([0, 0, 0]);
  });

  it('leaves a bitmap with no alpha alone', () => {
    const src = ramp(2, 2, 3);
    expect(flattenOntoWhite(src)).toBe(src);
  });
});

describe('the PNG it produces', () => {
  /** Reading it back rather than trusting the writer. */
  const parse = (png: Uint8Array) => {
    expect(Array.from(png.slice(0, 8)))
      .toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
    const chunks: Array<{ type: string; body: Uint8Array }> = [];
    let at = 8;
    while (at < png.length) {
      const len = view.getUint32(at);
      const type = String.fromCharCode(...png.slice(at + 4, at + 8));
      chunks.push({ type, body: png.slice(at + 8, at + 8 + len) });
      at += len + 12;
    }
    return chunks;
  };

  it('is a real PNG: signature, IHDR, IDAT, IEND, in that order', () => {
    const chunks = parse(encodePng(ramp(4, 3, 3)));
    expect(chunks.map((c) => c.type)).toEqual(['IHDR', 'IDAT', 'IEND']);
  });

  it('declares the size and the colour type it actually wrote', () => {
    for (const [channels, colourType] of [[1, 0], [3, 2], [4, 6]] as const) {
      const chunks = parse(encodePng(ramp(5, 7, channels)));
      const ihdr = new DataView(chunks[0]!.body.buffer, chunks[0]!.body.byteOffset);
      expect(ihdr.getUint32(0)).toBe(5);
      expect(ihdr.getUint32(4)).toBe(7);
      expect(chunks[0]!.body[8]).toBe(8);              // bit depth
      expect(chunks[0]!.body[9]).toBe(colourType);
    }
  });

  it('round-trips the pixels exactly, which is what lossless means', () => {
    /*
     * The assertion that makes the encoder worth trusting: inflate the IDAT,
     * strip the per-scanline filter byte, and compare with what went in. A
     * plausible-looking PNG whose pixels are wrong is exactly this project's
     * signature failure in a new place.
     */
    const src = ramp(6, 4, 3);
    const chunks = parse(encodePng(src));
    const raw = new Uint8Array(inflateSync(chunks[1]!.body));
    const stride = src.width * src.channels;
    for (let y = 0; y < src.height; y++) {
      expect(raw[y * (stride + 1)], 'filter byte').toBe(0);
      expect(Array.from(raw.slice(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride)))
        .toEqual(Array.from(src.data.slice(y * stride, (y + 1) * stride)));
    }
  });

  it('has a correct CRC on every chunk', () => {
    // A decoder that checks CRCs — every real one does — rejects the whole file
    // on one bad byte, and the symptom would be «the provider rejected it».
    const png = encodePng(ramp(3, 3, 4));
    const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
    let at = 8;
    while (at < png.length) {
      const len = view.getUint32(at);
      const declared = view.getUint32(at + 8 + len);
      // Recompute over type + body, the way the spec defines it.
      const region = png.slice(at + 4, at + 8 + len);
      let c = 0xffffffff;
      for (const b of region) {
        c ^= b;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        c = c >>> 0;
      }
      expect((c ^ 0xffffffff) >>> 0).toBe(declared);
      at += len + 12;
    }
  });
});

describe('the whole path, which is the part that was missing', () => {
  it('applies the corpus bound instead of parsing it and forgetting it', () => {
    const out = toSendablePng(ramp(3200, 2400, 3), 1600);
    expect(out.downscaled).toBe(true);
    expect(Math.max(out.width, out.height)).toBe(1600);
    expect(out.mediaType).toBe('image/png');
  });

  it('leaves a small page alone rather than enlarging it', () => {
    // Upscaling invents detail that is not on the paper, and costs more to send.
    const out = toSendablePng(ramp(800, 600, 3), 1600);
    expect(out.downscaled).toBe(false);
    expect(out).toMatchObject({ width: 800, height: 600 });
  });

  it('gives an iPhone photograph a media type a provider will accept', () => {
    /*
     * COD-05's second half. The HEIC path returned `image/rgba`, which no API
     * accepts, so the commonest phone's default format failed at the provider —
     * after she had waited for the decode.
     */
    const out = toSendablePng(ramp(4032, 3024, 4), 1600);
    expect(out.mediaType).toBe('image/png');
    expect(out.data.slice(1, 4)).toEqual(new Uint8Array([0x50, 0x4e, 0x47]));
    expect(Math.max(out.width, out.height)).toBe(1600);
  });
});
