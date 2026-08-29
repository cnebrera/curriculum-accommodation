/**
 * How large an image should be before it is sent (008 T007, FR-616, research R4).
 *
 * Arithmetic only — no canvas, no decoder, no image. That separation is what
 * makes the rule testable in the offline suite: the bound is a policy question
 * (what does a provider charge, what can a model read) and resizing pixels is a
 * mechanical one that belongs where a canvas exists.
 *
 * A modern phone photograph is 12 megapixels, and a provider prices an image by
 * tile count, so a full-resolution page can cost several times a legible one for
 * the same extraction.
 */
export interface Size { width: number; height: number }

export interface Downscale {
  target: Size;
  /** 1 when nothing needs doing, so a caller can skip the work entirely. */
  scale: number;
  /** Whether the image needs re-encoding at all. */
  needed: boolean;
}

export function planDownscale(source: Size, longEdge: number): Downscale {
  const { width, height } = source;

  // A zero or negative dimension is a broken decode, not an image. Returning a
  // plan for it would produce a canvas of size 0 and an empty send.
  if (!(width > 0 && height > 0)) {
    return { target: { width: 0, height: 0 }, scale: 1, needed: false };
  }

  const longest = Math.max(width, height);
  // Never upscale. Enlarging a small photograph invents detail that is not there,
  // which is the one thing this pipeline must never do — and it costs more.
  if (longest <= longEdge) return { target: { width, height }, scale: 1, needed: false };

  const scale = longEdge / longest;
  return {
    target: {
      // At least 1px: a 4000×1 strip must not become 1600×0.
      width: Math.max(1, Math.round(width * scale)),
      height: Math.max(1, Math.round(height * scale)),
    },
    scale,
    needed: true,
  };
}

/**
 * Whether a page image is worth sending at all.
 *
 * Below roughly 700px on the long edge, 11pt print stops being legible and the
 * extraction will guess or flag everything — either of which costs a call for
 * nothing. Telling her to retake the photograph is cheaper and more honest.
 */
export const TOO_SMALL_LONG_EDGE = 700;

export const tooSmallToRead = (source: Size): boolean =>
  Math.max(source.width, source.height) < TOO_SMALL_LONG_EDGE;
