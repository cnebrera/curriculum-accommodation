import { luminance, contrastRatio } from '../contrast.js';
export { contrastRatio };

/**
 * A worksheet reaches a class through a black-and-white photocopier
 * (006 FR-427). Colour-coded structure collapses into identical greys, and a
 * "high contrast" version can come out worse than the plain one.
 */
export interface PhotocopyIssue { what: string; message: string; }

const HEX = /#([0-9a-f]{3}|[0-9a-f]{6})\b/gi;

/* The luminance and ratio arithmetic is shared with ../contrast.ts — it was
   duplicated here until 010's token test collided with it at the export, which
   is this repository's recurring defect in its smallest possible form: two
   implementations of one truth, neither knowing about the other. */

/** Distinct hues that desaturate to near-identical greys are indistinguishable on a copy. */
export function checkPhotocopy(html: string): PhotocopyIssue[] {
  const issues: PhotocopyIssue[] = [];
  const colours = [...new Set(html.match(HEX) ?? [])];

  const ink = /--ink:\s*(#[0-9a-f]{3,6})/i.exec(html)?.[1] ?? '#111';
  const paper = /--paper:\s*(#[0-9a-f]{3,6})/i.exec(html)?.[1] ?? '#fff';
  const ratio = contrastRatio(ink, paper);
  if (ratio < 4.5) {
    issues.push({ what: 'contrast',
      message: `El contraste del texto es ${ratio.toFixed(1)}:1, por debajo de 4,5:1. En fotocopia se pierde.` });
  }

  for (let i = 0; i < colours.length; i++) {
    for (let j = i + 1; j < colours.length; j++) {
      const a = colours[i]!, b = colours[j]!;
      if (a.toLowerCase() === b.toLowerCase()) continue;
      // A photocopier is cruder than a monitor: luminances this close reproduce
      // as the same grey even though the screen shows two clearly different hues.
      if (Math.abs(luminance(a) - luminance(b)) < 0.08) {
        issues.push({ what: 'colour-collapse',
          message: `Los colores ${a} y ${b} se convierten en el mismo gris al fotocopiar. Si distinguen algo, no se distinguirá.` });
      }
    }
  }
  return issues;
}
