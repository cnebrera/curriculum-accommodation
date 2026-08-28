/**
 * Contrast, as arithmetic (spec 010 FR-810, T006).
 *
 * This project has stated a WCAG 2.2 AA target for its own interface since the
 * target was first written down, and tested it never. G7 stayed open because a
 * stated target with no check is a promise, and this project's whole record says
 * promises drift while tests do not.
 *
 * So the ratios are computed here and asserted in the offline suite. The point
 * is not that they pass today — I measured them by hand when the palette was
 * designed. The point is that a hex value edited in six months **cannot quietly
 * drop below the floor**.
 *
 * Deterministic, offline, no browser: this is luminance maths over declared
 * pairs, which is why it lives in `core` and not in the UI.
 *
 * What this does NOT catch, and why `axe` runs too: a missing label, a heading
 * level skipped, an error not tied to its field, a focus order that makes no
 * sense. Those are structural and only exist once rendered.
 */

/** sRGB relative luminance, per WCAG 2.x. */
export function luminance(hex: string): number {
  const h = normaliseHex(hex);
  const channels = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const linear = channels.map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
}

/** WCAG contrast ratio between two colours, 1..21. Order does not matter. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

function normaliseHex(hex: string): string {
  const h = hex.trim().replace(/^#/, '').toLowerCase();
  if (/^[0-9a-f]{3}$/.test(h)) return h.split('').map((c) => c + c).join('');
  if (/^[0-9a-f]{6}$/.test(h)) return h;
  throw new Error(`Not a hex colour: ${hex}`);
}

/** WCAG AA floors. Large text is 18.66px bold or 24px, which this system's
 *  scale only reaches at the two largest steps — so 4.5 is the working floor. */
export const AA_TEXT = 4.5;
export const AA_NON_TEXT = 3.0;

export interface Pairing {
  /** Token name, for the failure message. */
  fg: string;
  bg: string;
  min: number;
  /** Why this pair exists. Read it when the assertion fails. */
  why: string;
}

export interface PairingResult extends Pairing {
  ratio: number;
  passes: boolean;
}

export function checkPairings(
  pairings: readonly Pairing[],
  palette: Readonly<Record<string, string>>,
): PairingResult[] {
  return pairings.map((p) => {
    const fg = palette[p.fg];
    const bg = palette[p.bg];
    if (!fg || !bg) {
      throw new Error(
        `Pairing "${p.fg} on ${p.bg}" (${p.why}) references a token the palette does not define. ` +
        `A pairing without its colours is a check that silently passes.`,
      );
    }
    const ratio = contrastRatio(fg, bg);
    return { ...p, ratio, passes: ratio >= p.min };
  });
}

/** For the failure message: name the pair and its measured ratio.
 *  "Contrast failed" is not actionable; this is. */
export const describeFailure = (r: PairingResult): string =>
  `${r.fg} on ${r.bg} — ${r.ratio.toFixed(2)}:1, needs ${r.min}:1 (${r.why})`;
