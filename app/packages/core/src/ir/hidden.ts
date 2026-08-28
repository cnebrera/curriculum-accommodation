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
