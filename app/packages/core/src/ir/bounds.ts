import type { IRDocument, Notice } from './types.js';
import { RampaError } from '../errors.js';

/**
 * Bounded input per job (007 FR-513). Very long injected text can be used to
 * push the real instructions out of context, so the boundary is reported rather
 * than silently truncating — silent truncation would hide exactly that attempt.
 */
export const DEFAULT_MAX_CHARS = 400_000;

export function checkBounds(doc: IRDocument, maxChars = DEFAULT_MAX_CHARS): Notice[] {
  const total = doc.blocks.reduce((n, b) => n + b.content.length, 0);
  if (total <= maxChars) return [];
  const notice: Notice = {
    kind: 'input-bound',
    quote: `${total.toLocaleString('es-ES')} caracteres`,
    message:
      `Este material es más largo de lo que puedo procesar de una vez ` +
      `(${total.toLocaleString('es-ES')} de ${maxChars.toLocaleString('es-ES')} caracteres). ` +
      `No lo he cortado por mi cuenta: divídelo en partes y lo hacemos por trozos.`,
  };
  doc.notices.push(notice);
  return [notice];
}

export function assertWithinBounds(doc: IRDocument, maxChars = DEFAULT_MAX_CHARS): void {
  const notices = checkBounds(doc, maxChars);
  if (notices.length) throw new RampaError('input-too-large', notices[0]!.message, notices);
}
