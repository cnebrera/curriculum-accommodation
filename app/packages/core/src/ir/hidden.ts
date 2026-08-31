import type { IRDocument, Notice } from './types.js';

/**
 * Text present in the source but not visible on the page (007 FR-505).
 *
 * White-on-white, one-point type and off-page positioning survive a PDF and not
 * a photograph. The teacher cannot find this text by looking at the sheet, so
 * the system has to say it is there.
 */
export interface HiddenSpan { text: string; why: string; }

export function detectHidden(spans: HiddenSpan[]): Notice[] {
  return spans.map((s) => ({
    kind: 'hidden-text' as const,
    quote: s.text.length > 160 ? s.text.slice(0, 159) + '…' : s.text,
    message:
      `Este material lleva texto que no se ve al mirar la hoja (${s.why}). ` +
      `Te lo enseño porque no podrías encontrarlo tú.`,
  }));
}

export function annotateHidden(doc: IRDocument, spans: HiddenSpan[]): IRDocument {
  if (spans.length) doc.notices.push(...detectHidden(spans));
  return doc;
}

/**
 * Characters that are in the text and not on the page (002 T018).
 *
 * `detectHidden` above needs spans from the extraction layer — font size, colour,
 * position — which only exist for a file we read. An anchor she **types or pastes**
 * has no such spans, and the analogue there is text that is invisible by encoding
 * rather than by styling: zero-width joiners, bidi overrides, soft hyphens, tag
 * characters.
 *
 * They matter because the anchor is the one thing composition treats as true. A
 * paste from a web page can carry an instruction written in zero-width characters
 * — she cannot see it, and the model reads it exactly as it reads the rest
 * (Principle IX). Content is never instruction, but she cannot judge whether
 * something belongs on the page if she cannot see that it is there.
 *
 * Reported, never stripped. Removing them silently would change her text and hide
 * the event; and one of them may be legitimate — a soft hyphen in a long German
 * compound is typesetting, not an attack.
 */
const INVISIBLE: Array<[RegExp, string]> = [
  [/[\u200B-\u200D\u2060\uFEFF]/, 'caracteres de ancho cero'],
  [/[\u202A-\u202E\u2066-\u2069]/, 'marcas que cambian el orden del texto'],
  [/\u00AD/, 'guiones invisibles'],
  // Tag characters (U+E0000..U+E007F): an entire sentence can be written in them.
  [/[\u{E0000}-\u{E007F}]/u, 'caracteres de etiqueta invisibles'],
];

export function detectInvisible(text: string): HiddenSpan[] {
  const found: HiddenSpan[] = [];
  for (const [re, why] of INVISIBLE) {
    const m = new RegExp(re.source, re.flags.includes('u') ? 'u' : '').exec(text);
    if (!m) continue;
    /*
     * Quote the **visible** neighbourhood, not the match: quoting an invisible
     * character shows her an empty pair of quotes, which reads as a bug in Rampa
     * rather than as something in her text.
     */
    const from = Math.max(0, m.index - 40);
    const context = text.slice(from, Math.min(text.length, m.index + 40))
      .replace(new RegExp(re.source, re.flags.includes('u') ? 'gu' : 'g'), '\u2022');
    found.push({ text: context.trim() || '(sin texto alrededor)', why });
  }
  return found;
}
